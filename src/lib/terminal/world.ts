/**
 * The constants the terminal playground runs on: MCP server presets and the
 * session defaults. Pure data, no DOM and no Astro imports — the same module is
 * used in component frontmatter (build time) and inside `<script>` tags
 * (browser).
 *
 * Every figure here is an order of magnitude, not a measurement. They are kept
 * in one place so the playground and the MCP cost demo cannot drift apart:
 * both read `MCP_SERVERS` from here.
 */

export type McpServer = {
  id: string;
  name: string;
  /** Number of tool definitions the server contributes. */
  tools: number;
  /** Tokens those definitions occupy in the context — on every single request. */
  tokens: number;
  /** Whether the server starts enabled. */
  on: boolean;
};

/** Tool counts and definition sizes in the range you actually see in the wild. */
export const MCP_SERVERS: McpServer[] = [
  { id: 'jira', name: 'Jira', tools: 22, tokens: 4600, on: true },
  { id: 'confluence', name: 'Confluence', tools: 14, tokens: 3000, on: true },
  { id: 'bitbucket', name: 'Bitbucket', tools: 18, tokens: 3800, on: true },
  { id: 'filesystem', name: 'Filesystem', tools: 11, tokens: 1900, on: false },
  { id: 'postgres', name: 'Postgres', tools: 6, tokens: 1300, on: false },
  { id: 'browser', name: 'Browser', tools: 14, tokens: 3100, on: false },
  { id: 'sentry', name: 'Sentry', tools: 12, tokens: 2400, on: false },
];

/**
 * A skill keeps only its name and one-line description resident; the body is
 * read on demand. That header is roughly 30 tokens per capability — the figure
 * the scripted numbers are derived from, and the reason they agree: four skills
 * cost 120 tokens in `skills.json`, and the counter-calculation in `mcp.json`
 * prices the seven servers' 97 capabilities as skill headers at ~2,900. Change
 * this and both have to move with it.
 */
export const SKILL_HEADER_TOKENS = 30;

/**
 * Session defaults — the state a fresh `claude` invocation starts from, before
 * anyone has typed anything. What individual files cost to read is stated per
 * step in `transcript.json`, so those figures live in exactly one place.
 */
export const SESSION = {
  model: 'Opus 5',
  windowSize: 200_000,
  /** The harness system prompt: tool-use rules, environment, safety. */
  systemTokens: 2400,
  /** Project instructions read at startup. */
  claudeMdTokens: 1150,
  /** Built-in tools: Read, Edit, Write, Bash, Grep, Glob, Task, WebFetch … */
  builtinToolTokens: 3900,
} as const;

/**
 * Context is grouped into these buckets for `/context` and the meter. The order
 * is the order they sit in the request, which is what makes prefix caching
 * explicable: a change in one bucket invalidates it and everything after it.
 */
export const BLOCK_ORDER = ['system', 'tools', 'mcp', 'files', 'history', 'output'] as const;
export type BlockKind = (typeof BLOCK_ORDER)[number];

/** Colours for the meter, mapped to the tokens already used across the site. */
export const BLOCK_COLOR: Record<BlockKind, string> = {
  system: 'var(--text-faint)',
  tools: 'var(--info)',
  mcp: 'var(--warn)',
  files: 'var(--accent)',
  history: 'var(--accent-dim)',
  output: 'var(--danger)',
};
