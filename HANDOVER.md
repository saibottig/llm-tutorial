# Handover

Stand: 25.07.2026 · live unter <https://saibottig.github.io/llm-tutorial/>

Dieses Dokument richtet sich an die Person (oder Session), die am Tutorial
weiterarbeitet. Es beschreibt, was da ist, wie es zusammenhängt, welche
Entscheidungen bewusst so getroffen wurden — und wo die offenen Enden liegen.

---

## 1. Was existiert

Ein Claude-Code-Tutorial für Entwicklungsteams in einem
Container-Terminal-Softwareunternehmen (Java/Spring Boot, Angular,
Jira/Confluence/Bitbucket): 20 Kapitel in fünf Teilen, vollständig auf Deutsch
und Englisch, fünf interaktive Demos, statischer Astro-Build auf GitHub Pages.

Das Tutorial war ursprünglich ein allgemeines LLM-Grundlagen-Tutorial und
wurde im Juli 2026 um Claude Code als roten Faden herum umgebaut: Die
technischen Grundlagenkapitel blieben erhalten und wurden auf die Zielgruppe
zugeschnitten, fünf Kapitel kamen neu dazu (`claude-code`, `setup`,
`unit-tests`, `atlassian`, `use-cases`), zwei entfielen (`vram-vs-ram` samt
Demo; `harness`, dessen Inhalt im Kapitel `claude-code` aufging).

| # | Slug | DE | EN | Demo |
|---|---|---|---|---|
| 1.1 | `token` | Token | Tokens | Tokenizer |
| 1.2 | `context` | Context | Context | — |
| 1.3 | `context-window` | Context Window | Context Window | ContextWindow |
| 2.1 | `kv-cache` | KV-Cache | KV Cache | — |
| 2.2 | `prefill-decode` | Prefill und Decode | Prefill and Decode | PrefillDecode |
| 2.3 | `prompt-caching` | Prompt Caching | Prompt Caching | CacheSimulator |
| 3.1 | `claude-code` | Claude Code | Claude Code | — |
| 3.2 | `setup` | Projekt-Setup: CLAUDE.md und Permissions | Project Setup | — |
| 3.3 | `tool-use` | Tool Use | Tool Use | — |
| 3.4 | `mcp` | MCP | MCP | McpCost |
| 3.5 | `skills` | Skills | Skills | — |
| 4.1 | `unit-tests` | Der erste Anwendungsfall: Unit-Tests | The First Use Case: Unit Tests | — |
| 4.2 | `agentic-workflows` | Agentische Workflows | Agentic Workflows | — |
| 4.3 | `atlassian` | Ticket zu Pull Request | Ticket to Pull Request | — |
| 4.4 | `multi-agent` | Multi-Agent-Orchestrierung | Multi-Agent Orchestration | — |
| 5.1 | `cost` | Kostenbewusst arbeiten | Working Cost-Consciously | — |
| 5.2 | `use-cases` | Anwendungsfälle finden | Finding Use Cases | — |
| 5.3 | `prompt-injection` | Prompt Injection | Prompt Injection | — |
| 5.4 | `hallucinations` | Halluzinationen | Hallucinations | — |
| 5.5 | `evals` | Evals | Evals | — |

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

Die Kapitelnummer (01–20) wird **fortlaufend über alle Teile hinweg** aus
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

Ebenfalls vorgebunden: `<Deep title="…">` — ein `<details>`-Ausklapper für
Hintergrund und Herleitungen (`src/components/Deep.astro`, Label-Fallback aus
`ui.ts` unter `deep.label`). Er hält den Haupttext kurz, ohne Substanz zu
löschen.

Markdown-Tabellen werden über dieselbe Prop in `Table.astro` gewrappt, damit
breite Tabellen in ihrem eigenen Kasten scrollen statt die Seite zu schieben.

### Demos

Demos werden **explizit importiert** — jede wird nur in genau einem Kapitel
verwendet, das lohnt keine Vorbindung:

```mdx
import CacheSimulator from '../../../components/demos/CacheSimulator.astro';

<CacheSimulator locale="de" />
```

Gemeinsame Optik (`.demo`, `.stat`, `.field`, `.statusline`, `.stack`) liegt in
`src/styles/demos.css`. Demo-spezifisches CSS bleibt in der Komponente.

Die Server-Presets der McpCost-Demo (Jira, Confluence, Bitbucket, …) sind
Daten in der Komponente selbst, keine ui.ts-Strings.

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

**Aufbau.** Einstieg mit der **Kernaussage in 1–2 Sätzen** (keine
rhetorische Aufwärmung, keine Anekdote) → Mechanik → Demo (falls vorhanden) →
praktische Konsequenzen → `<KeyTakeaway>` mit 4–5 Punkten.

**Informationsdichte.** Der Verdichtungspass vom Juli 2026 hat die Kapitel
von ~650 auf ~350–450 sichtbare Wörter gebracht. Diese Regeln halten:

- Aufzählbares wird Tabelle oder Liste, Abläufe werden nummerierte Schritte,
  Kontraste werden ✓/✗-Zeilen — kein Fließtext für strukturierbare Inhalte.
- Konkretes Artefakt statt Beschreibung: echter Befehl, echter Prompt, echte
  Config. Wenn ein Satz durch eine Codezeile ersetzbar ist, ersetzt ihn die
  Codezeile.
- Herleitungen und Hintergrund gehören in einen `<Deep title="…">`-Ausklapper
  (pro Sprache vorgebunden wie Callout) — Substanz wird verschoben, nicht
  gelöscht.
- Meta-Sätze („Das ist wichtig, weil…", „Es lohnt sich…") werden gestrichen;
  die Aussage selbst trägt.
