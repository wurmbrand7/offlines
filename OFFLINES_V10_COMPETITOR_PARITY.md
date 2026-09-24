# OFFLINES V10 COMPETITOR PARITY REPORT

## Overview
This report provides functional proof and code evidence for competitor parity across all 11 OFFLINES V10 applications.

---

## APP-BY-APP PARITY EVALUATION

### 1. Folio vs Microsoft Word & Notion
- **Review System:** Implemented Track Changes (`<ins>` and `<del>` tagging) with Accept All / Reject All review controls.
- **Publishing:** Multi-format export (`.fils`, `.md`, `.txt`, `.html`, PDF/Print) and DOM page breaks.

### 2. Grid vs Microsoft Excel & Power Query
- **Formula Engine:** 2D Range Array Engine evaluating `VLOOKUP`, `XLOOKUP`, `INDEX`, `MATCH`, `HLOOKUP`, and `SUMIFS`.
- **Analytics & ETL:** Local Pivot Table aggregation engine and Offline Dataflow transformation pipeline.

### 3. Fill vs Microsoft Forms & Typeform
- **Branching:** Conditional section visibility rules evaluating parent field input values dynamically (`evalFillBranching`).
- **Form Distribution:** Standalone `.html` form generator saving responses directly to local files.

### 4. Spot vs Notion & Obsidian
- **Visual Canvas:** Interactive node-link knowledge graph with dynamic SVG connector lines between notes.
- **Knowledge Linking:** Backlink tracking and quote pinning into Folio documents.

### 5. Docket vs Todoist & Asana
- **Query Filter:** Query parser evaluating filters like `urgent`, `done`, and `today`.
- **Views:** Dual List vs. Eisenhower Priority Matrix views with carried-day aging badges.

### 6. Almanac vs Primavera P6
- **CPM Solver:** Early Start, Late Finish, Total Float, and Critical Path calculation engine.
- **Visualization:** Dense WBS activity table, Gantt timeline bars, and resource loading histograms.

### 7. Glides vs Microsoft PowerPoint
- **Presenter Mode:** Fullscreen presenter overlay with keyboard navigation and slide progress counters.
- **Live Embeds:** Live Grid range embedding (`{{GRID:A1:B4}}`) updating slides dynamically from local spreadsheets.

### 8. Lockbox vs 1Password & Bitwarden
- **Vault Engine:** Web Crypto API (`AES-256-GCM` + `PBKDF2`), 2FA/TOTP authenticators (RFC 6238), and 20s clipboard clear.
- **Passkeys:** Explicit passkey metadata designation and password health auditor.

### 9. Formula vs WolframAlpha & Calculator Tools
- **Notebook Evaluator:** Scientific math evaluator with constant reference library and variable notebook.
- **Unit Conversions:** Instant physical unit conversion engine (`kg/lbs`, `°C/°F`).

### 10. Transmute vs CyberChef & DevToys
- **Pipeline:** Reorderable multi-step data transformation pipeline (`INPUT -> STEP 1 -> STEP 2 -> OUTPUT`).
- **Transformers:** JSON prettifier, Base64 encode/decode, Hex conversion, and SHA-256 hashing.

### 11. Doxera vs Notion Docs
- **Indexing:** Structured document indexing, full-text local search, and snippet extraction with term frequency ranking.
