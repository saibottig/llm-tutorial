import { expect, test } from '@playwright/test';
import { CHAPTERS, Terminal } from './helpers';

/**
 * The terminal carries the only real logic in the repo: context accounting,
 * prompt caching, the permission gate and sub-agent isolation. It is asserted
 * through the UI rather than against the engine module directly, because the
 * interesting failures — a denied step still billed, compaction freeing what the
 * harness re-sends — are only wrong in the numbers a reader actually sees.
 */

test.describe('every chapter', () => {
  for (const slug of CHAPTERS) {
    test(`${slug} has a working terminal`, async ({ page }) => {
      await page.goto(`de/${slug}/`);
      const term = new Terminal(page);

      await expect(term.root).toHaveCount(1);
      await expect(term.root).toHaveAttribute('data-variant', 'inline');
      // Every chapter script must offer at least one thing to click, or the
      // embed is decoration.
      expect(await term.root.locator('[data-scenario]').count()).toBeGreaterThan(0);
      await expect(term.status).toContainText('Context');
    });
  }

  test('each chapter gets its own script, not a shared one', async ({ page }) => {
    const titles = new Set<string>();
    for (const slug of CHAPTERS) {
      await page.goto(`de/${slug}/`);
      titles.add(await page.locator('.demo__title').first().innerText());
    }
    expect(titles.size).toBe(CHAPTERS.length);
  });
});

test.describe('context accounting', () => {
  test('the floor is charged before anyone types', async ({ page }) => {
    await page.goto('de/claude-code/');
    const term = new Terminal(page);

    // System prompt, CLAUDE.md and the built-in tools, with no MCP server on.
    await expect(term.status).toContainText('0 Tool-Aufrufe');
    expect(await term.contextK()).toBeGreaterThan(7);
  });

  test('MCP servers cost context before the first prompt', async ({ page }) => {
    await page.goto('de/mcp/');
    const term = new Terminal(page);

    const before = await term.contextK();
    await term.server('sentry').check();
    // Sentry's definitions are 2,400 tokens — on every request, unprompted.
    expect((await term.contextK()) - before).toBeCloseTo(2.4, 1);
  });

  test('three verbose commands overflow the window, /compact recovers it', async ({ page }) => {
    test.slow();
    await page.goto('de/context-window/');
    const term = new Terminal(page);

    await term.play('fill');
    expect(await term.isOverflowing()).toBe(true);
    await expect(term.output).toContainText('Context Window übergelaufen');

    await term.play('rescue');
    expect(await term.contextK()).toBeLessThan(200);
    await expect(term.output).toContainText('bleiben unangetastet');
  });

  test('compaction cannot free what the harness re-sends', async ({ page }) => {
    await page.goto('de/claude-code/');
    const term = new Terminal(page);

    await term.play('housekeeping');
    // /clear ran last, so only the floor is left — and the floor survives both.
    expect(await term.contextK()).toBeGreaterThan(7);
    await expect(term.status).toContainText('0 Runden');
  });
});

