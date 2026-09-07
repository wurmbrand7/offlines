# SUITE FEATURE MATRIX

**Version:** 2.1 (Session 16 Functional Completion)
**Verification Method:** Automated Playwright E2E (`tests/verify_suite_e2e.py` & `tests/grid_e2e.py`)

---

## Workspace Modules Status Matrix

| Module ID | Module Name | Primary Role | Entitlement | Status | Test Verification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `today` | Overview | Workspace Dashboard | Free / Open | **Active** | Verified E2E |
| `files` | Files Manager | Local File Vault | Free / Open | **Active** | Verified E2E |
| `notes` | Spot | Notes & Markdown Library | Free / Open | **Active** | Verified E2E |
| `tasks` | Docket | Urgent/Important Matrix | Free / Open | **Active** | Verified E2E |
| `agenda` | Almanac | Calendar & Schedule | Free / Open | **Active** | Verified E2E |
| `contacts` | Contacts | Contact Directory | Free / Open | **Active** | Verified E2E |
| `projects` | Projects | Cross-Module Projects | Free / Open | **Active** | Verified E2E |
| `passwords` | Passwords Vault | AES-256-GCM Credential Store | Free / Open | **Active** | Verified E2E |
| `passkeys` | Passkeys | WebAuthn Registry | Free / Open | **Active** | Verified E2E |
| `totp` | OTP / Verifier | TOTP / HOTP Authenticator | Free / Open | **Active** | Verified E2E |
| `wallet` | Cards / Wallet | Payment Card Vault | Free / Open | **Active** | Verified E2E |
| `identities` | Identities | ID & Passport Store | Free / Open | **Active** | Verified E2E |
| `lockbox` | Secure Files | Encrypted File Locker | Free / Open | **Active** | Verified E2E |
| `secrets` | Secrets | SSH & API Key Store | Free / Open | **Active** | Verified E2E |
| `docs` | Folio | Rich Document Studio | Free / Open | **Active** | Verified E2E |
| **`sheets`** | **Grid Data Studio** | **Upgraded Spreadsheet Studio** | **Free / Open** | **Active v2.1** | **Verified `tests/grid_e2e.py`** |
| `forms` | Fill | Form Builder & Capture | Free / Open | **Active** | Verified E2E |
| `slides` | Glides | Filmstrip Deck Editor | Free / Open | **Active** | Verified E2E |
| `canvas` | Work Graph | Relationship Graph | Free / Open | **Active** | Verified E2E |
| `activity` | Network Monitor | Request Audit Log | Free / Open | **Active** | Verified E2E |
| `backups` | Backups | Encrypted Capsule Backup | Free / Open | **Active** | Verified E2E |
| `security` | Security Center | Security & Health Score | Free / Open | **Active** | Verified E2E |
| `privacy` | Privacy Center | Privacy Audit & Strict Mode | Free / Open | **Active** | Verified E2E |

---

## Grid Feature Functional Status (Session 16 Verification)

- **Command System:** 8-tab Suite Command Ribbon (`Start`, `Format`, `Insert`, `Data`, `Formulas`, `Review`, `View`, `Automate`) with zero dead controls.
- **History & Navigation:** Undo/Redo history stack (`Ctrl+Z`, `Ctrl+Shift+Z`), spreadsheet keyboard navigation (Arrow keys, Tab, Enter).
- **Data Engine & Filtering:** Multi-sheet workbook, row filter engine, freeze panes CSS, right-click cell context menu, local cell notes/comments, Find & Replace modal, status bar selection metrics.
- **Formula Engine:** Expanded function library (`SUM`, `AVERAGE`, `COUNTIF`, `SUMIF`, `AVERAGEIF`, `VLOOKUP`, `INDEX`, `MATCH`, `ROUNDUP`, `ROUNDDOWN`, `NOW`, `IFERROR`) with dependency tracking and error codes.
- **Import / Export:** Versioned `.grid` JSON format v2.0 and RFC-compliant CSV parser.
