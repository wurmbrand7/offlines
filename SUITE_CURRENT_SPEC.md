# [HISTORICAL — NOT CURRENT] SUITE SPECIFICATION

**Product:** OFFLINES / Suite (Historical Reference)
**Build ID:** `LOCAL-ONLY-2026-09-10-V4` (HISTORICAL — Current Build is V6)
**Deployment Policy:** `suite-cache-v4` (Network-first navigation HTML with cache fallback)
**Architecture:** 100% Standalone Local-First Privacy Operating Suite
**Status:** Active

---

## 1. ARCHITECTURAL DECISION & BUILD FINGERPRINT
OFFLINES is strictly an offline privacy operating suite.
- **Build Fingerprint:** `window.SUITE_BUILD_ID = "LOCAL-ONLY-2026-09-10-V4"`, registered in `BUILD_INFO.json` and Diagnostics panel.
- **Service Worker Cache Policy:** `suite-cache-v4` performs full activation cache-busting to purge legacy sync/hybrid assets and enforces network-first navigation handling.
- **Website Role:** Asset distribution and application update delivery channel only.
- **Runtime Environment:** Device local execution via browser, PWA, or standalone HTML entry points.
- **User Data Boundaries:** User data (documents, spreadsheets, forms, notes, tasks, events, presentations, vault secrets) is stored exclusively on the user's device in IndexedDB (`offlines_suite_db` v2) and `localStorage`.
- **Server Interaction:** ZERO runtime server endpoints, zero remote databases, zero telemetry, zero analytics, zero external API keys, zero sync backends, and zero paywalls.

---

## 2. MODULE MAP
1. **Folio (`.fils`):** Document Studio (rich editor, outline generator, inspector, table insertion, PDF/DOCX/TXT/HTML export).
2. **Grid (`.grid`):** Data Studio (spreadsheet engine, ribbon commands, formulas, multi-sheet, CSV/JSON/.grid import/export).
3. **Fill (`.fill`):** Form Studio (form designer, field builder, submission records).
4. **Spot (`.spot`):** Capture & Notes Studio (kanban board, library, backlinks).
5. **Docket (`.plot`):** Task Studio (visual coordinate matrix, task tracking).
6. **Almanac (`.agnd`):** Time Studio (agenda, calendar, countdown timers, recurring events).
7. **Glides (`.glides`):** Presentation Studio (deck builder, filmstrip, slide embeds).
8. **Lockbox (`.lbox`):** Private Vault (AES-256-GCM encrypted secret locker, PBKDF2 key derivation, TOTP authenticator).
9. **Security Center (`.sec`):** Real-time local security dashboard calculating password health scores dynamically from local vault items.
10. **Privacy Center:** Factual 0-byte transmission privacy audit dashboard.
11. **Backups:** Offline JSON Capsule import/export with passphrase encryption and user confirmation modal.
12. **Diagnostics:** System build info panel displaying build ID, SW cache version, and zero-server network policy.

---

## 3. STORAGE & SECURITY ARCHITECTURE
- **Structured Data:** Stored in IndexedDB (`offlines_suite_db` v2) with fallback to `localStorage`.
- **Automatic Migration:** On initial startup, existing `localStorage` keys are safely auto-migrated into IndexedDB object stores without data loss.
- **Vault Encryption:** Native Web Crypto API (`crypto.subtle`) using PBKDF2 (100,000 iterations) and AES-256-GCM authenticated encryption. Passphrases and secret keys never leave the browser process.
