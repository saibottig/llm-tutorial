# Handover

Stand: 25.07.2026 · Commit `b9c899f` · live unter
<https://saibottig.github.io/llm-tutorial/>

Dieses Dokument richtet sich an die Person (oder Session), die am Tutorial
weiterarbeitet. Es beschreibt, was da ist, wie es zusammenhängt, welche
Entscheidungen bewusst so getroffen wurden — und wo die offenen Enden liegen.

---

## 1. Was existiert

17 Kapitel in fünf Teilen, vollständig auf Deutsch und Englisch (je ~11.000
Wörter), sechs interaktive Demos, statischer Astro-Build auf GitHub Pages.

| # | Slug | DE | EN | Demo |
|---|---|---|---|---|
| 1.1 | `token` | Token | Tokens | Tokenizer |
| 1.2 | `context` | Context | Context | — |
| 1.3 | `context-window` | Context Window | Context Window | ContextWindow |
| 2.1 | `kv-cache` | KV-Cache | KV Cache | — |
| 2.2 | `prefill-decode` | Prefill und Decode | Prefill and Decode | PrefillDecode |
| 2.3 | `prompt-caching` | Prompt Caching | Prompt Caching | CacheSimulator |
| 2.4 | `vram-vs-ram` | VRAM und RAM | VRAM and RAM | VramCalculator |
| 3.1 | `tool-use` | Tool Use | Tool Use | — |
| 3.2 | `mcp` | MCP | MCP | McpCost |
| 3.3 | `skills` | Skills | Skills | — |
| 3.4 | `harness` | Harness | Harness | — |
| 4.1 | `agentic-workflows` | Agentische Workflows | Agentic Workflows | — |
| 4.2 | `multi-agent` | Multi-Agent-Orchestrierung | Multi-Agent Orchestration | — |
| 5.1 | `cost` | Kosten | Cost | — |
| 5.2 | `prompt-injection` | Prompt Injection | Prompt Injection | — |
| 5.3 | `hallucinations` | Halluzinationen | Hallucinations | — |
| 5.4 | `evals` | Evals | Evals | — |

Teil-Titel und alle UI-Strings stehen in `src/i18n/ui.ts`, nicht im Markup.

---

## 2. Loslegen

```bash
npm install          # Node >= 22.12 nötig (Astro 7)
npm run dev          # http://localhost:4321/llm-tutorial
npm run build        # Prüfskript + statischer Build nach dist/
npm run check        # nur das Prüfskript, ohne Build
npm run preview      # gebautes Ergebnis servieren
```

---

## 3. Wie es aufgebaut ist

### Kapitel als Content Collection

Kapitel liegen unter `src/content/chapters/<lang>/<slug>.mdx`. **Sprache und
Slug kommen aus dem Pfad** — sie stehen bewusst nicht zusätzlich im
Frontmatter, damit sie nicht auseinanderlaufen können. `src/lib/chapters.ts`
zerlegt die Entry-ID (`de/token`) wieder in beides.

```mdx
---
title: Prompt Caching
description: Ein Satz. Erscheint auf der Startseiten-Karte und als Meta-Description.
part: 2        # 1–5, steuert die Sidebar-Gruppierung
order: 3       # Position innerhalb des Teils
---
```

Die Kapitelnummer (01–17) wird **fortlaufend über alle Teile hinweg** aus
`part`/`order` berechnet, nicht gepflegt. Wer ein Kapitel einschiebt,
verschiebt nur `order` — die Nummerierung zieht überall nach.

### Routing

- `src/pages/index.astro` — Meta-Refresh auf `/de/`. Astros eingebauter
  i18n-Redirect wartet 2 Sekunden, was sich wie ein Hänger anfühlt; deshalb
  ist `redirectToDefaultLocale: false` gesetzt und die Seite selbst gebaut.
- `src/pages/[lang]/index.astro` — Startseite mit Kapitelkarten nach Teilen.
- `src/pages/[lang]/[slug].astro` — Kapitelseite, `getStaticPaths` über die
  Collection.

`base` ist `/llm-tutorial`. Alle internen Links laufen über `url()` /
`chapterUrl()` aus `src/lib/chapters.ts` — **nie** hartkodierte absolute Pfade
schreiben, sonst bricht es unter dem Base-Pfad.

### Callout und KeyTakeaway ohne Import

Beide sind pro Sprache vorgebunden (`src/components/mdx/CalloutDe.astro` usw.)
und werden in `[slug].astro` über die `components`-Prop an `<Content />`
gereicht. Deshalb funktioniert in jeder MDX-Datei direkt:

