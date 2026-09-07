# OFFLINES / Suite Entitlements Specification

**Current Mode:** FULL OPEN DEVELOPMENT MODE
**Active Commercial Policy:** NO PRICING / NO BILLING / NO LOCKS

---

## 1. Development Entitlements Summary

All 23 modules and core workspace engines in OFFLINES are **100% unlocked and open for evaluation, testing, and use**.

There are currently:
- **NO** paid modules
- **NO** pricing tiers ($9 or otherwise)
- **NO** billing mechanisms
- **NO** license key requirements
- **NO** Pro lock overlays
- **NO** feature gates or paywalls

Every feature implemented in the codebase is fully accessible to the user without restriction.

---

## 2. Module Access Matrix

| Module ID | Module Name | Access Status | Enforcement Rule |
| :--- | :--- | :--- | :--- |
| `overview` | Workspace Dashboard | **UNLOCKED** | Free Open Access |
| `projects` | Projects Hub | **UNLOCKED** | Free Open Access |
| `graph` | Work Graph Engine | **UNLOCKED** | Free Open Access |
| `files` | Files Manager | **UNLOCKED** | Free Open Access |
| `spot` | Spot Notes | **UNLOCKED** | Free Open Access |
| `docket` | Docket Tasks | **UNLOCKED** | Free Open Access |
| `almanac` | Almanac Calendar | **UNLOCKED** | Free Open Access |
| `contacts` | Contacts Directory | **UNLOCKED** | Free Open Access |
| `passwords` | Password Vault | **UNLOCKED** | Free Open Access |
| `passkeys` | Passkeys Registry | **UNLOCKED** | Free Open Access |
| `verifier` | Verifier 2FA TOTP | **UNLOCKED** | Free Open Access |
| `forge` | Forge Credential Generator | **UNLOCKED** | Free Open Access |
| `lockbox` | Lockbox Encrypted Files | **UNLOCKED** | Free Open Access |
| `health` | Password Health Audit | **UNLOCKED** | Free Open Access |
| `folio` | Folio Document Studio | **UNLOCKED** | Free Open Access |
| `grid` | Grid Data Studio | **UNLOCKED** | Free Open Access |
| `fill` | Fill Form Builder | **UNLOCKED** | Free Open Access |
| `glides` | Glides Presentations | **UNLOCKED** | Free Open Access |
| `privacy` | Network Monitor | **UNLOCKED** | Free Open Access |
| `backups` | Encrypted Backup Capsule | **UNLOCKED** | Free Open Access |
| `settings` | System Settings | **UNLOCKED** | Free Open Access |

---

## 3. Future Commercial Enforcement (NOT ACTIVE)

If commercial licensing is activated in a future release, the licensing server located in `suite-license/` may be connected. Until explicit user instruction to activate commercial enforcement:
- `OPEN_DEVELOPMENT_MODE = true` remains hardcoded in `index.html`.
- `isLicensed()` consistently evaluates to `true`.
- No user content or private data is ever sent to any license server.
