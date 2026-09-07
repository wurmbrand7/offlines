# OFFLINES / Suite Current Product Specification

**Specification Version:** 2026.13 (Session 13 Forensic Correction)
**Status:** FULL OPEN DEVELOPMENT MODE
**Instruction Hierarchy & Authority:**
1. Session 13 Task Specification Directives
2. Actual Executable Source Code (`index.html` & ecosystem)
3. Executable E2E Test Suite Results (`tests/verify_suite_e2e.py`)
4. This Document (`SUITE_CURRENT_SPEC.md`)
5. Historical Architecture & Audit Documentation

---

## 1. Product Status & Philosophy

### Commercial Policy
- **NO PRICING**
- **NO BILLING**
- **NO LICENSING ENFORCEMENT**
- **NO PRO UNLOCK LOCKS**
- **NO SUBSCRIPTIONS**

Every module implemented in the source code is 100% open and testable before any commercial model is introduced.

### Storage Architecture & Invariants
- **Actual Storage Primitives:** `localStorage` (scoped by prefix `suite_`) and Web Crypto API (`window.crypto.subtle`).
- **Storage Correction:** Historical claims of `IndexedDB` usage have been removed to reflect actual source implementation.
- **Serverless Data Isolation:** 100% of user data remains localized on the user device. The server only serves static application assets (HTML, CSS, JS, Manifest, Service Worker).

---

## 2. Reconciled 23 Source Workspace Modules

Catalog of the 23 modules defined in `ALL_MODULES` in `index.html`:

| Category | Module ID | Label in UI | File Extension | Development Access |
| :--- | :--- | :--- | :--- | :--- |
| **WORKSPACE** | `today` | Overview | (Dashboard) | Open / Unlocked |
| | `projects` | Projects | `.proj` | Open / Unlocked |
| | `canvas` | Canvas / Graph | `.graph` | Open / Unlocked |
| **ORGANIZE** | `files` | Files | `.fils` | Open / Unlocked |
| | `notes` | Notes (Spot) | `.spot` | Open / Unlocked |
| | `tasks` | Tasks (Docket) | `.plot` | Open / Unlocked |
| | `agenda` | Calendar (Almanac) | `.agnd` | Open / Unlocked |
| | `contacts` | Contacts | `.ctac` | Open / Unlocked |
| **SECURE** | `passwords` | Passwords | `.vault` | Open / Unlocked |
| | `passkeys` | Passkeys | `.pkey` | Open / Unlocked |
| | `totp` | OTP / Verifier | `.totp` | Open / Unlocked |
| | `wallet` | Cards / Wallet | `.card` | Open / Unlocked |
| | `identities` | Identities | `.id` | Open / Unlocked |
| | `lockbox` | Secure Files | `.lbox` | Open / Unlocked |
| | `secrets` | Secrets | `.key` | Open / Unlocked |
| **CREATE** | `docs` | Documents (Folio) | `.folio` | Open / Unlocked |
| | `sheets` | Tables (Grid) | `.grid` | Open / Unlocked |
| | `forms` | Forms (Fill) | `.fill` | Open / Unlocked |
| | `slides` | Presentations (Glides) | `.glides` | Open / Unlocked |
| **SYSTEM** | `activity` | Network Monitor | (Monitor) | Open / Unlocked |
| | `backups` | Backups | (Capsule) | Open / Unlocked |
| | `security` | Security Center | (Security) | Open / Unlocked |
| | `privacy` | Privacy Center | (Privacy) | Open / Unlocked |

---

## 3. Configuration & Open Access Boundary

```javascript
// Active Application Configuration in index.html
const OPEN_DEVELOPMENT_MODE = true;
window._licensed = true;
function isLicensed(){ return true; }
async function refreshLicenseState(){ window._licensed = true; }
```

When `OPEN_DEVELOPMENT_MODE` is active:
1. Every one of the 23 modules renders natively without lock prompts or paywall barriers.
2. Encrypted Backup Capsule export and import operates freely without requiring license key entry.
3. Network traffic passes through `loggedFetch()`, presenting an observable 0-byte transmit log.
