# OFFLINES / Suite Changelog & Release Notes

**Current Version:** 2026.13 — Session 13 Forensic Corrections
**Architect:** Jules

---

## Session 13 — Forensic Corrections & Test-Backed Audit (Active)

### Architectural & Documentation Corrections
- **Strict Instruction Hierarchy:** Applied strict instruction hierarchy where Session Directives > Executable Source Code > Automated Test Evidence > `SUITE_CURRENT_SPEC.md` > Historical Documents.
- **Reconciled 23 Module Specification:** Corrected module documentation across `SUITE_CURRENT_SPEC.md`, `ENTITLEMENTS.md`, `SUITE_FEATURE_MATRIX.md`, and `SUITE_DEEP_AUDIT.md` to precisely match the 23 source modules defined in `ALL_MODULES` in `index.html`.
- **Storage Layer Correction:** Removed unverified historical claims of `IndexedDB` usage. Documented actual storage primitives: `localStorage` (scoped with `suite_` prefix) and Web Crypto API (`window.crypto.subtle`).
- **Residual Licensing Cleanup:** Removed obsolete `lockOverlayHTML()` helper and vestigial licensing references from `index.html` while preserving `suite-license/` as isolated future infrastructure.
- **Executable E2E Test Suite:** Built `tests/verify_suite_e2e.py` automated Playwright test suite to back all audit status ratings with executable code artifacts (100% pass rate, 0 console errors).

---

## Historical Releases

### Session 12 — Open Access Mode & Spec Initialization
- Introduced `OPEN_DEVELOPMENT_MODE = true` configuration and unlocked all workspace modules for unrestricted development testing.
- Created initial `ARCHITECTURE_CONFLICT_AUDIT.md` mapping historical spec claims against current requirements.

### Version 2026.1 — UI Workstation Overhaul & Security Suite Integration
- **Dark Graphite UI Design System:** Implemented sleek security workstation layout with responsive navigation, global search, and command palette (`⌘K`).
- **Advanced Password Manager:** Web Crypto `AES-256-GCM` multi-vault credential manager across 9 categories.
- **Security Tools:** Integrated Forge credential generator, Verifier 2FA TOTP authenticator, Passkeys registry, and Password Health audit dashboard.
- **Zero-Server Isolation & Network Transparency:** Observable `loggedFetch()` request monitor verifying zero user bytes transmitted.
