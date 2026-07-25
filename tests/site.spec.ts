import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { CHAPTERS, Terminal } from './helpers';

/**
 * The site-level checks that used to be done by hand once and then forgotten.
 * `scripts/check-translations.mjs` already guarantees that every chapter exists
 * in both languages and that cross-links resolve; what it cannot see is whether
 * the built pages actually render and navigate.
 */

test.describe('pages', () => {
  test('every chapter renders in both languages', async ({ page }) => {
    test.slow();
    for (const lang of ['de', 'en'] as const) {
      for (const slug of CHAPTERS) {
        const response = await page.goto(`${lang}/${slug}/`);
        expect(response?.status(), `${lang}/${slug}`).toBe(200);
        await expect(page.locator('h1')).toBeVisible();
      }
    }
  });

  test('the root redirects into the default locale', async ({ page }) => {
    await page.goto('');
    await page.waitForURL(/\/de\/$/, { timeout: 15_000 });
  });

  test('the prev/next chain walks the whole tutorial', async ({ page }) => {
    test.slow();
    await page.goto(`de/${CHAPTERS[0]}/`);

    for (let i = 1; i < CHAPTERS.length; i++) {
      await page.locator('a[rel="next"]').click();
      await expect(page).toHaveURL(new RegExp(`/de/${CHAPTERS[i]}/$`));
    }
    // The last chapter ends the chain rather than looping.
    await expect(page.locator('a[rel="next"]')).toHaveCount(0);
  });

  test('the language switch keeps the reader on the same chapter', async ({ page }) => {
    await page.goto('de/prompt-caching/');
    await page.locator('.langswitch a[hreflang="en"]').click();
    await expect(page).toHaveURL(/\/en\/prompt-caching\/$/);
    await expect(page.locator('h1')).toHaveText('Prompt Caching');
  });
});

test.describe('playground page', () => {
  test('is reachable from the sidebar and the home page', async ({ page }) => {
    await page.goto('de/');
    await page.locator('.hero__cta--ghost').click();
    await expect(page).toHaveURL(/\/de\/playground\/$/);
    await expect(page.locator('.sidebar__link--playground[aria-current="page"]')).toHaveCount(1);
  });

  test('switches language and declares the right alternate', async ({ page }) => {
    await page.goto('de/playground/');
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
      'href',
      /\/en\/playground\/$/,
    );

    await page.locator('.langswitch a[hreflang="en"]').click();
    await expect(page).toHaveURL(/\/en\/playground\/$/);
  });

  test('does not preload the 1 MB tokenizer', async ({ page }) => {
    // It is fetched only when someone asks for exact counts — the whole reason
    // that button exists. A stray eager import would undo it silently.
    const requests: string[] = [];
    page.on('request', (r) => requests.push(r.url()));

    await page.goto('de/playground/');
    await page.waitForLoadState('networkidle');

    expect(requests.filter((u) => u.includes('o200k_base'))).toHaveLength(0);
  });
});

test.describe('layout', () => {
  test('nothing scrolls the page sideways at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });

    for (const path of ['de/', 'de/playground/', 'de/tool-use/', 'de/mcp/']) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(1);
    }
  });

  test('the terminal is readable in both themes', async ({ page }) => {
    await page.goto('de/playground/');
    const screen = page.locator('.term__out');

    for (const theme of ['dark', 'light'] as const) {
      await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
      const { color, background } = await screen.evaluate((el) => ({
        color: getComputedStyle(el).color,
        background: getComputedStyle(el.parentElement!).backgroundColor,
      }));
      expect(color, theme).not.toBe(background);
    }
  });

  test('the page loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

    await page.goto('de/playground/');
    const term = new Terminal(page);
    await term.run('/context');

    expect(errors).toEqual([]);
  });
});

test.describe('source guards', () => {
  /**
   * Runtime isolation of two terminals on one page was verified by hand; what
   * regresses it in practice is someone copying the id-based pattern from the
   * older demos, which every instance would then share. This catches that at
   * the point it is written rather than the first time two instances meet.
   */
  test('the terminal never reaches for a global element id', async () => {
    const source = await readFile('src/components/demos/Terminal.astro', 'utf8');
    expect(source).not.toContain('getElementById');
  });

  test('chapter content is resolved at build time, not shipped twice', async () => {
    const source = await readFile('src/components/demos/Terminal.astro', 'utf8');
    // The client script must not import a script file: the whole point of
    // resolving in frontmatter is that a page carries one chapter, one language.
    const client = source.slice(source.indexOf('<script>'));
    expect(client).not.toMatch(/from '\.\.\/\.\.\/lib\/terminal\/scripts/);
  });

  test('the deleted demos are really gone', async () => {
    for (const name of ['Tokenizer', 'ContextWindow', 'PrefillDecode', 'CacheSimulator', 'McpCost']) {
      await expect(readFile(`src/components/demos/${name}.astro`, 'utf8')).rejects.toThrow();
    }
  });
});
