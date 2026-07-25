export const locales = ['de', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'de';

export function isLocale(value: string | undefined): value is Locale {
  return locales.includes(value as Locale);
}

/**
 * Every UI string on the site. Chapter prose lives in MDX; anything rendered by
 * a component — navigation, demo labels, button text — is looked up here so the
 * interactive demos exist once rather than once per language.
 */
export const ui = {
  de: {
    'site.title': 'Claude-Code-Tutorial',
    'site.tagline': 'Claude Code im Entwicklungsalltag — Token, Context, Kosten und Workflows',
    'site.description':
      'Ein praxisnahes Tutorial für Entwicklungsteams: wie Claude Code arbeitet, was es kostet und wie man es in Spring-Boot- und Angular-Projekten produktiv einsetzt.',

    'nav.chapters': 'Kapitel',
    'nav.overview': 'Übersicht',
    'nav.previous': 'Zurück',
    'nav.next': 'Weiter',
    'nav.menu': 'Menü',
    'nav.close': 'Schließen',
    'nav.toTop': 'Nach oben',
    'nav.language': 'Sprache',
    'nav.chapterCount': 'Kapitel',
    'nav.start': 'Beim ersten Kapitel anfangen',
    'nav.playground': 'Playground',

    'part.1': 'Grundlagen',
    'part.2': 'Was eine Anfrage kostet',
    'part.3': 'Claude Code als Werkzeug',
    'part.4': 'Workflows im Team',
    'part.5': 'Kosten, Qualität, Sicherheit',
    'part.1.blurb': 'Was Claude Code bei jeder Anfrage tatsächlich an das Modell schickt.',
    'part.2.blurb': 'Warum Antworten Geld und Zeit kosten — und wovon das abhängt.',
    'part.3.blurb': 'Das Werkzeug verstehen: Harness, CLAUDE.md, Tools, MCP und Skills.',
    'part.4.blurb': 'Vom Unit-Test bis zum Pull Request — wiederholbare Abläufe im Team.',
    'part.5.blurb': 'Kostenbewusst arbeiten, Qualität sichern, Risiken kennen.',

    'callout.merke': 'Merke',
    'callout.achtung': 'Achtung',
    'callout.korrektur': 'Häufiges Missverständnis',
    'callout.praxis': 'Aus der Praxis',
    'takeaway.title': 'Das Wichtigste',
    'deep.label': 'Hintergrund — nur bei Interesse',

    'demo.title': 'Zum Ausprobieren',
    'demo.reset': 'Zurücksetzen',

    'tokenizer.title': 'Tokenizer live',
    'tokenizer.intro':
      'Die Beispiele unten sind vorberechnet. Für eigenen Text lädt der echte Tokenizer nach (~1 MB) — bewusst erst auf Klick.',
    'tokenizer.load': 'Tokenizer laden und eigenen Text testen',
    'tokenizer.loading': 'Lade Tokenizer …',
    'tokenizer.placeholder': 'Eigenen Text eingeben …',
    'tokenizer.tokens': 'Tokens',
    'tokenizer.chars': 'Zeichen',
    'tokenizer.ratio': 'Zeichen pro Token',
    'tokenizer.error': 'Tokenizer konnte nicht geladen werden.',

    'ctx.title': 'Context Window füllen',
    'ctx.system': 'System-Prompt',
    'ctx.tools': 'Tool-Definitionen',
    'ctx.history': 'Chatverlauf',
    'ctx.message': 'Aktuelle Nachricht',
    'ctx.free': 'Frei',
    'ctx.turns': 'Gesprächsrunden',
    'ctx.mcpServers': 'Aktive MCP-Server',
    'ctx.windowSize': 'Context Window',
    'ctx.compact': 'Verlauf komprimieren',
    'ctx.compacted': 'Verlauf komprimiert — ältere Runden wurden zusammengefasst.',
    'ctx.overflow': 'Context Window übergelaufen. Ohne Compaction bricht die Anfrage hier ab.',
    'ctx.used': 'belegt',

    'pd.title': 'Prefill und Decode',
    'pd.play': 'Abspielen',
    'pd.replay': 'Nochmal',
    'pd.prefill': 'Prefill',
    'pd.decode': 'Decode',
    'pd.prefillNote': 'Alle Prompt-Tokens gleichzeitig — rechenlastig, aber parallel.',
    'pd.decodeNote': 'Ein Token nach dem anderen — jedes Mal das ganze Modell aus dem Speicher.',
    'pd.ttft': 'Zeit bis zum ersten Token',
    'pd.speed': 'Ausgabegeschwindigkeit',
    'pd.promptLen': 'Prompt-Länge',
    'pd.animNote':
      'Die Animation läuft bewusst verlangsamt. Die angezeigten Werte sind realistische Größenordnungen für ein mittelgroßes Modell auf einer GPU.',

    'cache.title': 'Prompt-Caching-Simulator',
    'cache.hit': 'Aus dem Cache gelesen',
    'cache.miss': 'Neu berechnet',
    'cache.edit': 'Ändern',
    'cache.edited': 'geändert',
    'cache.breakpoint': 'Cache-Breakpoint',
    'cache.cost': 'Kosten dieser Anfrage',
    'cache.vsUncached': 'gegenüber ungecacht',
    'cache.reset': 'Alles zurücksetzen',
    'cache.explainHit': 'Alles vor der Änderung bleibt gültig.',
    'cache.explainMiss':
      'Ein Block wurde geändert — alles ab dieser Stelle muss neu berechnet werden, auch wenn es selbst unverändert ist.',

    'mcp.title': 'Was MCP-Server im Context kosten',
    'mcp.servers': 'MCP-Server',
    'mcp.tools': 'Tools',
    'mcp.tokens': 'Tokens im Context',
    'mcp.perRequest': 'pro Anfrage — bei jeder einzelnen',
    'mcp.share': 'des Context Windows',
    'mcp.skillsCompare': 'Dieselbe Funktionalität als Skills',
    'mcp.savings': 'Ersparnis',
    'mcp.allOn': 'Alle an',
    'mcp.allOff': 'Alle aus',

    'term.title': 'Simulierte Claude-Code-Sitzung',
    'term.placeholder': 'Prompt eingeben oder /help …',
    'term.run': 'Ausführen',
    'term.reset': 'Sitzung zurücksetzen',
    'term.scenarios': 'Szenarien',
    'term.servers': 'MCP-Server',
    'term.context': 'Context',
    'term.tool': 'Tool-Aufruf',
    'term.tools': 'Tool-Aufrufe',
    'term.turn': 'Runde',
    'term.turns': 'Runden',
    'term.permission': 'Freigabe nötig',
    'term.allow': 'Erlauben (y)',
    'term.deny': 'Ablehnen (n)',
    'term.allowed': 'Erlaubt',
    'term.denied': 'Abgelehnt',
    'term.skip': 'Esc überspringt die Animation',
    'term.exact': 'Eingaben exakt tokenisieren',
    'term.exactLoading': 'Lade Tokenizer …',
    'term.exactDone': 'Eingaben werden exakt tokenisiert (o200k_base).',
    'term.exactError': 'Tokenizer konnte nicht geladen werden — Schätzung bleibt aktiv.',
    'term.openFull': 'Im vollen Playground weiterspielen →',
    'term.note':
      'Simulation: Die Tool-Ausgaben sind hinterlegt, kein Modell und kein Server werden angefragt. Die Token-Zahlen sind realistische Größenordnungen aus dem Tutorial, keine Live-Messung; eigene Eingaben werden geschätzt (≈), bis der echte Tokenizer geladen ist.',

    'playground.title': 'Playground',
    'playground.tagline': 'Eine Claude-Code-Sitzung zum Anfassen — ohne Installation, ohne Kosten',
    'playground.description':
      'Simulierte Claude-Code-Sitzung im Browser: Prompts eingeben, Tool-Aufrufe und Freigaben beobachten, MCP-Server zuschalten und live sehen, wie sich das Context Window füllt.',
    'playground.intro':
      'Tippe Prompts, wie du sie im Terminal eingeben würdest, oder Slash-Commands wie /context und /compact. Der Agent antwortet aus einem hinterlegten Skript — er ruft kein Modell auf. Interessant ist die Statusline unten: Sie zeigt bei jedem Schritt, was der Context gerade kostet.',
    'playground.hintsTitle': 'Tastatur',
    'playground.hints':
      '↑ ↓ Verlauf · Tab vervollständigt Slash-Commands · Esc bricht die laufende Ausgabe ab',
    'playground.chapters': 'Passt zu diesen Kapiteln',

    'footer.builtWith': 'Gebaut mit Astro.',
    'footer.source': 'Quellcode',
  },

  en: {
    'site.title': 'Claude Code Tutorial',
    'site.tagline': 'Claude Code in day-to-day development — tokens, context, cost and workflows',
    'site.description':
      'A practical tutorial for development teams: how Claude Code works, what it costs, and how to use it productively in Spring Boot and Angular projects.',

    'nav.chapters': 'Chapters',
    'nav.overview': 'Overview',
    'nav.previous': 'Previous',
    'nav.next': 'Next',
    'nav.menu': 'Menu',
    'nav.close': 'Close',
    'nav.toTop': 'Back to top',
    'nav.language': 'Language',
    'nav.chapterCount': 'chapters',
    'nav.start': 'Start with the first chapter',
    'nav.playground': 'Playground',

    'part.1': 'Fundamentals',
    'part.2': 'What a Request Costs',
    'part.3': 'Claude Code as a Tool',
    'part.4': 'Team Workflows',
    'part.5': 'Cost, Quality, Safety',
    'part.1.blurb': 'What Claude Code actually sends to the model on every request.',
    'part.2.blurb': 'Why answers cost money and time — and what drives it.',
    'part.3.blurb': 'Understanding the tool: harness, CLAUDE.md, tools, MCP and skills.',
    'part.4.blurb': 'From unit tests to pull requests — repeatable workflows for the team.',
    'part.5.blurb': 'Working cost-consciously, assuring quality, knowing the risks.',

    'callout.merke': 'Key point',
    'callout.achtung': 'Watch out',
    'callout.korrektur': 'Common misconception',
    'callout.praxis': 'In practice',
    'takeaway.title': 'Takeaways',
    'deep.label': 'Background — if you want the details',

    'demo.title': 'Try it',
    'demo.reset': 'Reset',

    'tokenizer.title': 'Live tokenizer',
    'tokenizer.intro':
      'The examples below are precomputed. To tokenize your own text the real tokenizer loads on demand (~1 MB) — deliberately only on click.',
    'tokenizer.load': 'Load tokenizer and try your own text',
    'tokenizer.loading': 'Loading tokenizer …',
    'tokenizer.placeholder': 'Type your own text …',
    'tokenizer.tokens': 'tokens',
    'tokenizer.chars': 'characters',
    'tokenizer.ratio': 'characters per token',
    'tokenizer.error': 'Could not load the tokenizer.',

    'ctx.title': 'Filling a context window',
    'ctx.system': 'System prompt',
    'ctx.tools': 'Tool definitions',
    'ctx.history': 'Conversation history',
    'ctx.message': 'Current message',
    'ctx.free': 'Free',
    'ctx.turns': 'Conversation turns',
    'ctx.mcpServers': 'Active MCP servers',
    'ctx.windowSize': 'Context window',
    'ctx.compact': 'Compact history',
    'ctx.compacted': 'History compacted — older turns were summarised.',
    'ctx.overflow': 'Context window overflowed. Without compaction the request fails here.',
    'ctx.used': 'used',

    'pd.title': 'Prefill and decode',
    'pd.play': 'Play',
    'pd.replay': 'Replay',
    'pd.prefill': 'Prefill',
    'pd.decode': 'Decode',
    'pd.prefillNote': 'All prompt tokens at once — compute-heavy, but parallel.',
    'pd.decodeNote': 'One token at a time — reading the whole model from memory for each.',
    'pd.ttft': 'Time to first token',
    'pd.speed': 'Output speed',
    'pd.promptLen': 'Prompt length',
    'pd.animNote':
      'The animation is deliberately slowed down. The figures shown are realistic orders of magnitude for a mid-sized model on one GPU.',

    'cache.title': 'Prompt caching simulator',
    'cache.hit': 'Read from cache',
    'cache.miss': 'Recomputed',
    'cache.edit': 'Edit',
    'cache.edited': 'edited',
    'cache.breakpoint': 'Cache breakpoint',
    'cache.cost': 'Cost of this request',
    'cache.vsUncached': 'vs. uncached',
    'cache.reset': 'Reset everything',
    'cache.explainHit': 'Everything before the change stays valid.',
    'cache.explainMiss':
      'One block changed — everything from that point on must be recomputed, even the parts that did not change themselves.',

    'mcp.title': 'What MCP servers cost you in context',
    'mcp.servers': 'MCP servers',
    'mcp.tools': 'tools',
    'mcp.tokens': 'tokens in context',
    'mcp.perRequest': 'per request — on every single one',
    'mcp.share': 'of the context window',
    'mcp.skillsCompare': 'The same capability as skills',
    'mcp.savings': 'Saved',
    'mcp.allOn': 'All on',
    'mcp.allOff': 'All off',

    'term.title': 'Simulated Claude Code session',
    'term.placeholder': 'Type a prompt or /help …',
    'term.run': 'Run',
    'term.reset': 'Reset session',
    'term.scenarios': 'Scenarios',
    'term.servers': 'MCP servers',
    'term.context': 'Context',
    'term.tool': 'tool call',
    'term.tools': 'tool calls',
    'term.turn': 'turn',
    'term.turns': 'turns',
    'term.permission': 'Approval needed',
    'term.allow': 'Allow (y)',
    'term.deny': 'Deny (n)',
    'term.allowed': 'Allowed',
    'term.denied': 'Denied',
    'term.skip': 'Esc skips the animation',
    'term.exact': 'Tokenize input exactly',
    'term.exactLoading': 'Loading tokenizer …',
    'term.exactDone': 'Input is tokenized exactly (o200k_base).',
    'term.exactError': 'Could not load the tokenizer — the estimate stays active.',
    'term.openFull': 'Keep playing in the full playground →',
    'term.note':
      'Simulated: tool output is scripted, no model and no server is called. The token figures are realistic orders of magnitude taken from the tutorial, not a live measurement; your own input is estimated (≈) until the real tokenizer is loaded.',

    'playground.title': 'Playground',
    'playground.tagline': 'A hands-on Claude Code session — no install, no cost',
    'playground.description':
      'A simulated Claude Code session in the browser: type prompts, watch tool calls and approvals, switch MCP servers on and see the context window fill up live.',
    'playground.intro':
      'Type prompts the way you would in the terminal, or slash commands like /context and /compact. The agent answers from a script — it never calls a model. The interesting part is the status line at the bottom: it shows what the context costs at every step.',
    'playground.hintsTitle': 'Keyboard',
    'playground.hints':
      '↑ ↓ history · Tab completes slash commands · Esc aborts the running output',
    'playground.chapters': 'Goes with these chapters',

    'footer.builtWith': 'Built with Astro.',
    'footer.source': 'Source',
  },
} as const;

export type UIKey = keyof (typeof ui)['de'];

export function t(locale: Locale) {
  return (key: UIKey): string => ui[locale][key] ?? ui[defaultLocale][key] ?? key;
}
