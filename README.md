# OFFLINES — Private Operating Workspace & Security Suite

OFFLINES is an offline-first private productivity workspace and security workstation.

## Core Principles
* **Data Local to Device:** All documents, notes, spreadsheets, tasks, forms, calendar events, passwords, and private vault records are stored exclusively on your device using `localStorage` and Web Crypto API (AES-256-GCM).
* **Zero Server Data Transmission:** The server delivers static application assets and never receives or persists user data.
* **No Accounts, No Tracking, No Subscriptions:** Full open access across all suite applications.

## Included Applications
1. **Folio (`.fils`):** Document Studio & Publishing Engine
2. **Grid (`.grid`):** Data Studio & Spreadsheet Engine
3. **Spot (`.spot`):** Capture & Notes Studio
4. **Docket (`.plot`):** Priority Task Manager
5. **Almanac (`.agnd`):** Calendar & Time Planner
6. **Fill (`.fill`):** Private Form Designer
7. **Glides (`.glides`):** Visual Slide & Presentation Studio
8. **Private Vault (`.lbox`):** Multi-Category Encrypted Password & Credentials Vault
9. **Verifier:** HOTP/TOTP 2FA Authenticator
10. **Forge:** Password & Key Generator
11. **Security & Privacy Centers:** Password Auditor & Network Transparency Monitor

## Running Locally
Launch `index.html` in any modern web browser or run via static HTTP server:
```bash
python3 -m http.server 8000
```
Open `http://localhost:8000`.
