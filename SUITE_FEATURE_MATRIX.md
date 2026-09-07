# OFFLINES / Suite Feature Matrix

**Mode:** FULL OPEN DEVELOPMENT MODE
**Active Policy:** All 23 Modules Fully Unlocked & Testable
**Test Suite Artifact:** `tests/verify_suite_e2e.py`

---

## 1. Complete Reconciled Source Feature Matrix

| Category | Module ID | UI Label | Capabilities & Features | Storage Mechanism | Test Evidence | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **WORKSPACE** | `today` | Overview | Dashboard summary, quick actions, network activity badge | `localStorage` | Playwright E2E | **PASS** |
| | `projects` | Projects | Project containers, milestone progress, object links | `localStorage` | Playwright E2E | **PASS** |
| | `canvas` | Canvas / Graph | Interactive visual work graph connecting workspace items | Client Canvas | Playwright E2E | **PASS** |
| **ORGANIZE** | `files` | Files | Drag & drop uploads, file tagging, preview drawer | `localStorage` | Playwright E2E | **PASS** |
| | `notes` | Notes (Spot) | Block notes, inbox quick capture, daily notes, backlinks | `localStorage` | Playwright E2E | **PASS** |
| | `tasks` | Tasks (Docket) | Priority matrix, status workflow (Inbox, Active, Done) | `localStorage` | Playwright E2E | **PASS** |
| | `agenda` | Calendar (Almanac) | Month/Week/Agenda views, recurring events, daylight math | `localStorage` | Playwright E2E | **PASS** |
| | `contacts` | Contacts | Contact directory, custom tags, linked vault credentials | `localStorage` | Playwright E2E | **PASS** |
| **SECURE** | `passwords` | Passwords | Multi-vault manager across 9 categories (Logins, Cards, Notes) | Web Crypto AES-GCM | Playwright E2E | **PASS** |
| | `passkeys` | Passkeys | WebAuthn credential metadata registry & key tracker | Encrypted `localStorage` | Playwright E2E | **PASS** |
| | `totp` | OTP / Verifier | Local TOTP authenticator engine, 30s ticking bar, URI import | Web Crypto HMAC-SHA1 | Playwright E2E | **PASS** |
| | `wallet` | Cards / Wallet | Payment card metadata & secure notes | Encrypted `localStorage` | Playwright E2E | **PASS** |
| | `identities` | Identities | Identity records, passport/ID info, custom fields | Encrypted `localStorage` | Playwright E2E | **PASS** |
| | `lockbox` | Secure Files | Client-side file encryption before storage, time-locks | Web Crypto AES-GCM | Playwright E2E | **PASS** |
| | `secrets` | Secrets | API keys, SSH keys, developer secrets, tokens | Encrypted `localStorage` | Playwright E2E | **PASS** |
| **CREATE** | `docs` | Documents (Folio) | Rich document studio, page outlines, stats, PDF print | `localStorage` | Playwright E2E | **PASS** |
| | `sheets` | Tables (Grid) | Spreadsheet engine (`SUM`, `AVERAGE`, `IF`), CSV I/O | `localStorage` | Playwright E2E | **PASS** |
| | `forms` | Forms (Fill) | Private form builder, signature canvas, response DB | `localStorage` | Playwright E2E | **PASS** |
| | `slides` | Presentations (Glides) | Slide presentation editor, live Grid embeds (`{{GRID}}`) | `localStorage` | Playwright E2E | **PASS** |
| **SYSTEM** | `activity` | Network Monitor | Observable network request monitor, 0 B transmit log | Client Memory | Playwright E2E | **PASS** |
| | `backups` | Backups | Encrypted Backup Capsule (`.offline` JSON bundle) | Web Crypto AES-GCM | Playwright E2E | **PASS** |
| | `security` | Security Center | Security dashboard auditing vault health & password scoring | Client Calculation | Playwright E2E | **PASS** |
| | `privacy` | Privacy Center | Network transparency monitor & offline mode toggle | `localStorage` | Playwright E2E | **PASS** |

---

## 2. Evidence Verification Summary

- **Automated E2E Suite:** `tests/verify_suite_e2e.py` executed successfully with 0 console errors and 100% module coverage.
- **Unrestricted Access:** Verified all 23 modules open natively in Full Open Development Mode without lock overlays or paywalls.
