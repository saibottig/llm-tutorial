import { expect, test } from '@playwright/test';
import { Terminal } from './helpers';

/**
 * The playground carries the only real logic in the repo: context accounting,
 * compaction and the permission gate. It is asserted here through the UI rather
 * than against the engine module directly, because the interesting failures —
 * a denied step still billed, compaction freeing what the harness re-sends — are
 * only wrong in the numbers a reader actually sees.
 */

test.describe('terminal playground', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('de/playground/');
  });

  test('opens on a session that already costs something', async ({ page }) => {
    const term = new Terminal(page);

    // Three MCP servers are on by default, and the harness sends its system
    // prompt, CLAUDE.md and tool definitions before anyone types a word.
    await expect(term.status).toContainText('Context 18.9k / 200k (9 %)');
    await expect(term.status).toContainText('0 Tool-Aufrufe');
    await expect(term.output).toContainText('Simulierte Sitzung');
  });

  test('/help lists the commands it actually implements', async ({ page }) => {
    const term = new Terminal(page);
    await term.run('/help');

    for (const command of ['/context', '/compact', '/clear', '/mcp', '/model']) {
      await expect(term.output).toContainText(command);
    }
  });

  test('an unknown command says so instead of falling through', async ({ page }) => {
    const term = new Terminal(page);
    await term.run('/definitelynotacommand');
    await expect(term.output).toContainText('Unbekannter Befehl');
  });

  test('MCP servers cost context before the first prompt', async ({ page }) => {
    const term = new Terminal(page);
    const before = await term.contextK();

    await term.server('sentry').check();
    const after = await term.contextK();

    // Sentry's definitions are 2,400 tokens — on every request, unprompted.
    expect(after - before).toBeCloseTo(2.4, 1);

    await term.server('sentry').uncheck();
    expect(await term.contextK()).toBeCloseTo(before, 1);
  });

  test('a denied approval stops the loop and bills nothing', async ({ page }) => {
    const term = new Terminal(page);

    await term.type('Schreib einen Unit-Test für BerthAllocationService');
    await expect(term.permission).toBeVisible();

    const beforeDecision = await term.status.innerText();
    await term.permission.getByRole('button', { name: /Ablehnen/ }).click();
    await term.settle();

    await expect(term.output).toContainText('Abgelehnt');
    // The tests that would have followed never ran, so they cost nothing.
    await expect(term.output).not.toContainText('BUILD SUCCESSFUL');
    expect(await term.status.innerText()).toBe(beforeDecision);
  });

  test('an approved loop runs to the end', async ({ page }) => {
    const term = new Terminal(page);

    await term.type('Schreib einen Unit-Test für BerthAllocationService');
    await expect(term.permission).toBeVisible();
    await term.permission.getByRole('button', { name: /Erlauben/ }).click();
    await term.settle();

    await expect(term.output).toContainText('BUILD SUCCESSFUL');
    await expect(term.output).toContainText('3 tests completed');
    // Reading the class, grepping, writing and running: four tool calls.
    await expect(term.status).toContainText('4 Tool-Aufrufe');
  });

  test('Escape at an approval prompt means deny, not skip', async ({ page }) => {
    const term = new Terminal(page);

    await term.type('Schreib einen Unit-Test für BerthAllocationService');
    await expect(term.permission).toBeVisible();
    await page.keyboard.press('Escape');
    await term.settle();

    await expect(term.output).toContainText('Abgelehnt');
  });

  test('/context breaks the window down and /compact shrinks it', async ({ page }) => {
    const term = new Terminal(page);

    await term.type('Erkläre mir die Berth-Allocation');
    await term.settle();
    await term.run('/context');

    await expect(term.root.locator('.term__breakdown')).toHaveCount(1);
    await expect(term.output).toContainText('MCP-Server');
    await expect(term.output).toContainText('Gelesene Dateien');

    const before = await term.contextK();
    await term.run('/compact');
    const after = await term.contextK();

    expect(after).toBeLessThan(before);
    await expect(term.output).toContainText('Verlauf komprimiert');
  });

  test('compaction cannot free what the harness re-sends', async ({ page }) => {
    const term = new Terminal(page);

    await term.type('Erkläre mir die Berth-Allocation');
    await term.settle();
    await term.run('/compact');

    // System prompt, CLAUDE.md, built-in tools and the three enabled MCP
    // servers survive every compaction — that asymmetry is the lesson.
    expect(await term.contextK()).toBeGreaterThanOrEqual(18.9);
    await expect(term.output).toContainText('bleiben unangetastet');
  });

  test('/clear resets the session but not the floor', async ({ page }) => {
    const term = new Terminal(page);

    await term.type('Erkläre mir die Berth-Allocation');
    await term.settle();
    expect(await term.contextK()).toBeGreaterThan(19);

    await term.run('/clear');
    expect(await term.contextK()).toBeCloseTo(18.9, 1);
    await expect(term.status).toContainText('0 Runden');
  });

  test('an intent needing a disabled server explains itself', async ({ page }) => {
    const term = new Terminal(page);

    await term.server('jira').uncheck();
    await term.run('Setz TERM-4711 um');

    await expect(term.output).toContainText('/mcp on');
    await expect(term.output).toContainText('Jira');
    await expect(term.status).toContainText('0 Tool-Aufrufe');
  });

  test('an unscripted prompt falls back without pretending', async ({ page }) => {
    const term = new Terminal(page);
    await term.run('Wie ist das Wetter in Hamburg?');
    await expect(term.output).toContainText('nichts hinterlegt');
  });

  test('three verbose commands overflow the window, /compact recovers it', async ({ page }) => {
    test.slow();
    const term = new Terminal(page);

    await term.scenario('overflow').click();
    await expect
      .poll(() => term.isOverflowing(), { timeout: 90_000 })
      .toBe(true);
    await expect(term.output).toContainText('Context Window übergelaufen');

    // The scenario ends with /compact; wait for its note, not for a momentary
    // idle between the commands it replays.
    await expect(term.output).toContainText('Verlauf komprimiert', { timeout: 90_000 });
    await term.settle();

    expect(await term.contextK()).toBeLessThan(200);
    expect(await term.isOverflowing()).toBe(false);
  });

  test('the ticket scenario walks ticket → code → tests → push → PR', async ({ page }) => {
    test.slow();
    const term = new Terminal(page);

    await term.scenario('ticket-to-pr').click();

    // Two approvals: the edit, then the push. Everything else runs unattended.
    for (const _ of [0, 1]) {
      await expect(term.permission).toBeVisible({ timeout: 60_000 });
      await term.permission.getByRole('button', { name: /Erlauben/ }).click();
    }
    await term.settle(90_000);

    await expect(term.output).toContainText('TERM-4711');
    await expect(term.output).toContainText('PR #218');
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
    await term.type('Erkläre mir die Berth-Allocation');
    await term.settle();

    await term.root.locator('[data-reset]').click();

    expect(await term.contextK()).toBeCloseTo(18.9, 1);
    await expect(term.server('sentry')).not.toBeChecked();
    await expect(term.output).toContainText('Simulierte Sitzung');
  });
});

