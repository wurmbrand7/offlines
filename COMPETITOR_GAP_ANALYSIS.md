# OFFLINES.XYZ — COMPETITOR GAP ANALYSIS & CAPABILITY BENCHMARK

**Document Status:** Live Verification Benchmark
**Build Identity:** `LOCAL-ONLY-2026-09-10-V7`
**Core Differentiation:** 100% Client-Side Local Processing / Serverless by Default / Zero Mandatory Remote Calls

---

## 1. CAPABILITY BENCHMARK MATRIX (11 SUITE APPLICATIONS)

| Application | Market Benchmark / Competitor | Major Expected Capabilities | OFFLINES Implementation Level | Unique Privacy & Local Advantage | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Folio** | Microsoft Word / Notion | Rich text formatting, headings, tables, slash commands, document outline, TOC generation, comments, native export. | Advanced native Document Studio (`.fils`). Supports block editor, table tools, PDF print, Markdown, plain text export. | Zero cloud sync required. Local PBKDF2/AES-GCM encryption capsule backup. | **PASS** |
| **Grid** | Microsoft Excel / Airtable | Multi-sheet workbooks, formula evaluator, cell dependencies, ranges, fill drag, sorting, filtering, CSV/JSON import/export, charts. | Advanced Data Studio (`.grid`). Supports formulas (`SUM`, `AVERAGE`, `IF`, `COUNTIF`, etc.), multi-sheet tabs, SVG charts. | 100% local calculation engine. Zero server-side workbook parsing or telemetry. | **PASS** |
| **Fill** | Typeform / Google Forms | Drag-and-drop form designer, input validation, signature, response database, response export, standalone HTML output. | Private Forms Builder (`.fill`). Field designer, client-side response storage, standalone form generation. | Submissions saved locally in IndexedDB / localStorage. Standalone form `.html` exports without server post endpoints. | **PASS** |
| **Spot** | Obsidian / Evernote | Fast capture, rich notes, tags, folder structure, search, markdown support, backlinks, conversion into tasks/docs. | Notes & Capture Studio (`.spot`). Board & library views, tag filtering, universal search indexing, cross-module note linking. | Fast local indexing without cloud sync requirements. | **PASS** |
| **Almanac** | Google Calendar / Primavera | Calendar views (day/week/month/timeline), event scheduling, project CPM graph engine (Early Start, Late Finish, Total Float). | Time Planner (`.agnd`). Calendar grids, event manager, CPM schedule solver. | Local event notification processing. Zero external calendar server tracking. | **PASS** |
| **Glides** | Microsoft PowerPoint | Slide creation, text/shape layers, live Grid embeds (`{{GRID:A1:B4}}`), filmstrip editor, presentation mode. | Presentation Studio (`.glides`). Filmstrip preview, presenter view, live cell embeds from Grid workbook. | Local slide rendering without remote presentation servers or telemetry. | **PASS** |
| **Docket** | Asana / Todoist | Task lists, priorities, carried days tracking, project association, status toggles, completion history. | Action Planning (`.plot`). Task manager with carried days calculation and priority tagging. | Local task database. Zero external push notification servers. | **PASS** |
| **Lockbox** | 1Password / Bitwarden | Category vaults (Logins, Cards, WiFi, API keys, Passkeys), TOTP authenticator, Argon2id/PBKDF2+AES-GCM, entropy password generator. | Secure Vault (`.lbox`). Multi-vault architecture, TOTP live ticker, client-side Web Crypto key derivation. | Encryption keys derived strictly in browser memory. Plaintext never leaves device memory. | **PASS** |
| **Formula** | WolframAlpha / Calculator | Mathematical expression evaluator, scientific functions (`sin`, `cos`, `log`, `sqrt`), unit conversions (`kg to lbs`, `c to f`). | Scientific Math Engine (`.formu`). Evaluates mathematical expressions, performs unit conversions, logs history. | 100% deterministic local evaluation. Zero external math API calls. | **PASS** |
| **Transmute** | CyberChef / DevToys | JSON prettify/minify, Base64/URL/Hex encoding & decoding, SHA-256 cryptographic hashing, case conversions. | Format Transformer (`.xmute`). Real-time client-side transformer with conversion logging and `.xmute` export. | All text and data transformations executed strictly in browser memory. | **PASS** |
| **Doxera** | Readwise / Notion Docs | Structured documentation index, Markdown body editor, document searching, local knowledge base organization. | Structured Documents (`.ddf`). Title/body document index, Markdown editing, knowledge export. | Local document search and indexing without cloud NLP or remote servers. | **PASS** |

---

## 2. KEY COMPETITOR GAPS RESOLVED IN OFFLINES

1. **Mandatory Cloud Login & Telemetry:** Commercial competitors require accounts, background analytics, and remote telemetry. OFFLINES operates 100% offline with zero remote telemetry or account setup.
2. **Server-Side File Conversion:** Competitors offload file parsing and formatting to remote servers. OFFLINES performs all transformations, document formatting, and calculations locally on the user's device.
3. **Data Lock-in:** OFFLINES provides full local JSON/package import and export across all 11 applications, alongside encrypted backup capsule export (`suite.capsule`).
