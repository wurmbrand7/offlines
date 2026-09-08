# OFFLINES / SUITE — CURRENT ACTIVE PRODUCT SPECIFICATION

**STATUS:** ACTIVE & AUTHORITATIVE
**LICENSING:** INACTIVE
**PRICING:** NOT PRESENT
**SUBSCRIPTIONS:** NOT PRESENT
**COMMERCIAL ENTITLEMENTS:** NOT PRESENT

---

## 1. PRODUCT PRINCIPLES & ARCHITECTURE
OFFLINES (Suite) is an offline-first private workspace and security suite where all user productivity and vault data remains strictly on the user's local device.
* **Serverless User Data:** The web server delivers static application assets (HTML/CSS/JS). No user documents, notes, spreadsheets, forms, tasks, calendar events, passwords, or vault keys touch any server.
* **Zero Server Persistence:** 0 bytes of private user data transmitted.
* **Local Storage & Web Crypto:** Encrypted objects are sealed locally using Web Crypto API (AES-256-GCM, PBKDF2).

---

## 2. MODULE ARCHITECTURE
* **Folio (`.fils`):** Advanced Document Studio featuring 11-tab command ribbon, rich text, tables, TOC generator, footnotes, citations, mail merge dataset workflow, comments, track changes, version snapshots, and publishing (PDF/Markdown/HTML/TXT).
* **Grid (`.grid`):** Data Studio & Spreadsheet Engine featuring multi-sheet workbooks, real formula evaluator (math, logical, string, date, VLOOKUP/XLOOKUP), fill handle reference translation (`$A$1`, `A$1`), formatting, sorting, filtering, tables, validation, conditional formatting, and SVG charts.
* **Spot (`.spot`):** Capture & Private Knowledge System.
* **Docket (`.plot`):** Priority & Eisenhower Matrix Task System.
* **Almanac (`.agnd`):** Time & Calendar Planner.
* **Fill (`.fill`):** Private Form Designer & Intake System.
* **Glides (`.glides`):** Visual Slide & Presentation Environment.
* **Private Vault (`.lbox` / Lockbox):** Sealed credential locker supporting Logins, Payment Cards, Identity, Secure Notes, API Keys, SSH Keys, Wi-Fi, Software Licenses, and Recovery Codes.
* **Verifier:** TOTP 2FA authenticator with local progress timer.
* **Forge:** Cryptographic password and passphrase generator.
* **Security & Privacy Centers:** Password Health auditor and network activity monitor.
