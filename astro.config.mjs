// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

// Deployed to GitHub Pages under https://saibottig.github.io/llm-tutorial/
export default defineConfig({
  site: 'https://saibottig.github.io',
  base: '/llm-tutorial',
  trailingSlash: 'ignore',
  integrations: [mdx()],
  i18n: {
    defaultLocale: 'de',
    locales: ['de', 'en'],
    routing: {
      prefixDefaultLocale: true,
      // We render src/pages/index.astro as the root instead — Astro's built-in
      // redirect page waits 2s before forwarding, which reads as a stall.
      redirectToDefaultLocale: false,
    },
  },
  build: {
    // Emit page.html rather than page/index.html — keeps the Pages URLs tidy.
    format: 'directory',
  },
});