test.describe('prompt caching', () => {
  test('a settled prefix produces a cache hit', async ({ page }) => {
    await page.goto('de/prompt-caching/');
    const term = new Terminal(page);

    await term.play('warm');
    const reports = await page.locator('.term__line--cache').allInnerTexts();
    expect(reports.length).toBeGreaterThanOrEqual(2);
    const share = (text: string) => Number(text.match(/\((\d+) %/)![1]);
    // First request has nothing to hit; the second one does.
    expect(share(reports[0])).toBe(0);
    expect(share(reports.at(-1)!)).toBeGreaterThan(0);
  });

  test('touching an earlier block throws the hit away', async ({ page }) => {
    await page.goto('de/prompt-caching/');
    const term = new Terminal(page);

    await term.play('warm');
    const warm = await page.locator('.term__line--cache').last().innerText();

    // Editing CLAUDE.md needs approval — without answering it the scenario
    // never finishes.
    await term.scenario('claudemd').click();
    await expect(term.permission).toBeVisible({ timeout: 30_000 });
    await term.permission.getByRole('button', { name: /Erlauben/ }).click();
    await term.settle();
    const broken = await page.locator('.term__line--cache').last().innerText();

    const pct = (text: string) => Number(text.match(/\((\d+) %/)![1]);
    expect(pct(broken)).toBeLessThan(pct(warm));
    await expect(term.output).toContainText('Cache ab');
  });
});

test.describe('the permission gate', () => {
  test('a denied approval stops the loop and bills nothing', async ({ page }) => {
    await page.goto('de/tool-use/');
    const term = new Terminal(page);

    await term.scenario('loop').click();
    await expect(term.permission).toBeVisible({ timeout: 30_000 });

    const beforeDecision = await term.status.innerText();
    await term.permission.getByRole('button', { name: /Ablehnen/ }).click();
    await term.settle();

    await expect(term.output).toContainText('Abgelehnt');
    await expect(term.output).not.toContainText('BUILD SUCCESSFUL');
    expect(await term.status.innerText()).toBe(beforeDecision);
  });

  test('an approved loop runs to the end', async ({ page }) => {
    await page.goto('de/tool-use/');
    const term = new Terminal(page);

    await term.scenario('loop').click();
    await expect(term.permission).toBeVisible({ timeout: 30_000 });
    await term.permission.getByRole('button', { name: /Erlauben/ }).click();
    await term.settle();

    await expect(term.output).toContainText('BUILD SUCCESSFUL');
    await expect(term.status).toContainText('4 Tool-Aufrufe');
  });

  test('an allow rule runs the call without asking', async ({ page }) => {
    await page.goto('de/setup/');
    const term = new Terminal(page);

    await term.scenario('tuned').click();
    // Reading and testing are allowed outright; only the edit should stop.
    await expect(term.permission).toBeVisible({ timeout: 30_000 });
    await expect(term.permission.locator('.term__permWhat')).toContainText('Edit');
    await term.permission.getByRole('button', { name: /Erlauben/ }).click();
    await term.settle();

    await expect(term.output).toContainText('BUILD SUCCESSFUL');
  });

  test('a deny rule drops the call without asking at all', async ({ page }) => {
    await page.goto('de/setup/');
    const term = new Terminal(page);

    await term.play('deny');
    await expect(term.output).toContainText('Von einer Regel blockiert');
    await expect(term.permission).toHaveCount(0);
  });

  test('switching a rule off changes what the same prompt does', async ({ page }) => {
    await page.goto('de/setup/');
    const term = new Terminal(page);

    await term.play('deny');
    await expect(term.output).toContainText('Von einer Regel blockiert');

    await term.rule('nopush').uncheck();
    await term.type('Push den Fix nach origin');
    // With the deny rule off it asks instead of refusing.
    await expect(term.permission).toBeVisible({ timeout: 30_000 });
  });
});

test.describe('sub-agents', () => {
  test('spend their own tokens and return only a summary', async ({ page }) => {
    test.slow();
    await page.goto('de/multi-agent/');
    const term = new Terminal(page);

    await term.play('single');
    const alone = await term.contextK();

    await term.play('delegated');
    const delegated = await term.contextK();

    expect(await term.root.locator('.term__subagent').count()).toBe(3);
    // The chapter's correction: more tokens overall, less in the main thread.
    expect(delegated).toBeLessThan(alone);
    await expect(term.output).toContainText('teurer, nicht billiger');
  });
});

test.describe('prompt injection', () => {
  test('the agent follows injected instructions and the rules stop it', async ({ page }) => {
    await page.goto('de/prompt-injection/');
    const term = new Terminal(page);

    await term.play('guarded');
    await expect(term.root.locator('.term__injected')).toBeVisible();
    await expect(term.output).toContainText('Von einer Regel blockiert');
    // It never reached the exfiltration call.
    await expect(term.output).not.toContainText('HTTP 200');
  });

  test('without the rules the same run gets further', async ({ page }) => {
    await page.goto('de/prompt-injection/');
    const term = new Terminal(page);

    await term.scenario('unguarded').click();
    // The broad "allow reading" rule covers .env too, so only the outbound call
    // stops to ask — which is itself the lesson about rules that are too wide.
    await expect(term.permission).toBeVisible({ timeout: 30_000 });
    await term.permission.getByRole('button', { name: /Erlauben/ }).click();
    await term.settle();

    await expect(term.output).toContainText('HTTP 200');
    await expect(term.output).toContainText('nie „entschieden“');
  });
});

test.describe('measured figures', () => {
  test('the tokenizer comparison is computed at build time', async ({ page }) => {
    await page.goto('de/token/');
    const term = new Terminal(page);

    await term.play('compounds');
    const compare = term.root.locator('.term__compare');
    await expect(compare).toBeVisible();

    // The chapter's documented correction: current tokenizers are far below the
    // "German costs 2-3x" rule of thumb the older generation produced.
    await expect(compare).toContainText('o200k_base');
    await expect(compare).toContainText('cl100k_base');
    const deltas = await compare.locator('.term__compareDelta').allInnerTexts();
    const modern = Number(deltas[0].match(/\d+/)![0]);
    const legacy = Number(deltas[1].match(/\d+/)![0]);
    expect(modern).toBeLessThan(legacy);
    expect(modern).toBeLessThan(30);
  });

  test('/tokens splits text the way the model does', async ({ page }) => {
    await page.goto('de/token/');
    const term = new Terminal(page);

    await term.play('split');
    expect(await term.root.locator('.term__tokchip').count()).toBeGreaterThan(10);
    await expect(term.output).toContainText('Zeichen pro Token');
  });

  test('prefill and decode are shown as separate phases', async ({ page }) => {
    await page.goto('de/prefill-decode/');
    const term = new Terminal(page);

    await term.play('long-in');
    await expect(term.root.locator('.term__line--phase')).toHaveCount(2);
    await expect(term.output).toContainText('Prefill');
    await expect(term.output).toContainText('Decode');
  });
});

test.describe('the playground page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('de/playground/');
  });

  test('offers free input and every scenario', async ({ page }) => {
    const term = new Terminal(page);
    await expect(term.input).toBeVisible();
    expect(await term.root.locator('[data-scenario]').count()).toBe(4);
  });

  test('/help lists the commands it actually implements', async ({ page }) => {
    const term = new Terminal(page);
    await term.run('/help');
    for (const command of ['/context', '/cache', '/compact', '/clear', '/tokens', '/mcp']) {
      await expect(term.output).toContainText(command);
    }
  });

  test('an unknown command says so instead of falling through', async ({ page }) => {
    const term = new Terminal(page);
    await term.run('/definitelynotacommand');
    await expect(term.output).toContainText('Unbekannter Befehl');
  });

  test('an unscripted prompt falls back without pretending', async ({ page }) => {
    const term = new Terminal(page);
    await term.run('Wie ist das Wetter in Hamburg?');
    await expect(term.output).toContainText('nichts hinterlegt');
  });

  test('an intent needing a disabled server explains itself', async ({ page }) => {
    const term = new Terminal(page);
    await term.server('jira').uncheck();
    await term.run('Setz TERM-4711 um');
    await expect(term.output).toContainText('/mcp on');
    await expect(term.status).toContainText('0 Tool-Aufrufe');
  });

  test('history and tab completion work at the prompt', async ({ page }) => {
    const term = new Terminal(page);
    await term.run('/model');

    await term.input.click();
    await term.input.press('ArrowUp');
    await expect(term.input).toHaveValue('/model');

    await term.input.fill('/comp');
    await term.input.press('Tab');
    await expect(term.input).toHaveValue('/compact ');
  });

  test('reset returns the session to its opening state', async ({ page }) => {
    const term = new Terminal(page);
    await term.server('sentry').check();
    await term.run('Erkläre mir die Berth-Allocation');

    await term.root.locator('[data-reset]').click();
    await expect(term.server('sentry')).not.toBeChecked();
    await expect(term.status).toContainText('0 Runden');
    await expect(term.output).toContainText('Simulierte Sitzung');
  });
});

