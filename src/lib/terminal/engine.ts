/**
 * The rules behind the terminal: context accounting, prompt caching, the
 * permission gate, sub-agents and slash commands. Deliberately free of DOM
 * access, so every chapter's instance behaves identically and the logic can be
 * reasoned about without a browser.
 *
 * Text arrives here already resolved to one language — `Terminal.astro` collapses
 * the `{de, en}` pairs at build time. The browser therefore never ships a
 * translation it does not need, and this module never has to know about locales.
 *
 * The renderer drives it in two moves: `plan(input)` turns one line of input into
 * a list of steps, then `applyStep(step)` books that step's tokens. That split is
 * what lets a denied tool call drop the remaining steps *before* they cost
 * anything.
 */
import { MCP_SERVERS, SESSION, BLOCK_ORDER, type BlockKind } from './world';

export type Tone = 'ok' | 'warn' | 'bad';

/** How a tool call may be treated when the permission rules are consulted. */
export type Mode = 'allow' | 'ask' | 'deny';

export type Rule = {
  id: string;
  label: string;
  /** Tool names this rule covers, e.g. ["Read", "Grep"] or ["Bash:./gradlew"]. */
  tools: string[];
  mode: Mode;
  on: boolean;
};

export type Step =
  | { type: 'assistant'; text: string }
  | { type: 'note'; text: string }
  | { type: 'out'; lines: string[]; tone?: Tone }
  | {
      type: 'tool';
      name: string;
      arg?: string;
      /** Which context bucket the result lands in. Defaults to `history`. */
      kind?: BlockKind;
      tokens?: number;
      out?: string[];
      /** Ask before running, unless a rule says otherwise. */
      ask?: boolean;
      /** Shown in the approval prompt. */
      detail?: string;
      /**
       * Marks output that came from outside — a ticket, a web page, a PR body.
       * Rendered as foreign text, because the model cannot tell it apart from
       * instructions and neither should the reader.
       */
      foreign?: boolean;
      /** Instructions hidden inside that foreign text. */
      injected?: string;
    }
  | {
      type: 'subagent';
      name: string;
      task: string;
      /** Tokens the sub-agent burns in its own window. */
      tokens: number;
      /** What comes back into the main thread — usually a fraction of the above. */
      summary: number;
      summaryText: string;
      steps: Step[];
    }
  | {
      /** One model response, split into its prefill and decode halves. */
      type: 'generate';
      promptTokens: number;
      outputTokens: number;
      text?: string;
    }
  | { type: 'invalidate'; at: BlockKind; why: string }
  | { type: 'chips'; text: string; label?: string; pieces?: { text: string; id: number }[] }
  | {
      /**
       * The German-vs-English token surcharge, measured at build time with two
       * tokenizer generations rather than asserted. `result` is filled in by
       * Terminal.astro; the texts stay here so the claim is auditable.
       */
      type: 'compare';
      textDe: string;
      textEn: string;
      result?: { deModern: number; enModern: number; deLegacy: number; enLegacy: number };
    }
  | { type: 'meter' }
  | { type: 'cache' }
  | { type: 'clear' }
  | { type: 'compact' }
  | { type: 'mcp'; id: string; on: boolean }
  | { type: 'rule'; id: string; on: boolean };

export type Intent = {
  id: string;
  /** Lower-case substrings; any hit selects this intent. */
  match: string[];
  /**
   * Makes the intent reachable as a project slash command too, without the
   * leading slash — that is how a workflow actually ships in a repo.
   */
  command?: string;
  /** MCP servers that must be enabled — otherwise the engine explains why not. */
  requires?: string[];
  steps: Step[];
};

export type Scenario = {
  id: string;
  label: string;
  hint: string;
  /** Input lines replayed as if typed. */
  commands: string[];
  mcp?: Record<string, boolean>;
  rules?: Record<string, boolean>;
  reset?: boolean;
};

/** Everything one instance needs, already in one language. */
export type Script = {
  intents: Intent[];
  scenarios: Scenario[];
  fallback: Step[];
  rules?: Rule[];
  strings: Record<string, string>;
  blocks: Record<BlockKind, string>;
  help: string[];
};

export type SessionConfig = {
  script: Script;
  mcp?: Record<string, boolean>;
  countTokens?: (text: string) => number;
};

export type Breakdown = { kind: BlockKind; label: string; tokens: number; share: number };

/** Good enough before the 1 MB BPE table has loaded — and never claimed to be more. */
const estimateTokens = (text: string) => Math.max(1, Math.round([...text].length / 3.6));

