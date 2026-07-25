# LLM-Tutorial

A bilingual (German / English) tutorial on how language models actually work —
tokens, context windows, KV cache, prompt caching, tool use, MCP, skills,
harnesses, agents and what it takes to run any of it in production.

17 chapters in five parts, with six interactive demos.

## Running it

```bash
npm install
npm run dev      # http://localhost:4321/llm-tutorial
npm run build    # static output in dist/
npm run preview  # serve the built site
```

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

This runs in CI too, so a missing translation or a dead cross-link cannot reach
the published site.

## The demos

| Demo | Chapter | Notes |
| --- | --- | --- |
| Tokenizer | Tokens | Examples are tokenised at build time. The 2 MB BPE table is a lazy chunk, fetched only when a reader asks to tokenise their own text. |
| Context window | Context Window | Stacked bar; overflow and compaction are both reachable. |
| Prefill / decode | Prefill and Decode | Animation pace and reported figures are deliberately decoupled. |
| Cache simulator | Prompt Caching | Editing a block invalidates it and everything after it. |
| MCP cost | MCP | Tool-definition tokens per request against a skills baseline. |
| VRAM calculator | VRAM and RAM | Calibrated against a Llama-70B-class GQA layout. |

None of them make external requests; everything is computed in the page.

## Deployment

Pushing to `main` builds and publishes to GitHub Pages via
`.github/workflows/deploy.yml`. The repository needs **Settings → Pages →
Source: GitHub Actions** enabled once.

`base` in `astro.config.mjs` is `/llm-tutorial` — change it alongside the
repository name if that ever moves.
