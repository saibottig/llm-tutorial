#!/usr/bin/env node
/**
 * Build gate: every chapter must exist in both languages under the same slug,
 * and every (part, order) pair must be unique within a language. A missing
 * translation would otherwise surface as a 404 only when someone hits the
 * language switch.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = new URL('../src/content/chapters', import.meta.url).pathname;
const LOCALES = ['de', 'en'];

const problems = [];

async function slugsFor(locale) {
  let files;
  try {
    files = await readdir(join(ROOT, locale));
  } catch {
    problems.push(`Missing chapter directory for locale "${locale}".`);
    return new Map();
  }
  const entries = new Map();
  for (const file of files.filter((f) => f.endsWith('.mdx'))) {
    const slug = file.replace(/\.mdx$/, '');
    const raw = await readFile(join(ROOT, locale, file), 'utf8');
    const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fm) {
      problems.push(`${locale}/${file}: no frontmatter block.`);
      continue;
    }
    const get = (key) => fm[1].match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]?.trim();
    const part = Number(get('part'));
    const order = Number(get('order'));
    if (!get('title')) problems.push(`${locale}/${file}: missing "title".`);
    if (!get('description')) problems.push(`${locale}/${file}: missing "description".`);
    if (!Number.isInteger(part)) problems.push(`${locale}/${file}: "part" must be an integer.`);
    if (!Number.isInteger(order)) problems.push(`${locale}/${file}: "order" must be an integer.`);
    entries.set(slug, { part, order });
  }
  return entries;
}

const byLocale = Object.fromEntries(
  await Promise.all(LOCALES.map(async (l) => [l, await slugsFor(l)])),
);

// Same slug set across every locale.
const [reference, ...others] = LOCALES;
for (const other of others) {
  for (const slug of byLocale[reference].keys()) {
    if (!byLocale[other].has(slug)) problems.push(`${other}/${slug}.mdx is missing (exists in ${reference}).`);
  }
  for (const slug of byLocale[other].keys()) {
    if (!byLocale[reference].has(slug)) problems.push(`${reference}/${slug}.mdx is missing (exists in ${other}).`);
  }
}

// Unique, gap-free ordering within each part.
for (const locale of LOCALES) {
  const seen = new Map();
  for (const [slug, { part, order }] of byLocale[locale]) {
    const key = `${part}.${order}`;
    if (seen.has(key)) problems.push(`${locale}: ${slug} and ${seen.get(key)} share part ${part} order ${order}.`);
    seen.set(key, slug);
  }
  // Chapters must agree on part/order across locales, so the reading order matches.
  if (locale !== reference) {
    for (const [slug, pos] of byLocale[locale]) {
      const ref = byLocale[reference].get(slug);
      if (ref && (ref.part !== pos.part || ref.order !== pos.order)) {
        problems.push(
          `${slug}: position differs between ${reference} (${ref.part}.${ref.order}) and ${locale} (${pos.part}.${pos.order}).`,
        );
      }
    }
  }
}

// Cross-references between chapters are written as ../<slug>/ — a typo there
// would only surface as a 404 for whoever clicks it.
for (const locale of LOCALES) {
  for (const slug of byLocale[locale].keys()) {
    const raw = await readFile(join(ROOT, locale, `${slug}.mdx`), 'utf8');
    for (const [, target] of raw.matchAll(/\]\(\.\.\/([a-z0-9-]+)\/\)/g)) {
      if (!byLocale[locale].has(target)) {
        problems.push(`${locale}/${slug}.mdx links to ../${target}/ which does not exist.`);
      }
      if (target === slug) {
        problems.push(`${locale}/${slug}.mdx links to itself.`);
      }
    }
  }
}

/* ── Terminal scripts ────────────────────────────────────────────────────
   Every chapter's terminal carries as much prose as a short chapter, and none
   of it sits in the content collection, so the checks above cannot see it.
   The scripts are JSON rather than TypeScript precisely so this
   dependency-free script can read them: every object with a `de` key must
   carry a non-empty `en` next to it. */

