import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;
const BASE = `http://localhost:${PORT}/llm-tutorial/`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],

  use: {
    baseURL: BASE,
    trace: 'on-first-retry',
    /**
     * Sandboxes and locked-down CI images sometimes ship a browser instead of
     * letting Playwright download one. Point this at that binary — everywhere
     * else the default resolution applies and this stays unset.
     */
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {},
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: {
    /**
     * Deliberately the production build, not `astro dev`. The demos ship as
     * bundled modules with scoped styles resolved at build time; the dev server
     * is not what a visitor gets, and the two have differed before.
     */
    command: 'npm run build && npm run preview',
    url: `${BASE}de/`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
