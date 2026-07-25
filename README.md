# Claude-Code-Tutorial

A bilingual (German / English) tutorial for development teams introducing
Claude Code in an enterprise Java/Spring Boot/Angular environment with a
Jira/Confluence/Bitbucket tool stack — from tokens, context windows and
prompt caching through CLAUDE.md setup, the unit-test workflow and the
Jira-to-PR pass, to cost-conscious daily habits and finding new use cases.

20 chapters in five parts. Every chapter embeds a simulated Claude Code session
that plays out its own topic — tokens split live, a context window overflowing,
a permission rule refusing a push, a poisoned Jira ticket — plus a free-play
playground at `/<lang>/playground/`.

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
pre-bound per locale and passed in through the MDX `components` prop. The
terminal is imported explicitly by each chapter, with the script it should run:
`<Terminal script="mcp" locale="de" variant="inline" />`.

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

## The terminal

There used to be five separate demos. There is now one interactive model: a
scripted Claude Code session, embedded once per chapter and once as a full page.

| Piece | What it holds |
| --- | --- |
| `src/lib/terminal/world.ts` | MCP server presets and the session floor |
| `src/lib/terminal/engine.ts` | context accounting, prompt caching, permission rules, sub-agents — no DOM |
| `src/lib/terminal/scripts/common.json` | shared strings, slash-command output, the default fallback |
| `src/lib/terminal/scripts/<slug>.json` | one chapter's content, German and English side by side |
| `src/components/demos/Terminal.astro` | markup, renderer, styles |

Nothing calls a model or a server; every answer is scripted. Language is
resolved in frontmatter at build time, so a chapter page carries exactly one
chapter in exactly one language.

Two figures are genuinely measured rather than asserted: the German-vs-English
token surcharge in the tokens chapter runs the same paragraph through two
tokenizer generations while the page is built, and `/tokens <text>` splits text
with the real tokenizer. Everything else is a labelled simulation of realistic
orders of magnitude — token counts, never prices, because prices age faster
than this tutorial is maintained.

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