test.describe('English', () => {
  test('a chapter terminal matches English intents and stays English', async ({ page }) => {
    await page.goto('en/unit-tests/');
    const term = new Terminal(page);

    await term.scenario('write').click();
    await expect(term.permission).toBeVisible({ timeout: 30_000 });
    await term.permission.getByRole('button', { name: /Allow/ }).click();
    await term.settle();

    await expect(term.output).toContainText('BUILD SUCCESSFUL');
    await expect(term.output).not.toContainText('Zeilen');
  });

  test('English scenarios replay English prompts', async ({ page }) => {
    await page.goto('en/cost/');
    const term = new Terminal(page);
    await term.scenario('careful').click();
    await expect(term.output).toContainText('Where is the ETA compared?');
  });
});

/**
 * These figures used to be scripted constants sitting next to a status line that
 * disagreed with them. They are derived from the session now, so each of these
 * cases goes red if anyone pins them back to a literal.
 */
test.describe('the numbers a reader can cross-check', () => {
  /** "Prefill 23,036 · 1.83 s to first token" → { prompt: 23036, ttft: 1.83 } */
  async function phase(term: Terminal) {
    const text = await term.output.innerText();
    const match = text.match(/([\d,]+) · ([\d.]+) s to first token/);
    if (!match) throw new Error(`No prefill line in output: ${text.slice(0, 400)}`);
    return { prompt: Number(match[1].replace(/,/g, '')), ttft: Number(match[2]) };
  }

  test('a fuller window really does slow the first token down', async ({ page }) => {
    test.slow();
    await page.goto('en/kv-cache/');
    const term = new Terminal(page);

    await term.play('short');
    const small = await phase(term);

    await term.play('long');
    // Same prompt, same intent — only the 78k build log in front of it differs.
    // That is the entire claim the scenario's hint makes.
    const large = await phase(term);

    expect(large.prompt).toBeGreaterThan(small.prompt * 3);
    expect(large.ttft).toBeGreaterThan(small.ttft * 3);
  });

  test('prefill is charged for the whole context, not a scripted figure', async ({ page }) => {
    await page.goto('en/prefill-decode/');
    const term = new Terminal(page);

    await term.play('long-in');
    const { prompt } = await phase(term);
    // The status line reads in thousands; the prefill line reads in tokens.
    expect(prompt / 1000).toBeCloseTo(await term.contextK(), 0);
  });

  test('the status meter shows how full the window is, not just its parts', async ({ page }) => {
    await page.goto('en/context-window/');
    const term = new Terminal(page);

    await term.play('floor');
    const bar = await term.root.evaluate((root: HTMLElement) => {
      const meter = root.querySelector('[data-meter]') as HTMLElement;
      const segs = [...meter.children].map((c) => c.getBoundingClientRect().width);
      return { width: meter.getBoundingClientRect().width, segs };
    });
    const filled = bar.segs.reduce((a, b) => a + b, 0);

    // An empty session sits at ~9 % of the window; a grow factor on the segments
    // made this bar read as completely full.
    expect(filled / bar.width).toBeLessThan(0.2);
    // 3,550 system : 3,900 tools : 11,400 MCP — the widest segment is the MCP one.
    expect(bar.segs.at(-1)!).toBeGreaterThan(bar.segs[0] * 2);
  });

  test("a sub-agent's calls are counted even though its tokens are not", async ({ page }) => {
    test.slow();
    await page.goto('en/multi-agent/');
    const term = new Terminal(page);

    await term.play('delegated');
    const status = await term.status.innerText();
    expect(Number(status.match(/(\d+) tool calls/)![1])).toBeGreaterThan(0);
    // Still isolated: the summaries are all that reached the main thread.
    expect(await term.contextK()).toBeLessThan(21);
  });

  test('the agent compares itself against what the workflow actually did', async ({ page }) => {
    test.slow();
    await page.goto('en/agentic-workflows/');
    const term = new Terminal(page);

    await term.scenario('workflow').click();
    await expect(term.permission).toBeVisible({ timeout: 30_000 });
    await term.permission.getByRole('button', { name: /Allow/ }).click();
    await term.settle();
    const workflowCalls = Number((await term.status.innerText()).match(/(\d+) tool calls/)![1]);
    const workflowContext = await term.contextK();

    await term.scenario('agent').click();
    await expect(term.permission).toBeVisible({ timeout: 30_000 });
    await term.permission.getByRole('button', { name: /Allow/ }).click();
    await term.settle();
    const agentCalls = Number((await term.status.innerText()).match(/(\d+) tool calls/)![1]);

    expect(workflowCalls).toBe(3);
    expect(agentCalls).toBe(8);
    // The agent's closing line spells the comparison out — and used to say
    // "four", counting the workflow's steps rather than its tool calls.
    const spelled = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
    const claim = `${spelled[agentCalls]} tool calls instead of ${spelled[workflowCalls]}`;
    await expect(term.output).toContainText(claim.replace(/^\w/, (c) => c.toUpperCase()));
    // "roughly 12,000 tokens more in the context"
    expect((await term.contextK()) - workflowContext).toBeGreaterThan(10);
  });

  test('the careless run costs what the cost chapter says it costs', async ({ page }) => {
    test.slow();
    await page.goto('en/cost/');
    const term = new Terminal(page);

    await term.play('careless');
    const careless = await term.contextK();

    await term.play('careful');
    const careful = await term.contextK();

    // The claim in the closing note: roughly a fifth of the context.
    expect(careful / careless).toBeGreaterThan(0.15);
    expect(careful / careless).toBeLessThan(0.25);
    await expect(term.output).toContainText('roughly a fifth');
  });
});
