# OFFLINES / Suite Architecture Conflict Audit

**Audit Date:** March 2026 (Session 13 Forensic Audit)
**Auditor:** Jules (Principal Engineer)

---

## 1. Specification Conflict Matrix & Resolution

| Document / Area | Historical Claim / Issue | Conflict Status | Session 13 Resolution |
| :--- | :--- | :--- | :--- |
| **Instruction Hierarchy** | Historical `architecture.md` treated as supreme authority | **CONFLICT** | Established strict instruction hierarchy where Session Directives > Source Code > Test Evidence > Current Spec > Historical Docs. |
| **Module List Alignment** | Mismatch between docs and the 23 source modules | **CONFLICT** | Reconciled all documentation files (`SUITE_CURRENT_SPEC.md`, `ENTITLEMENTS.md`, `SUITE_FEATURE_MATRIX.md`, `SUITE_DEEP_AUDIT.md`) against `ALL_MODULES` in `index.html`. |
| **Storage Architecture** | Historical claims of `IndexedDB` usage | **CONFLICT** | Corrected documentation to accurately specify `localStorage` (scoped with `suite_` prefix) and Web Crypto API (`window.crypto.subtle`). |
| **Audit Status Claims** | Blanket `PASS` claims without executable test artifacts | **CONFLICT** | Built executable E2E Playwright test suite in `tests/verify_suite_e2e.py` to substantiate all audit status ratings. |
| **Residual Licensing JS** | Vestigial `lockOverlayHTML()` helper in `index.html` | **CONFLICT** | Cleaned up vestigial licensing helper code while maintaining `suite-license/` as isolated future infrastructure. |

---

## 2. Active Governance Rule

If any lower-priority historical document (`architecture.md`, old audit reports, old changelogs) conflicts with Session Directives or executable source code, **Session Directives and Source Code execution win**.