- Faustregel: maximal 1–2 `<Deep>`-Blöcke pro Kapitel; wenn mehr nötig
  scheint, ist das Kapitel zu breit geschnitten.

**Zielgruppe und Beispielwelt.** Entwickler:innen in einem
Container-Terminal-Softwareunternehmen, Claude Code als zentral verwaltetes
Enterprise-Werkzeug in der Einführungsphase. Codebeispiele nutzen die
Terminal-Domäne (Vessel, Berth, Yard, Reefer, `BerthAllocationService` …) mit
Spring Boot/Gradle bzw. Angular; Tool-Stack ist Jira/Confluence/Bitbucket.
Diese Beispielwelt bitte konsistent halten — generische Beispiele fallen auf.

**Querverweise statt Wiederholung.** Jeder Begriff wird an genau einer Stelle
erklärt und sonst verlinkt. Wenn eine Erklärung zweimal auftaucht, gehört sie
in ein eigenes Kapitel.

**Zahlen werden gemessen, nicht behauptet.** Alle konkreten Werte im Tutorial
sind entweder zur Build-Zeit berechnet (Tokenizer-Demo) oder als
Größenordnung mit dem ausdrücklichen Hinweis versehen, selbst zu messen —
siehe Multi-Agent-Kosten. **Diese Linie bitte halten.** Aus demselben Grund
stehen im Kosten-Kapitel keine konkreten Kontingent- oder Enterprise-Preise:
Sie veralten schneller, als das Tutorial gepflegt wird.

**Korrekturen sind explizit.** Wo gängige Aussagen nicht stimmen, steht ein
`<Callout type="korrektur">`, der die verbreitete Version benennt und dann
richtigstellt. Nicht stillschweigend anders schreiben.

**Claude-Code-Oberfläche sparsam zitieren.** Slash-Commands (`/context`,
`/compact`, `/clear`, `/model`, `!`-Präfix) werden benannt, aber nicht mit
Screenshots oder detaillierten Menübeschreibungen dokumentiert — die
Oberfläche ändert sich schneller als die Konzepte. Das Tutorial erklärt das
Warum; das Wie steht in der offiziellen Doku.

### Die bewussten Abweichungen

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
4. **„Grün heißt gut"** (`unit-tests`). Generierte Tests, die die
   Implementierung nachbeten, sind grün und wertlos. Das Kapitel `evals`
   liefert mit Mutation Testing (PIT) die zugehörige Messmethode.

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

**Atlassian-MCP-Details prüfen, bevor sie intern verteilt werden.** Die
Kapitel `mcp` und `atlassian` beschreiben den offiziellen Atlassian-Remote-
MCP-Server (Cloud, OAuth) und Community-Server für Data Center bewusst auf
Konzeptebene. Vor einem internen Rollout gehört einmal verifiziert, welche
Variante das Unternehmen tatsächlich freigeschaltet hat, und ggf. eine
konkrete Einrichtungsanleitung in Confluence ergänzt (nicht ins Tutorial —
siehe Konvention „Oberfläche sparsam zitieren").

**Keine Tests für die Demos.** Verifiziert wurde einmalig per
Playwright-Skript (alle Seiten, Querverweise, Prev/Next-Kette,
Sprachumschalter, Demo-Initialisierung, 375 px). Das Skript ist nicht
eingecheckt. Wer die Demos umbaut, sollte es neu aufsetzen — oder als
Playwright-Test dauerhaft einchecken. Das wäre die sinnvollste nächste
Investition.

**Kein Suchfeld.** Bei 20 Kapiteln verschmerzbar, ab ~25 nicht mehr. Pagefind
lässt sich in einen Astro-Build ohne Server einhängen.

---

## 8. Ideen für den Ausbau

Bewusst nicht enthalten, weil der Umfang so zugeschnitten wurde. In grober
Reihenfolge des Nutzens:

| Thema | Wohin | Warum |
|---|---|---|
| Hooks als Guardrails | 3.6 | Formatter/Linter nach jedem Edit erzwingen — passt zur Verifikations-Linie |
| RAG & Embeddings | neuer Teil | Chunking, Vektorsuche, „RAG oder langer Context?" |
| Sampling & Temperature | 1.4 | Erklärt Nicht-Determinismus, auf den sich das Evals-Kapitel bereits beruft |
| Reasoning-/Thinking-Modelle | 2.4 | Thinking-Tokens sind Kosten- und Latenzfaktor, kommen aktuell nirgends vor |
| Structured Output / JSON | 3.6 | Praktisch relevant für Pipeline-Workflows, technisch nah an Tool Use |
| Context Engineering als Kapitel | 4.5 | Klammert Compaction, Sub-Agents, Skills zusammen — aktuell verteilt |
| Onboarding-Checkliste | Anhang | „Erste Woche mit Claude Code" als druckbare Seite |

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

**Direkt auf `main` pushen ist erwünscht** — kein PR nötig. Bei Inhaltsarbeit
ist die veröffentlichte Seite das Review; ein PR verzögert nur den Blick
darauf. Gilt für Menschen und für Agenten-Sessions in diesem Repo
gleichermaßen. Branch und PR nur, wenn wirklich jemand vorher draufschauen
soll. Absicherung ist das Build-Gate aus Abschnitt 4: Es läuft in CI und
lässt eine fehlende Übersetzung oder einen toten Link gar nicht erst
deployen. `npm run check` vor dem Push meldet dasselbe eine Minute früher.

`base: '/llm-tutorial'` in `astro.config.mjs` hängt am Repository-Namen — bei
Umbenennung mitziehen.
