# OFFLINES / Suite Current Product Specification

**Specification Version:** 2026.12 (Session 12 Active Spec)
**Status:** FULL OPEN DEVELOPMENT MODE
**Authoritative Rule:** This document and Session 12 Directives override all historical architecture documents (`architecture.md`, `ENTITLEMENTS.md`, etc.).

---

## 1. Product Status & Philosophy

### Current Commercial Status
- **NO PRICING**
- **NO BILLING**
- **NO LICENSING ENFORCEMENT**
- **NO PRO UNLOCK LOCKS**
- **NO SUBSCRIPTIONS**

The entire OFFLINES suite must be 100% accessible and testable before any commercial model is introduced.

### Product Principle
- **Serverless-by-Default & Local-First:** The server delivers static application assets (HTML, CSS, JS). The server NEVER receives or processes private user data.
- **Zero-Server Isolation:** 100% of user data (documents, passwords, TOTP secrets, files, forms, spreadsheets, notes, calendar events) remains strictly localized on the user's device in Web Crypto memory, `localStorage`, and `IndexedDB`.

---

## 2. Core Workspace Modules (All 23 Fully Unlocked)

| Category | Module ID | Description | Development Access |
| :--- | :--- | :--- | :--- |
| **WORKSPACE** | `overview` | Workspace Dashboard & Security Health | Open / Unlocked |
| | `projects` | Cross-module Project Containers | Open / Unlocked |
| | `graph` | Work Graph Visual Relationship Engine | Open / Unlocked |
| **ORGANIZE** | `files` | File Manager & Storage Inspector | Open / Unlocked |
| | `spot` | Spot Block Notes & Backlinks | Open / Unlocked |
| | `docket` | Docket Task Workflow | Open / Unlocked |
| | `almanac` | Almanac Calendar & Time Planner | Open / Unlocked |
| | `contacts` | Contacts Directory & Vault Links | Open / Unlocked |
| **SECURE** | `passwords` | Multi-Vault Password Manager | Open / Unlocked |
| | `passkeys` | Passkeys Registry | Open / Unlocked |
| | `verifier` | Verifier 2FA TOTP Authenticator | Open / Unlocked |
| | `forge` | Forge Credential Generator | Open / Unlocked |
| | `lockbox` | Lockbox Encrypted File Vault | Open / Unlocked |
| | `health` | Password Health Audit | Open / Unlocked |
| **CREATE** | `folio` | Folio Document Studio | Open / Unlocked |
| | `grid` | Grid Spreadsheet & Formulas Engine | Open / Unlocked |
| | `fill` | Fill Form Builder & Responses | Open / Unlocked |
| | `glides` | Glides Presentation Studio | Open / Unlocked |
| **SYSTEM** | `privacy` | Network Transparency Monitor | Open / Unlocked |
| | `backups` | Encrypted Backup Capsule | Open / Unlocked |
| | `settings` | System Configuration | Open / Unlocked |

---

## 3. Configuration & Feature Boundary

```javascript
// Active Application Configuration
const OPEN_DEVELOPMENT_MODE = true;

function isLicensed() {
  // Always returns true in Open Development Mode
  return true;
}
```

When `OPEN_DEVELOPMENT_MODE` is active:
1. Every module and feature is 100% accessible.
2. No lock overlays (`lockOverlayHTML`) or paywalls appear.
3. No license key input or server verification (`tryActivate`) is enforced.
4. Users can export/import encrypted backup capsules without restriction.

---

## 4. Verification & Testing

All modules must be independently verified using automated Playwright tests and Node.js syntax checks. Any feature claiming `PASS` must be demonstrably functional.
