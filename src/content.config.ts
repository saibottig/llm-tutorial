import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Chapter files live at src/content/chapters/<lang>/<slug>.mdx, so the
// generated entry id is "<lang>/<slug>" — language and slug are derived from
// the path rather than duplicated in frontmatter.
const chapters = defineCollection({
  loader: glob({ base: './src/content/chapters', pattern: '**/*.mdx' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    /** 1 = Grundlagen … 5 = Praxis. Drives the sidebar grouping. */
    part: z.number().int().min(1).max(5),
    /** Position within the part. */
    order: z.number().int().min(1),
  }),
});

export const collections = { chapters };
