import type { Locator, Page } from '@playwright/test';

/**
 * The playground is one long-running widget rather than a set of pages, so the
 * specs share these few moves: submit a line, wait for the run to finish, read
 * the status line. Everything else is plain locators.
 */
export class Terminal {
  readonly root: Locator;

  constructor(
    private readonly page: Page,
    index = 0,
  ) {
    this.root = page.locator('[data-terminal]').nth(index);
  }

  get output() {
    return this.root.locator('[data-out]');
  }

  get input() {
    return this.root.locator('[data-input]');
  }

  get status() {
    return this.root.locator('[data-status]');
  }

  scenario(id: string) {
    return this.root.locator(`[data-scenario="${id}"]`);
  }

  server(id: string) {
    return this.root.locator(`[data-server="${id}"]`);
  }

  /** The still-open approval prompt, if the agent is waiting on one. */
  get permission() {
    return this.root.locator('.term__permission:not([data-answered])');
  }

  async type(line: string) {
    await this.input.fill(line);
    await this.input.press('Enter');
  }

  /**
   * Resolves once no step is being animated any more — across every instance on
   * the page, so a replayed scenario is not mistaken for finished between two of
   * its commands.
   */
  async settle(timeout = 60_000) {
    await this.page.waitForFunction(
      () => {
        const nodes = [...document.querySelectorAll<HTMLElement>('[data-terminal]')];
        // `busy` alone drops between the commands a scenario replays, which
        // reads as "finished" far too early; `running` covers the whole replay.
        return nodes.every((n) => n.dataset.busy !== 'true' && n.dataset.running !== 'true');
      },
      undefined,
      { timeout },
    );
  }

  async run(line: string) {
    await this.type(line);
    await this.settle();
  }

  /** Replays a scenario and waits for all of it. */
  async play(id: string) {
    await this.scenario(id).click();
    await this.settle();
  }

  rule(id: string) {
    return this.root.locator(`[data-rule="${id}"]`);
  }

  /** Context tokens as a number, e.g. "Context ≈27.7k / 200k …" → 27.7. */
  async contextK(): Promise<number> {
    const text = (await this.status.innerText()) ?? '';
    const match = text.match(/([\d.,]+)k\s*\/\s*200k/);
    if (!match) throw new Error(`No context reading in status line: ${text}`);
    return Number(match[1].replace(',', '.'));
  }

  async isOverflowing(): Promise<boolean> {
    return (await this.root.getAttribute('data-overflow')) === 'true';
  }
}

/** Every chapter slug in reading order, both languages share it. */
export const CHAPTERS = [
  'token',
  'context',
  'context-window',
  'kv-cache',
  'prefill-decode',
  'prompt-caching',
  'claude-code',
  'setup',
  'tool-use',
  'mcp',
  'skills',
  'unit-tests',
  'agentic-workflows',
  'atlassian',
  'multi-agent',
  'cost',
  'use-cases',
  'prompt-injection',
  'hallucinations',
  'evals',
] as const;