```mdx
<Callout type="korrektur">…</Callout>
<KeyTakeaway>
- Punkt eins
</KeyTakeaway>
```

Callout-Varianten: `merke` (türkis), `achtung` (amber), `korrektur` (rot),
`praxis` (blau). Die Beschriftung kommt aus `ui.ts` und ist sprachabhängig.

Markdown-Tabellen werden über dieselbe Prop in `Table.astro` gewrappt, damit
breite Tabellen in ihrem eigenen Kasten scrollen statt die Seite zu schieben.

### Demos

Demos werden **explizit importiert** — jede wird nur in genau einem Kapitel
verwendet, das lohnt keine Vorbindung:

```mdx
import VramCalculator from '../../../components/demos/VramCalculator.astro';

<VramCalculator locale="de" />
```

Gemeinsame Optik (`.demo`, `.stat`, `.field`, `.statusline`, `.stack`) liegt in
`src/styles/demos.css`. Demo-spezifisches CSS bleibt in der Komponente.

---

## 4. Das Build-Gate

`npm run build` führt zuerst `scripts/check-translations.mjs` aus. Der Build
bricht ab, wenn:

- ein Kapitel nur in einer Sprache existiert
- derselbe Slug in beiden Sprachen auf unterschiedlichem `part`/`order` liegt
- zwei Kapitel dieselbe Position belegen
- ein Querverweis `../slug/` auf einen nicht existierenden Slug zeigt
- ein Kapitel auf sich selbst verlinkt
- ein Pflichtfeld im Frontmatter fehlt

Das läuft auch in CI. Eine fehlende Übersetzung oder ein toter Link kann die
veröffentlichte Seite also nicht erreichen. Wer die Regeln erweitert: das
Skript ist bewusst abhängigkeitsfrei und liest Frontmatter per Regex — kein
Astro-Import nötig, damit es auch ohne Build läuft.

---

## 5. Inhaltliche Konventionen

Die Kapitel folgen einem Muster. Wer eines ergänzt, sollte es einhalten,
sonst fällt es auf:

**Aufbau.** Einstieg mit der konkreten Beobachtung oder Frage → Mechanik →
Demo (falls vorhanden) → praktische Konsequenzen → `<KeyTakeaway>` mit 4–5
Punkten. Keine Zusammenfassung am Anfang.

**Querverweise statt Wiederholung.** Jeder Begriff wird an genau einer Stelle
erklärt und sonst verlinkt. Wenn eine Erklärung zweimal auftaucht, gehört sie
in ein eigenes Kapitel.

**Zahlen werden gemessen, nicht behauptet.** Alle konkreten Werte im Tutorial
sind entweder zur Build-Zeit berechnet (Tokenizer-Demo) oder gegen eine
Referenzkonfiguration kalibriert (VRAM-Rechner). Wo keine Quelle vorlag, steht
eine Größenordnung mit dem ausdrücklichen Hinweis, selbst zu messen — siehe
Multi-Agent-Kosten. **Diese Linie bitte halten.** Sie ist der Grund, warum das
Tutorial an drei Stellen von der verbreiteten Darstellung abweicht.

**Korrekturen sind explizit.** Wo gängige Aussagen nicht stimmen, steht ein
`<Callout type="korrektur">`, der die verbreitete Version benennt und dann
richtigstellt. Nicht stillschweigend anders schreiben.

### Die drei bewussten Abweichungen

Falls jemand meint, das sei ein Fehler — es ist keiner:

1. **Token / „hängt vom Server ab"** (`token`). Die Tokenisierung kommt vom
   Tokenizer des Modells und ist fix. Vom Betreiber hängt die *nutzbare
   Kontextlänge* ab. Zusätzlich: Die Regel „Deutsch kostet 2–3×" stammt aus der
   Zeit älterer Tokenizer. Gemessen: **+16 %** mit `o200k_base`, **+53 %** mit
   `cl100k_base`. Die Demo rechnet beides beim Bauen aus.
2. **Skills ≠ „bereinigte MCPs"** (`skills`). MCP ist ein Anbindungsprotokoll
   mit Prozess, Auth und Zustand; ein Skill ist Vorgehenswissen in einem
   Ordner. Sie ergänzen sich.
3. **Multi-Agent-Kosten** (`multi-agent`). Sub-Agenten sind primär
   *Context-Isolation*: mehr Tokens insgesamt, aber **weniger** Pollution im
   Hauptthread — nicht mehr, wie oft behauptet.