// The server ids live in world.ts, which this script cannot import — it stays
// dependency-free so it runs without a build. A regex over the literal is
// enough, and a rename that breaks it surfaces here rather than in the browser.
const WORLD = new URL('../src/lib/terminal/world.ts', import.meta.url).pathname;
const SERVER_IDS = new Set(
  [...(await readFile(WORLD, 'utf8')).matchAll(/\{\s*id:\s*'([a-z-]+)'/g)].map((m) => m[1]),
);
if (!SERVER_IDS.size) problems.push('world.ts: could not read any MCP server ids.');

const SCRIPTS = new URL('../src/lib/terminal/scripts', import.meta.url).pathname;
const scripts = new Map();
try {
  for (const file of (await readdir(SCRIPTS)).filter((f) => f.endsWith('.json'))) {
    scripts.set(file, JSON.parse(await readFile(join(SCRIPTS, file), 'utf8')));
  }
} catch (error) {
  problems.push(`terminal scripts could not be read: ${error.message}`);
}

function walkTranslations(node, path, file) {
  if (Array.isArray(node)) {
    node.forEach((item, i) => walkTranslations(item, `${path}[${i}]`, file));
    return;
  }
  if (!node || typeof node !== 'object') return;

  if (LOCALES.some((l) => l in node)) {
    for (const locale of LOCALES) {
      const value = node[locale];
      if (typeof value !== 'string' || !value.trim()) {
        problems.push(`${file} ${path}: missing or empty "${locale}".`);
      }
    }
    return;
  }
  for (const [key, value] of Object.entries(node)) walkTranslations(value, `${path}.${key}`, file);
}

// Kept in step with the switch in engine.ts — a scenario replaying a command
// nothing answers would look broken to a reader without failing anywhere.
const SLASH = new Set([
  'context',
  'cache',
  'compact',
  'clear',
  'tokens',
  'mcp',
  'permissions',
  'model',
  'help',
]);
const STEP_TYPES = new Set([
  'assistant',
  'note',
  'out',
  'tool',
  'subagent',
  'generate',
  'invalidate',
  'chips',
  'compare',
  'meter',
  'cache',
  'clear',
  'compact',
  'mcp',
  'rule',
]);

function checkSteps(steps, where, file, ruleIds) {
  for (const [i, step] of (steps ?? []).entries()) {
    const at = `${where}[${i}]`;
    if (!STEP_TYPES.has(step.type)) {
      problems.push(`${file} ${at}: unknown step type "${step.type}".`);
      continue;
    }
    if (step.type === 'rule' && ruleIds.size && !ruleIds.has(step.id)) {
      problems.push(`${file} ${at}: toggles unknown rule "${step.id}".`);
    }
    if (step.type === 'subagent') checkSteps(step.steps, `${at}.steps`, file, ruleIds);
  }
}

for (const [file, script] of scripts) {
  walkTranslations(script, 'script', file);

  const ruleIds = new Set((script.rules ?? []).map((r) => r.id));
  const intents = script.intents ?? [];

  for (const intent of intents) {
    if (!(intent.match ?? []).length) {
      problems.push(`${file} intent "${intent.id}": no match keywords.`);
    }
    checkSteps(intent.steps, `intent "${intent.id}"`, file, ruleIds);
  }
  checkSteps(script.fallback, 'fallback', file, ruleIds);

  for (const scenario of script.scenarios ?? []) {
    if (!(scenario.commands ?? []).length) {
      problems.push(`${file} scenario "${scenario.id}": no commands.`);
    }
    for (const command of scenario.commands ?? []) {
      // A neutral string is one command, not one per language.
      const variants =
        typeof command === 'string' ? [['*', command]] : LOCALES.map((l) => [l, command[l]]);
      for (const [locale, line] of variants) {
        if (typeof line !== 'string') continue;
        if (line.startsWith('/')) {
          const name = line.slice(1).trim().split(/\s+/)[0];
          // Either a built-in, or a project command the script defines itself.
          if (!SLASH.has(name) && !intents.some((intent) => intent.command === name)) {
            problems.push(`${file} scenario "${scenario.id}": unknown command /${name}.`);
          }
          continue;
        }
        const needle = line.toLowerCase();
        if (!intents.some((intent) => (intent.match ?? []).some((m) => needle.includes(m)))) {
          problems.push(
            `${file} scenario "${scenario.id}" (${locale}): "${line}" matches no intent — it would fall through to the fallback.`,
          );
        }
      }
    }
    for (const server of Object.keys(scenario.mcp ?? {})) {
      if (!SERVER_IDS.has(server)) {
        problems.push(`${file} scenario "${scenario.id}": unknown MCP server "${server}".`);
      }
    }
    for (const rule of Object.keys(scenario.rules ?? {})) {
      if (!ruleIds.has(rule)) {
        problems.push(`${file} scenario "${scenario.id}": unknown rule "${rule}".`);
      }
    }
  }
}

// Every chapter must have a terminal script, or its page would fail to build.
for (const slug of byLocale[reference].keys()) {
  if (!scripts.has(`${slug}.json`)) {
    problems.push(`src/lib/terminal/scripts/${slug}.json is missing (chapter "${slug}" exists).`);
  }
}

const count = byLocale[reference].size;
if (problems.length) {
  console.error('\n✗ Chapter check failed:\n');
  for (const p of problems) console.error(`  • ${p}`);
  console.error('');
  process.exit(1);
}

const scenarioCount = [...scripts.values()].reduce((n, s) => n + (s.scenarios?.length ?? 0), 0);
console.log(
  `✓ Chapter check passed — ${count} chapters × ${LOCALES.length} locales, ` +
    `${scripts.size} terminal scripts with ${scenarioCount} scenarios.`,
);
