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

const count = byLocale[reference].size;
if (problems.length) {
  console.error('\n✗ Chapter check failed:\n');
  for (const p of problems) console.error(`  • ${p}`);
  console.error('');
  process.exit(1);
}

console.log(`✓ Chapter check passed — ${count} chapters × ${LOCALES.length} locales.`);