---

## 6. Fallstricke (schon einmal reingelaufen)

**`define:vars` bricht dynamische Imports.** Ein Script-Tag mit `define:vars`
ist implizit `is:inline` und wird von Vite nicht verarbeitet. Ein
`import('paket')` darin bleibt als Bare-Specifier im HTML stehen und schlägt im
Browser fehl. Lösung im Tokenizer: Strings über `data-`-Attribute
durchreichen, Script normal lassen. **Wer eine Demo mit Lazy-Import baut, muss
das beachten.**

**Node-Version in CI.** `withastro/action@v3` läuft per Default auf Node 20,
Astro 7 verlangt ≥ 22.12 und bricht ab statt zu warnen. Im Workflow ist
`node-version: 22` gesetzt, in `package.json` steht `engines`. Beide zusammen
halten.

**GitHub Pages Environment.** Die `github-pages`-Environment erlaubt
standardmäßig nur den Default-Branch. Als `main` noch nicht Default war,
scheiterte der Deploy-Job in 2 Sekunden ohne Runner und ohne Log — kein
Job-Fehler, sondern eine blockierte Freigabe. Falls das Muster wieder auftritt:
Settings → Environments → `github-pages` → Deployment branches prüfen.

**Kein `sleep` im Vordergrund.** In dieser Umgebung ist blockierendes `sleep`
gesperrt; Warteschleifen gehören in einen Hintergrund-Task.

---

## 7. Offene Punkte

**Quelle für „2,6× Multi-Agent-Kosten".** Die Zahl stand in der ursprünglichen
Themenliste, ohne Beleg. Im Kapitel steht deshalb eine Spannbreite. Wenn die
Quelle auftaucht: `multi-agent.mdx`, Abschnitt „Was es kostet" — eine Zeile,
in beiden Sprachen.

**Keine Tests für die Demos.** Verifiziert wurde einmalig per Playwright-Skript
(alle 34 Seiten, Querverweise, Prev/Next-Kette, Sprachumschalter,
Demo-Initialisierung, 375 px). Das Skript ist nicht eingecheckt. Wer die Demos
umbaut, sollte es neu aufsetzen — oder als Playwright-Test dauerhaft
einchecken. Das wäre die sinnvollste nächste Investition.

**Kein Suchfeld.** Bei 17 Kapiteln verschmerzbar, ab ~25 nicht mehr. Pagefind
lässt sich in einen Astro-Build ohne Server einhängen.

---

## 8. Ideen für den Ausbau

Bewusst nicht enthalten, weil der Umfang so zugeschnitten wurde. In grober
Reihenfolge des Nutzens:

| Thema | Wohin | Warum |
|---|---|---|
| RAG & Embeddings | neuer Teil oder 3.5 | Größte inhaltliche Lücke. Chunking, Vektorsuche, „RAG oder langer Context?" |
| Sampling & Temperature | 1.4 | Erklärt Nicht-Determinismus, auf den sich das Evals-Kapitel bereits beruft |
| Reasoning-/Thinking-Modelle | 2.5 | Thinking-Tokens sind Kosten- und Latenzfaktor, kommen aktuell nirgends vor |
| Quantisierung im Detail | 2.5 | Aktuell nur ein Absatz in `vram-vs-ram`; verdient mehr |
| Structured Output / JSON | 3.5 | Praktisch sehr relevant, technisch nah an Tool Use |
| Fine-Tuning vs. Prompting vs. RAG | 5.5 | Entscheidungsbaum, guter Abschluss |
| Context Engineering als Kapitel | 4.3 | Klammert Compaction, Sub-Agents, Skills zusammen — aktuell verteilt |

Nicht-inhaltliche Ideen: Volltextsuche (Pagefind), Glossar mit Tooltips über
`ui.ts`, Druck-Stylesheet, RSS für neue Kapitel, `og:image` je Kapitel.

**Beim Hinzufügen eines Kapitels nicht vergessen:** beide Sprachen, gleicher
Slug, gleiches `part`/`order`. Das Prüfskript erinnert daran, aber erst beim
Build.

---

## 9. Deployment

Push auf `main` → `.github/workflows/deploy.yml` → GitHub Pages.
Voraussetzung im Repo: Settings → Pages → Source: **GitHub Actions**, und
`main` muss für die `github-pages`-Environment freigegeben sein (als
Default-Branch automatisch).

`base: '/llm-tutorial'` in `astro.config.mjs` hängt am Repository-Namen — bei
Umbenennung mitziehen.
