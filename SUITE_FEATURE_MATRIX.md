# SUITE FEATURE MATRIX

**Version:** 2.2 (Session 16 Post-Folio Upgrade)
**Verification Method:** Automated Playwright E2E (`tests/verify_suite_e2e.py`, `tests/grid_e2e.py`, `tests/folio_e2e.py`)

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
| **`docs`** | **Folio Studio** | **Upgraded Document Studio** | **Free / Open** | **Active v2.0** | **Verified `tests/folio_e2e.py`** |
| `sheets` | Grid Data Studio | Spreadsheet Data Studio | Free / Open | **Active v2.1** | Verified `tests/grid_e2e.py` |
| `forms` | Fill | Form Builder & Capture | Free / Open | **Active** | Verified E2E |
| `slides` | Glides | Filmstrip Deck Editor | Free / Open | **Active** | Verified E2E |
| `canvas` | Work Graph | Relationship Graph | Free / Open | **Active** | Verified E2E |
| `activity` | Network Monitor | Request Audit Log | Free / Open | **Active** | Verified E2E |
| `backups` | Backups | Encrypted Capsule Backup | Free / Open | **Active** | Verified E2E |
| `security` | Security Center | Security & Health Score | Free / Open | **Active** | Verified E2E |
| `privacy` | Privacy Center | Privacy Audit & Strict Mode | Free / Open | **Active** | Verified E2E |

---

## Folio Feature Functional Status (Session 16 Verification)

- **Document Shell & Inspector:** Split canvas layout with Inspector panel (Outline, History, Properties).
- **Outline Engine:** Clickable heading hierarchy list (`H1`, `H2`, `H3`) scrolling directly to sections.
- **Blocks & Slash Commands:** Insert blocks, quotes, code blocks, checklists, page breaks, and rich tables via `/` slash menu.
- **Attachments & Comments:** Local file attachment store with download links, text selection comment review layer.
- **History & Recovery:** Snapshot creation, version restoration, and debounced autosave.
- **Templates & Export:** Template placeholder engine (`{{PROJECT_NAME}}`, `{{DATE}}`), PDF print layout, Markdown export, and `.folio` package import/export.
- **Cross-Module Links:** Convert text selection to Docket tasks and Almanac events.
