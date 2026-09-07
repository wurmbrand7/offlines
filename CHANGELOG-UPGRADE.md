# OFFLINES / Suite Complete Upgrade Changelog

**Version Release:** 2026.1 Complete Product Upgrade
**Architect:** Jules

---

## Highlights & Overview

This major release transforms OFFLINES from a prototype notes/files suite into a **professional offline privacy operating suite**. Every component has been re-architected around a zero-server local-first philosophy, complete with a dark graphite security workstation design system, an advanced Password Manager and security suite, deep productivity tools, universal search, command palette, and full open development mode.

---

## Detailed Changes by Category

### 1. UI/UX Design System & Workspace Architecture
- **New Workspace Layout:** Rebuilt `index.html` with a dark graphite security workstation layout (`#0b0f17` base, `#121824` surface).
- **Structured Navigation Sidebar:** Categorized into **WORKSPACE** (Dashboard, Projects, Work Graph), **ORGANIZE** (Files, Spot Notes, Tasks, Almanac Calendar, Contacts), **SECURE** (Passwords, Passkeys, Verifier 2FA, Forge Generator, Lockbox Files, Password Health), **CREATE** (Folio Documents, Grid Spreadsheet, Fill Forms, Glides Presentations), and **SYSTEM** (Privacy Center, Encrypted Backups, System Settings).
- **Header Navigation:** Added workspace selector popover, global search input, live security status badge (`LOCAL ONLY · 0 B SENT`), quick capture button (`Q`), and vault lock toggle.
- **Command Palette (`⌘K`):** Global command bar for instant search, quick actions, and direct module switching.

### 2. Password Manager & Security Suite
- **Private Password Vault:** Multi-vault capability supporting 9 credential categories: Logins, Cards, Identities, Secure Notes, API Keys, SSH Keys, Wi-Fi, Software Licenses, and Secrets. Encrypted via Web Crypto API (`AES-256-GCM` + `PBKDF2`).
- **Forge Generator:** Credential generation engine supporting passwords, diceware passphrases, PINs, hex secrets, custom character sets, and entropy estimation ($E = \log_2(N^L)$ bits).
- **Verifier (2FA Authenticator):** Local TOTP authenticator engine featuring a live 30-second ticking progress bar, manual secret entry, and `otpauth://` URI parsing.
- **Passkeys Registry:** Track local passkey credentials and WebAuthn metadata.
- **Password Health Audit:** Security dashboard auditing password strength, identifying weak, reused, or outdated passwords and missing 2FA.

### 3. Productivity & Knowledge Workspace
- **Folio Document Studio:** Rich document editor with page outlines, word/char/read-time statistics, templates (Proposal, Report, Meeting, Contract), callout blocks, and native browser printing to PDF.
- **Grid Data Studio:** Local spreadsheet engine supporting formulas (`SUM`, `AVERAGE`, `COUNT`, `IF`, `CONCAT`), calculator drawer, cell formatting, and CSV/.grid import/export.
- **Fill Private Forms:** Form designer with field library (Text, Number, Selection, Signature), live preview, local response database, and CSV export.
- **Spot Notes & Almanac Calendar:** Block-based notes library with backlinks and daily planner board, paired with a full calendar suite featuring Month/Week/Day/Agenda views, recurring events, moon phases, and daylight calculations.
- **Work Graph & Glides:** Interactive visual canvas rendering inter-object relationships across the workspace, and presentation studio featuring live Grid spreadsheet embeds (`{{GRID:A1:B4}}`).

### 4. Privacy, Security & Open Access
- **Network Transparency Monitor:** Wraps network calls in `loggedFetch()`, presenting an observable log proving zero user bytes transmitted.
- **Full Open Development Mode:** Unlocked all 23 modules by default (`isLicensed() === true`) so all features are accessible without requiring a license key or paywall overlay.
- **DOM Security:** Applied `escapeHTML()` escaping to all user content template interpolations.
- **Standalone Launchers Refactored:** Simplified all 8 launchers in `/standalone/*.html` into clean wrappers pointing to `index.html?suite_only=<module_id>`, eliminating over 30,000 lines of duplicated code.
