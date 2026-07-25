/**
 * The rules behind the terminal playground: context accounting, slash commands
 * and intent matching. Deliberately free of DOM access so the full page and the
 * inline chapter instances cannot behave differently, and so the logic can be
 * reasoned about without a browser.
 *
 * The renderer drives it in two moves: `plan(input)` turns one line of input
 * into a list of steps, then `applyStep(step)` books that step's tokens. That
 * split is what lets a denied permission prompt drop the remaining steps
 * *before* they cost anything.
 */
import { MCP_SERVERS, SESSION, type BlockKind } from './world';

export type Loc = { de: string; en: string };
export type Text = string | Loc;
export type Locale = 'de' | 'en';

export function resolve(text: Text | undefined, locale: Locale): string {
  if (text === undefined) return '';
  return typeof text === 'string' ? text : (text[locale] ?? text.de);
}

/* ── Transcript shape ───────────────────────────────────────────────────── */

export type Step =
  | { type: 'assistant'; text: Text }
  | { type: 'note'; text: Text }
  | { type: 'out'; lines: Text[]; tone?: 'ok' | 'warn' | 'bad' }
  | { type: 'tool'; name: string; arg?: string; kind?: BlockKind; tokens?: number; out?: Text[] }
  | { type: 'permission'; name: string; arg?: string; detail?: Text }
  | { type: 'meter' }
  | { type: 'clear' }
  | { type: 'compact' }
  | { type: 'mcp'; id: string; on: boolean };

export type Intent = {
  id: string;
  /** Lower-case substrings; any hit selects this intent. */
  match: string[];
  /** MCP servers that must be enabled — otherwise the engine explains why not. */
  requires?: string[];
  steps: Step[];
};

export type Scenario = {
  id: string;
  label: Loc;
  hint: Loc;
  /** Input lines replayed as if typed. Slash commands stay language-neutral. */
  commands: Text[];
  /** Servers forced on/off before the replay starts. */
  mcp?: Record<string, boolean>;
  reset?: boolean;
};

export type Transcript = {
  intents: Intent[];
  scenarios: Scenario[];
  fallback: Step[];
  greeting: Loc;
  greetingInline: Loc;
  requiresMissing: Loc;
  denied: Loc;
  help: Text[];
  compacted: Loc;
  cleared: Loc;
  overflow: Loc;
  unknownCommand: Loc;
  modelLine: Loc;
  mcpUsage: Loc;
  blocks: Record<BlockKind, Loc>;
};

/* ── Session state ──────────────────────────────────────────────────────── */

export type SessionConfig = {
  locale: Locale;
  transcript: Transcript;
  /** Servers enabled at start; defaults to the presets in world.ts. */
  mcp?: Record<string, boolean>;
  /** Replaced with the real tokenizer once it has lazily loaded. */
  countTokens?: (text: string) => number;
};

export type Breakdown = { kind: BlockKind; label: string; tokens: number; share: number };

/** Good enough before the 1 MB BPE table has loaded — and never claimed to be more. */
const estimateTokens = (text: string) => Math.max(1, Math.round([...text].length / 3.6));

