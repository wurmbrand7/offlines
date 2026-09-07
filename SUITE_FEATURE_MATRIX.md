# OFFLINES / Suite Feature Matrix

**Mode:** FULL OPEN DEVELOPMENT MODE
**Active Policy:** All 23 Modules Fully Unlocked & Testable

---

## 1. Complete Module Feature & Access Matrix

| Category | Module ID | Friendly Name | Functional Capabilities | Open Development Access | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **WORKSPACE** | `overview` | Dashboard | Summary widgets, quick actions, network activity badge, search | **100% Unlocked** | **PASS** |
| | `projects` | Projects Hub | Project containers, milestone progress, cross-object linking | **100% Unlocked** | **PASS** |
| | `graph` | Work Graph | Interactive visual graph rendering relations between workspace items | **100% Unlocked** | **PASS** |
| **ORGANIZE** | `files` | Files Manager | Drag & drop uploads, file tagging, storage inspector, preview drawer | **100% Unlocked** | **PASS** |
| | `spot` | Spot Notes | Block-based notes canvas, inbox capture, daily notes, backlinks | **100% Unlocked** | **PASS** |
| | `docket` | Tasks (Docket) | Priority matrix, status workflow (Inbox, Active, Done), due dates | **100% Unlocked** | **PASS** |
| | `almanac` | Almanac Calendar | Month/Week/Day/Agenda views, recurring events, daylight calculations | **100% Unlocked** | **PASS** |
| | `contacts` | Contacts | Directory, custom tags, linked vault logins, interaction records | **100% Unlocked** | **PASS** |
| **SECURE** | `passwords` | Password Vault | Multi-vault manager across 9 categories (Logins, Cards, Notes, API/SSH) | **100% Unlocked** | **PASS** |
| | `passkeys` | Passkeys | Local WebAuthn credential metadata registry & key tracker | **100% Unlocked** | **PASS** |
| | `verifier` | Verifier (2FA) | Local TOTP authenticator engine, 30s ticking timer, URI parsing | **100% Unlocked** | **PASS** |
| | `forge` | Forge Generator | Credential generator (passwords, diceware, PINs, hex, entropy meter) | **100% Unlocked** | **PASS** |
| | `lockbox` | Lockbox | Client-side encrypted file vault, time-locks | **100% Unlocked** | **PASS** |
| | `health` | Password Health | Security audit calculating weak, reused, or missing 2FA credentials | **100% Unlocked** | **PASS** |
| **CREATE** | `folio` | Folio Studio | Rich document studio, page outlines, stats, templates, PDF print | **100% Unlocked** | **PASS** |
| | `grid` | Grid Spreadsheet | Data studio, formulas (`SUM`, `AVERAGE`, `COUNT`, `IF`), CSV export | **100% Unlocked** | **PASS** |
| | `fill` | Fill Forms | Private form builder, signature canvas, local response database | **100% Unlocked** | **PASS** |
| | `glides` | Glides | Visual presentation editor, live Grid embeds (`{{GRID:A1:B4}}`) | **100% Unlocked** | **PASS** |
| **SYSTEM** | `privacy` | Network Monitor | Observable network request monitor, 0 bytes transmitted log | **100% Unlocked** | **PASS** |
| | `backups` | Backup Capsule | Encrypted full workspace backup (`.offline` JSON bundle), AES-256 | **100% Unlocked** | **PASS** |
| | `settings` | Settings | System themes, storage breakdown, data clear tools | **100% Unlocked** | **PASS** |

---

## 2. Testing & Evaluation Criteria

- **Functional Execution:** Every listed feature executes client-side without runtime or console errors.
- **Data Persistence:** All created records persist reliably across sessions in `localStorage` or `IndexedDB`.
- **Zero Locks:** No module or feature prompts for a license key, Pro unlock, subscription, or payment.