export function createSession(config: SessionConfig) {
  const { script } = config;
  let count = config.countTokens ?? estimateTokens;

  const mcpOn = new Map<string, boolean>(
    MCP_SERVERS.map((s) => [s.id, config.mcp?.[s.id] ?? s.on]),
  );
  const rules = (script.rules ?? []).map((r) => ({ ...r }));

  const state = {
    files: 0,
    history: 0,
    output: 0,
    turns: 0,
    toolCalls: 0,
    /** Tokens the previous request already sent — the ceiling for a cache hit. */
    seen: 0,
    /**
     * Earliest block that changed since the last request. Everything before it
     * is still cache-warm; everything from it on has to be recomputed. Null
     * means only the tail grew, which a prefix cache does not mind.
     */
    dirtyAt: null as BlockKind | null,
    lastCached: 0,
    lastFresh: 0,
    read: new Set<string>(),
    /** Foreign instructions the agent has picked up but not yet acted on. */
    carrying: [] as string[],
  };

  const mcpTokens = () =>
    MCP_SERVERS.reduce((sum, s) => sum + (mcpOn.get(s.id) ? s.tokens : 0), 0);

  function tokensOf(kind: BlockKind): number {
    switch (kind) {
      case 'system':
        return SESSION.systemTokens + SESSION.claudeMdTokens;
      case 'tools':
        return SESSION.builtinToolTokens;
      case 'mcp':
        return mcpTokens();
      case 'files':
        return state.files;
      case 'history':
        return state.history;
      case 'output':
        return state.output;
    }
  }

  const used = () => BLOCK_ORDER.reduce((sum, k) => sum + tokensOf(k), 0);

  function breakdown(): Breakdown[] {
    const total = used();
    return BLOCK_ORDER.map((kind) => ({
      kind,
      label: script.blocks[kind],
      tokens: tokensOf(kind),
      share: total ? tokensOf(kind) / total : 0,
    }));
  }

  /** Marks the earliest changed block, so the cache split stays honest. */
  function markDirty(kind: BlockKind) {
    if (state.dirtyAt === null || BLOCK_ORDER.indexOf(kind) < BLOCK_ORDER.indexOf(state.dirtyAt)) {
      state.dirtyAt = kind;
    }
  }

  /**
   * Splits the request into what the cache can serve and what has to be
   * recomputed. A prefix cache is only useful up to the first change — that
   * asymmetry is the whole lesson of the caching chapter.
   */
  function settleTurn(): { cached: number; fresh: number; total: number } {
    const total = used();
    let cached = 0;
    if (state.seen > 0) {
      const stop = state.dirtyAt ? BLOCK_ORDER.indexOf(state.dirtyAt) : BLOCK_ORDER.length;
      for (let i = 0; i < stop; i++) cached += tokensOf(BLOCK_ORDER[i]);
      cached = Math.min(cached, state.seen);
    }
    const fresh = total - cached;
    state.lastCached = cached;
    state.lastFresh = fresh;
    state.seen = total;
    state.dirtyAt = null;
    return { cached, fresh, total };
  }

  /* ── Permission rules ─────────────────────────────────────────────────── */

  /**
   * Rules are matched by tool name, optionally narrowed by a command prefix
   * (`Bash:./gradlew`). The most specific enabled rule wins; with no rule the
   * step's own `ask` flag decides, which is how the chapters without a rule
   * panel behave.
   */
  function decide(step: Extract<Step, { type: 'tool' }>): Mode {
    let best: { rule: Rule; weight: number } | null = null;
    for (const rule of rules) {
      if (!rule.on) continue;
      for (const pattern of rule.tools) {
        const [tool, prefix] = pattern.split(':');
        if (tool !== step.name) continue;
        if (prefix && !(step.arg ?? '').startsWith(prefix)) continue;
        const weight = prefix ? 2 : 1;
        if (!best || weight > best.weight) best = { rule, weight };
      }
    }
    if (best) return best.rule.mode;
    return step.ask ? 'ask' : 'allow';
  }

  /* ── Planning ─────────────────────────────────────────────────────────── */

  const s = (key: string) => script.strings[key] ?? key;

  function slashSteps(input: string): Step[] {
    const [cmd, ...args] = input.slice(1).trim().split(/\s+/);
    switch (cmd) {
      case 'help':
        return [{ type: 'out', lines: script.help }];

      case 'context':
        return [{ type: 'meter' }];

      case 'cache':
        return [{ type: 'cache' }];

      case 'clear':
        return [{ type: 'clear' }, { type: 'note', text: s('cleared') }];

      case 'compact':
        // The renderer calls `compact()` itself: the note it prints needs the
        // before/after numbers, which only exist once the step actually runs.
        return [{ type: 'compact' }, { type: 'meter' }];

      case 'model':
        return [{ type: 'out', lines: [s('modelLine')] }];

      case 'tokens': {
        const text = input.slice(input.indexOf('tokens') + 6).trim();
        if (!text) return [{ type: 'out', lines: [s('tokensUsage')], tone: 'warn' }];
        return [{ type: 'chips', text }];
      }

      case 'mcp': {
        const [verb, id] = args;
        if (!verb) {
          return [
            {
              type: 'out',
              lines: MCP_SERVERS.map(
                (server) =>
                  `${mcpOn.get(server.id) ? '●' : '○'} ${server.name.padEnd(12)} ${String(server.tools).padStart(2)} tools · ${server.tokens.toLocaleString('en-US')} tokens`,
              ),
            },
            { type: 'note', text: s('mcpUsage') },
          ];
        }
        const target = MCP_SERVERS.find((server) => server.id === id);
        if (!target || (verb !== 'on' && verb !== 'off')) {
          return [{ type: 'out', lines: [s('mcpUsage')], tone: 'warn' }];
        }
        return [{ type: 'mcp', id: target.id, on: verb === 'on' }];
      }

      case 'permissions': {
        if (!rules.length) return [{ type: 'out', lines: [s('noRules')], tone: 'warn' }];
        return [
          {
            type: 'out',
            lines: rules.map((r) => `${r.on ? '●' : '○'} ${r.mode.padEnd(5)} ${r.tools.join(', ')}`),
          },
        ];
      }

      default: {
        // Project commands — a skill in .claude/commands — are indistinguishable
        // from built-ins at the prompt, so they resolve here.
        const project = script.intents.find((i) => i.command === cmd);
        if (project) return project.steps;
        return [{ type: 'out', lines: [s('unknownCommand')], tone: 'warn' }];
      }
    }
  }

  function plan(input: string): Step[] {
    const trimmed = input.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('/')) return slashSteps(trimmed);

    const needle = trimmed.toLowerCase();
    const intent = script.intents.find((i) => i.match.some((m) => needle.includes(m)));
    if (!intent) return script.fallback;

    const missing = (intent.requires ?? []).filter((id) => !mcpOn.get(id));
    if (missing.length) {
      const names = missing
        .map((id) => MCP_SERVERS.find((server) => server.id === id)?.name ?? id)
        .join(', ');
      return [{ type: 'note', text: s('requiresMissing').replace('{servers}', names) }];
    }
    return intent.steps;
  }

  /* ── Applying ─────────────────────────────────────────────────────────── */

  /** Books the user's own prompt. Called once per submitted line. */
  function bookInput(text: string) {
    state.history += count(text);
    state.turns += 1;
  }

  function applyStep(step: Step) {
    switch (step.type) {
      case 'assistant':
        state.output += count(step.text);
        break;

      case 'generate':
        state.output += step.outputTokens;
        break;

      case 'tool': {
        state.toolCalls += 1;
        const tokens = step.tokens ?? 0;
        // Reading the same file twice does not pay twice — it is already there.
        if (step.kind === 'files' && step.arg) {
          if (!state.read.has(step.arg)) {
            state.read.add(step.arg);
            state.files += tokens;
            markDirty('files');
          }
        } else {
          state.history += tokens;
        }
        if (step.injected) state.carrying.push(step.injected);
        break;
      }

      case 'subagent':
        // Only the summary crosses back. The sub-agent's own tokens were spent,
        // but they never touch the main thread's window — that is the point.
        state.history += step.summary;
        break;

      case 'invalidate':
        markDirty(step.at);
        break;

      case 'mcp':
        mcpOn.set(step.id, step.on);
        markDirty('mcp');
        break;

      case 'rule': {
        const rule = rules.find((r) => r.id === step.id);
        if (rule) rule.on = step.on;
        markDirty('system');
        break;
      }

      case 'clear':
        state.files = 0;
        state.history = 0;
        state.output = 0;
        state.turns = 0;
        state.seen = 0;
        state.lastCached = 0;
        state.lastFresh = 0;
        state.dirtyAt = null;
        state.read.clear();
        state.carrying.length = 0;
        break;

      // Rendered only, or handled by the renderer itself.
      case 'note':
      case 'out':
      case 'meter':
      case 'cache':
      case 'chips':
      case 'compact':
        break;
    }
  }

  /**
   * Compaction summarises the conversation. What it cannot touch is everything
   * the harness re-sends on every request: system prompt, CLAUDE.md, tool and
   * MCP definitions. That asymmetry is the whole point of showing it.
   */
  function compact(): { before: number; after: number; kept: number } {
    const before = used();
    const summarisable = state.files + state.history + state.output;
    const kept = Math.round(summarisable * 0.18);
    state.files = 0;
    state.read.clear();
    state.history = kept;
    state.output = 0;
    markDirty('files');
    return { before, after: used(), kept };
  }

  return {
    state,
    rules,
    mcpOn,
    mcpTokens,
    windowSize: SESSION.windowSize,
    strings: script.strings,
    used,
    breakdown,
    plan,
    applyStep,
    bookInput,
    settleTurn,
    compact,
    decide,
    setCounter(fn: (text: string) => number) {
      count = fn;
    },
    toggleMcp(id: string, on: boolean) {
      mcpOn.set(id, on);
      markDirty('mcp');
    },
    toggleRule(id: string, on: boolean) {
      const rule = rules.find((r) => r.id === id);
      if (rule) rule.on = on;
    },
    isOverflowing: () => used() > SESSION.windowSize,
    reset() {
      applyStep({ type: 'clear' });
      state.toolCalls = 0;
      for (const server of MCP_SERVERS) {
        mcpOn.set(server.id, config.mcp?.[server.id] ?? server.on);
      }
      for (const rule of rules) {
        rule.on = (script.rules ?? []).find((r) => r.id === rule.id)?.on ?? rule.on;
      }
    },
  };
}

export type Session = ReturnType<typeof createSession>;
