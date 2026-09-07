# SUITE CURRENT SPECIFICATION

**Version:** 2.1 (Session 16 Functional Completion)
**Status:** Full Open Development Mode (`OPEN_DEVELOPMENT_MODE = true`)
**Source Location:** `index.html`

---

## 1. System Architecture & Product Philosophy

Suite / OFFLINES is a professional, offline-first private operating suite.
- **Core Principle:** The server delivers the application assets (HTML/CSS/JS). The server never receives user private data.
- **Data Engine:** All user data (documents, spreadsheets, passwords, notes, calendar events, files) is stored locally in `localStorage` under key prefix `suite_v1_`.
- **Encryption:** High-security modules (Vault, Lockbox) use client-side AES-256-GCM authenticated encryption with PBKDF2 key derivation via `window.crypto.subtle`.

---

## 2. Source Module Architecture (23 Modules)

The codebase consists of 23 workspace modules mapped in `ALL_MODULES`:

### 2.1 Workspace
1. **Overview (`today`):** Dashboard with KPI cards, quick actions, schedule summary, and security health indicator.

### 2.2 Organize
2. **Files (`files`):** Local `.fils` document and file repository manager.
3. **Notes (`notes` / Spot):** Canvas spatial note board + Markdown Library system with backlinks (`[[Link]]`).
4. **Tasks (`tasks` / Docket):** Urgent/Important Eisenhower matrix with dot position aging.
5. **Calendar (`agenda` / Almanac):** Day/Week/Month calendar, countdowns, and daylight estimation.
6. **Contacts (`contacts`):** Local `.ctac` contact directory manager.
7. **Projects (`projects`):** Local `.proj` project manager connecting cross-module assets.

### 2.3 Secure
8. **Passwords (`passwords`):** AES-256-GCM encrypted credential vault.
9. **Passkeys (`passkeys`):** Local WebAuthn passkey reference registry.
10. **OTP / Verifier (`totp`):** Local RFC 6238 TOTP / RFC 4226 HOTP authenticator code engine.
11. **Cards / Wallet (`wallet`):** Encrypted payment card information locker.
12. **Identities (`identities`):** Encrypted passport, national ID, and address store.
13. **Secure Files (`lockbox`):** Encrypted file locker (`.lbox`) with time-locked notes.
14. **Secrets (`secrets`):** Encrypted SSH keys, API credentials, and developer secrets.

### 2.4 Create
15. **Documents (`docs` / Folio):** Rich document editor (`.fils`) with margin notes and export.
16. **Tables (`sheets` / Grid - Upgraded v2.1):** Professional spreadsheet studio featuring an 8-tab Suite Command Ribbon (Start, Format, Insert, Data, Formulas, Review, View, Automate), Undo/Redo history stack, row filtering engine, freeze panes CSS, spreadsheet keyboard navigation, multi-sheet workbook model, expanded function library (`SUM`, `AVERAGE`, `COUNTIF`, `SUMIF`, `AVERAGEIF`, `IF`, `VLOOKUP`, `INDEX`, `MATCH`, `ROUNDUP`, `ROUNDDOWN`, `TODAY`, `NOW`, `IFERROR`), cell formatting, cell notes/comments, Find & Replace modal, right-click context menu, status bar metrics, SVG chart generator, RFC-compliant CSV parser, and `.grid` / CSV import/export.
17. **Forms (`forms` / Fill):** Form builder and local submission response capture (`.fill`).
18. **Presentations (`slides` / Glides):** Filmstrip slide editor with live `{{GRID:A1:B4}}` spreadsheet range embeds.
19. **Canvas / Graph (`canvas`):** Interactive Work Graph relationship visualizer (`.graph`).

### 2.5 System
20. **Network Monitor (`activity`):** Observable real-time network request audit log.
21. **Backups (`backups`):** Encrypted `.capsule` backup package generator and restore engine.
22. **Security Center (`security`):** Local security dashboard and password health scoring.
23. **Privacy Center (`privacy`):** Local privacy audit with strict Offline Mode toggle.

---

## 3. Storage Layer Specification

- **Primary Local Storage:** `localStorage` with `KEY_PREFIX = "suite_v1_"`.
- **Key Mappings:**
  - `suite_v1_sheets`: Multi-sheet `SuiteGridWorkbook` object.
  - `suite_v1_docs`: Folio HTML document payload.
  - `suite_v1_notes_library`: Spot Markdown library notes.
  - `suite_v1_vaults_index` & `suite_v1_vault_<id>`: Encrypted Vault data blobs.
