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
    'nav.previous': 'Zurück',
    'nav.next': 'Weiter',
    'nav.menu': 'Menü',
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
    'nav.previous': 'Previous',
    'nav.next': 'Next',
    'nav.menu': 'Menu',
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