export function createSession(config: SessionConfig) {
  const { transcript } = config;
  let locale = config.locale;
  let count = config.countTokens ?? estimateTokens;

  const mcpOn = new Map<string, boolean>(
    MCP_SERVERS.map((s) => [s.id, config.mcp?.[s.id] ?? s.on]),
  );

  const state = {
    files: 0,
    history: 0,
    output: 0,
    turns: 0,
    toolCalls: 0,
    read: new Set<string>(),
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

  const used = () =>
    (['system', 'tools', 'mcp', 'files', 'history', 'output'] as BlockKind[]).reduce(
      (sum, k) => sum + tokensOf(k),
      0,
    );

  function breakdown(): Breakdown[] {
    const total = used();
    return (['system', 'tools', 'mcp', 'files', 'history', 'output'] as BlockKind[]).map((kind) => ({
      kind,
      label: resolve(transcript.blocks[kind], locale),
      tokens: tokensOf(kind),
      share: total ? tokensOf(kind) / total : 0,
    }));
  }

  /* ── Planning ─────────────────────────────────────────────────────────── */

  function slashSteps(input: string): Step[] {
    const [cmd, ...args] = input.slice(1).trim().split(/\s+/);
    switch (cmd) {
      case 'help':
        return [{ type: 'out', lines: transcript.help }];

      case 'context':
        return [{ type: 'meter' }];

      case 'clear':
        return [{ type: 'clear' }, { type: 'note', text: transcript.cleared }];

      case 'compact':
        // The renderer calls `compact()` itself: the note it prints needs the
        // before/after numbers, which only exist once the step actually runs.
        return [{ type: 'compact' }, { type: 'meter' }];

      case 'model':
        return [{ type: 'out', lines: [transcript.modelLine] }];

      case 'mcp': {
        const [verb, id] = args;
        if (!verb) {
          return [
            {
              type: 'out',
              lines: MCP_SERVERS.map(
                (s) =>
                  `${mcpOn.get(s.id) ? '●' : '○'} ${s.name.padEnd(12)} ${String(s.tools).padStart(2)} tools · ${s.tokens.toLocaleString('en-US')} tokens`,
              ),
            },
            { type: 'note', text: transcript.mcpUsage },
          ];
        }
        const target = MCP_SERVERS.find((s) => s.id === id);
        if (!target || (verb !== 'on' && verb !== 'off')) {
          return [{ type: 'out', lines: [transcript.mcpUsage], tone: 'warn' }];
        }
        return [{ type: 'mcp', id: target.id, on: verb === 'on' }];
      }

      default:
        return [{ type: 'out', lines: [transcript.unknownCommand], tone: 'warn' }];
    }
  }

  function plan(input: string): Step[] {
    const trimmed = input.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('/')) return slashSteps(trimmed);

    const needle = trimmed.toLowerCase();
    const intent = transcript.intents.find((i) => i.match.some((m) => needle.includes(m)));
    if (!intent) return transcript.fallback;

    const missing = (intent.requires ?? []).filter((id) => !mcpOn.get(id));
    if (missing.length) {
      const names = missing
        .map((id) => MCP_SERVERS.find((s) => s.id === id)?.name ?? id)
        .join(', ');
      const text = resolve(transcript.requiresMissing, locale).replace('{servers}', names);
      return [{ type: 'note', text }];
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
        state.output += count(resolve(step.text, locale));
        break;
      case 'tool': {
        state.toolCalls += 1;
        const tokens = step.tokens ?? 0;
        // Reading the same file twice does not pay twice — it is already there.
        if (step.kind === 'files' && step.arg) {
          if (!state.read.has(step.arg)) {
            state.read.add(step.arg);
            state.files += tokens;
          }
        } else {
          state.history += tokens;
        }
        break;
      }
      case 'mcp':
        mcpOn.set(step.id, step.on);
        break;
      case 'clear':
        state.files = 0;
        state.history = 0;
        state.output = 0;
        state.turns = 0;
        state.read.clear();
        break;
      // Rendered only, or handled by the renderer itself (see `compact`).
      case 'note':
      case 'out':
      case 'meter':
      case 'permission':
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
    return { before, after: used(), kept };
  }

  return {
    get locale() {
      return locale;
    },
    set locale(next: Locale) {
      locale = next;
    },
    /** Swapped in once `gpt-tokenizer` has loaded, so counts stop being estimates. */
    setCounter(fn: (text: string) => number) {
      count = fn;
    },
    state,
    mcpOn,
    mcpTokens,
    windowSize: SESSION.windowSize,
    used,
    breakdown,
    plan,
    applyStep,
    bookInput,
    compact,
    toggleMcp: (id: string, on: boolean) => mcpOn.set(id, on),
    isOverflowing: () => used() > SESSION.windowSize,
    reset() {
      applyStep({ type: 'clear' });
      state.toolCalls = 0;
      for (const s of MCP_SERVERS) mcpOn.set(s.id, config.mcp?.[s.id] ?? s.on);
    },
  };
}

export type Session = ReturnType<typeof createSession>;
