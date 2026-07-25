# Claude-Code-Tutorial

A bilingual (German / English) tutorial for development teams introducing
Claude Code in an enterprise Java/Spring Boot/Angular environment with a
Jira/Confluence/Bitbucket tool stack — from tokens, context windows and
prompt caching through CLAUDE.md setup, the unit-test workflow and the
Jira-to-PR pass, to cost-conscious daily habits and finding new use cases.

20 chapters in five parts, six interactive demos, and a simulated Claude Code
terminal you can type into at `/<lang>/playground/`.

Continuing this project? Start with [HANDOVER.md](HANDOVER.md) — it covers
the conventions, the deliberate deviations from common wisdom, and the open
ends.

## Running it

```bash
npm install
npm run dev      # http://localhost:4321/llm-tutorial
npm run build    # static output in dist/
npm run preview  # serve the built site
npm test         # Playwright, against the production build
```

`npm test` builds and serves the site itself, so nothing needs to be running
first. Once per machine: `npx playwright install chromium`.

## How chapters work

Chapters are MDX files at `src/content/chapters/<lang>/<slug>.mdx`. Language
and slug come from the path, so they are never duplicated in frontmatter:

```mdx
---
title: Prompt Caching
description: One line, shown on the index card and as the page description.
part: 2        # 1–5, drives the sidebar grouping
order: 3       # position within the part
---
```

`<Callout>` and `<KeyTakeaway>` are available without importing — they are
pre-bound per locale and passed in through the MDX `components` prop. Demos are
imported explicitly by the one chapter that uses them.

Cross-references between chapters are written `[label](../other-slug/)`.

## The build gate

`npm run build` runs `scripts/check-translations.mjs` first, which fails the
build if:

- a chapter exists in one language but not the other
- the same slug sits at a different part/order across languages
- two chapters share a part/order position
- a chapter links to a slug that does not exist, or to itself
- frontmatter is missing a required field
- a playground transcript entry has one language but not the other
- a playground scenario replays a command nothing answers

This runs in CI too, so a missing translation or a dead cross-link cannot reach
the published site.

The gate checks content; `tests/` checks behaviour. The Playwright suite drives
the playground the way a reader would — approvals granted and denied, `/compact`,
an overflowing window — and walks every chapter page, the prev/next chain and
the language switch. `deploy` depends on both, so a red suite does not publish.

## The demos

| Demo | Chapter | Notes |
| --- | --- | --- |
| Tokenizer | Tokens | Examples are tokenised at build time. The 2 MB BPE table is a lazy chunk, fetched only when a reader asks to tokenise their own text. |
| Context window | Context Window | Stacked bar; overflow and compaction are both reachable. |
| Prefill / decode | Prefill and Decode | Animation pace and reported figures are deliberately decoupled. |
| Cache simulator | Prompt Caching | Editing a block invalidates it and everything after it. |
| MCP cost | MCP | Tool-definition tokens per request (Atlassian-stack presets) against a skills baseline. |
| Terminal playground | own page, plus Claude Code / Tool Use / Agentic Workflows | A scripted Claude Code session: prompts, tool calls, approval prompts, MCP toggles, and the context window filling up as you go. |

None of them make external requests; everything is computed in the page. The
playground never calls a model — its answers come from
`src/lib/terminal/transcript.json`.

## Deployment

Pushing to `main` builds and publishes to GitHub Pages via
`.github/workflows/deploy.yml`. The repository needs **Settings → Pages →
Source: GitHub Actions** enabled once.

**Push straight to `main`.** No pull request is required — for content work
the published site is the review, and a PR only delays seeing it. This
applies to humans and to agents working in this repo alike: commit, push to
`main`, look at the result. Open a branch and a PR only when you actually
want a second pair of eyes before it goes live.

The build gate is what makes that safe: `npm run build` runs
`scripts/check-translations.mjs` first, in CI as well, so a missing
translation or a dead cross-link fails the deploy instead of reaching the
site. Run `npm run check` before pushing and you will catch it a minute
earlier.

`base` in `astro.config.mjs` is `/llm-tutorial` — change it alongside the
repository name if that ever moves.
