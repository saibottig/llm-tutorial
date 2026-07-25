import { getCollection, type CollectionEntry } from 'astro:content';
import type { Locale } from '../i18n/ui';

export type Chapter = CollectionEntry<'chapters'>;

/** Entry ids are "<lang>/<slug>". */
export function splitId(id: string): { lang: string; slug: string } {
  const slash = id.indexOf('/');
  return { lang: id.slice(0, slash), slug: id.slice(slash + 1) };
}

export function slugOf(entry: Chapter): string {
  return splitId(entry.id).slug;
}

/** All chapters for one language, ordered by part then order. */
export async function getChapters(locale: Locale): Promise<Chapter[]> {
  const all = await getCollection('chapters', ({ id }) => splitId(id).lang === locale);
  return all.sort((a, b) => a.data.part - b.data.part || a.data.order - b.data.order);
}

export type Part = { part: number; chapters: Chapter[] };

/** Same chapters, grouped into their five parts for the sidebar and index. */
export async function getParts(locale: Locale): Promise<Part[]> {
  const chapters = await getChapters(locale);
  const parts: Part[] = [];
  for (const chapter of chapters) {
    let bucket = parts.find((p) => p.part === chapter.data.part);
    if (!bucket) {
      bucket = { part: chapter.data.part, chapters: [] };
      parts.push(bucket);
    }
    bucket.chapters.push(chapter);
  }
  return parts.sort((a, b) => a.part - b.part);
}

export function neighbours(chapters: Chapter[], slug: string) {
  const index = chapters.findIndex((c) => slugOf(c) === slug);
  return {
    index,
    previous: index > 0 ? chapters[index - 1] : undefined,
    next: index >= 0 && index < chapters.length - 1 ? chapters[index + 1] : undefined,
  };
}

/** Build a site URL honouring the configured `base`. */
export function url(...segments: string[]): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const path = segments
    .filter(Boolean)
    .map((s) => s.replace(/^\/|\/$/g, ''))
    .filter(Boolean)
    .join('/');
  return path ? `${base}/${path}/` : `${base}/`;
}

export const chapterUrl = (locale: string, slug: string) => url(locale, slug);