test.describe('English playground', () => {
  test('matches intents and stays in English', async ({ page }) => {
    await page.goto('en/playground/');
    const term = new Terminal(page);

    await term.type('Write a unit test for BerthAllocationService');
    await expect(term.permission).toBeVisible();
    await term.permission.getByRole('button', { name: /Allow/ }).click();
    await term.settle();

    await expect(term.output).toContainText('Three tests, all green');
    await expect(term.output).not.toContainText('Zeilen');
  });

  test('English scenarios replay English prompts', async ({ page }) => {
    await page.goto('en/playground/');
    const term = new Terminal(page);

    await term.scenario('unit-test').click();
    await expect(term.output).toContainText('Write a unit test');
  });
});

test.describe('inline instances', () => {
  const EMBEDS = ['claude-code', 'tool-use', 'agentic-workflows'] as const;

  for (const slug of EMBEDS) {
    test(`${slug} embeds a terminal that links back to the full page`, async ({ page }) => {
      await page.goto(`de/${slug}/`);

      const term = new Terminal(page);
      await expect(term.root).toHaveCount(1);
      await expect(term.root).toHaveAttribute('data-variant', 'inline');
      await expect(term.root.locator('a[href$="/playground/"]')).toHaveCount(1);
    });
  }

  test('an inline instance without free input still replays its scenario', async ({ page }) => {
    await page.goto('de/agentic-workflows/');
    const term = new Terminal(page);

    await expect(term.input).toHaveCount(0);
    await term.scenario('ticket-to-pr').click();
    await expect(term.permission).toBeVisible({ timeout: 60_000 });
  });
});
