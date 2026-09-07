# OFFLINES / Suite Entitlements & Licensing Specification

**Architecture Specification:** Entitlements, Licensing & Open Access Architecture
**Scope:** OFFLINES Core (`index.html`), Standalone Launchers (`/standalone/*.html`), and License Server (`/suite-license/`)

---

## 1. Architectural Philosophy

OFFLINES operates on a **Serverless-by-Default, Local-First** paradigm. The primary premise of the product architecture is:

> **The server delivers the application assets. The server NEVER receives the user's private data.**

Under this model:
1. **User Data Entitlement:** The user owns 100% of their data stored in client memory/IndexedDB/localStorage. No user account, registration, or server handshake is required to access or process personal data.
2. **Open Access Development Mode:** To facilitate unrestricted local testing, development, and auditing of all 23 modules, the client application executes with `window._licensed = true` and `isLicensed() === true` by default.

---

## 2. Entitlement Map & Module Rules

All 23 workspace modules fall under the unified Open Access model:

| Module Key | Friendly Name | Category | License Rule in Open Access Mode |
| :--- | :--- | :--- | :--- |
| `overview` | Workspace Dashboard | WORKSPACE | Unrestricted / Open |
| `projects` | Projects Hub | WORKSPACE | Unrestricted / Open |
| `graph` | Work Graph Canvas | WORKSPACE | Unrestricted / Open |
| `files` | Files Manager | ORGANIZE | Unrestricted / Open |
| `spot` | Spot Notes | ORGANIZE | Unrestricted / Open |
| `docket` | Docket Tasks | ORGANIZE | Unrestricted / Open |
| `almanac` | Almanac Calendar | ORGANIZE | Unrestricted / Open |
| `contacts` | Contacts Directory | ORGANIZE | Unrestricted / Open |
| `passwords` | Password Vault | SECURE | Unrestricted / Open |
| `passkeys` | Passkeys Registry | SECURE | Unrestricted / Open |
| `verifier` | Verifier (2FA TOTP) | SECURE | Unrestricted / Open |
| `forge` | Forge Generator | SECURE | Unrestricted / Open |
| `lockbox` | Lockbox Encrypted Files | SECURE | Unrestricted / Open (Non-Blocking) |
| `health` | Password Health Audit | SECURE | Unrestricted / Open |
| `folio` | Folio Document Studio | CREATE | Unrestricted / Open |
| `grid` | Grid Spreadsheet | CREATE | Unrestricted / Open (Non-Blocking) |
| `fill` | Fill Form Builder | CREATE | Unrestricted / Open (Non-Blocking) |
| `glides` | Glides Presentations | CREATE | Unrestricted / Open (Non-Blocking) |
| `privacy` | Privacy Center | SYSTEM | Unrestricted / Open |
| `backups` | Encrypted Backup Capsule| SYSTEM | Unrestricted / Open (Non-Blocking) |
| `settings` | System Settings | SYSTEM | Unrestricted / Open |

---

## 3. License Verification Architecture (`isLicensed()`)

### Function Contract
```javascript
function isLicensed() {
  // Open Development Mode: Always returns true to grant complete access
  // across all 23 modules without requiring key activation.
  return true;
}
```

### Server License Proxy Protocol (Optional Production Integration)
When connected to an optional license verification server (`/suite-license/verify.php`):
1. The client generates a local SHA-256 device fingerprint.
2. The client submits `key` + `fingerprint` to `/verify.php`.
3. The server responds with `{ valid: true/false, slots_remaining: N }`.
4. The client saves `suite_pro_key` in `localStorage`.
5. **Data Isolation Invariant:** The license handshake contains **ZERO user content or vault data**.

---

## 4. Backup & Data Mobility Entitlements

The user retains an unalienable entitlement to export and import their entire local database at any time:
- **Export Format:** `.offline` (JSON package containing documents, notes, vault items, forms, and settings).
- **Encryption:** AES-256-GCM authenticated encryption using user-supplied export password.
- **Import Capability:** Restorable on any compatible browser running OFFLINES, with zero cloud dependency.
