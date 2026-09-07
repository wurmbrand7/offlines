# CHANGELOG - SUITE MAJOR UPGRADES

## [2.2.0] - 2026-09-07 (Session 16 - Folio Document Studio Upgrade)

### Added
- **Canonical Document Format:** Introduced versioned `.folio` payload format (`"format": "folio", "version": 1`) with automatic backward-compatible migration.
- **Folio Shell & Inspector Panel:** Added split canvas layout with right Inspector panel containing Outline, Version History, and Document Properties tabs.
- **Clickable Document Outline:** Implemented dynamic heading outline (`H1`, `H2`, `H3`) with smooth scroll-to-section navigation.
- **Slash Command Menu:** Implemented block insertion menu on typing `/` (Headings, Tables, Quotes, Page Breaks).
- **Rich Table Engine & Local Attachments:** Added table insertion and local attachment repository with download capabilities.
- **Comments & Review Layer:** Added text selection commenting, comment list, and resolve/reopen controls.
- **Version History & Comparison:** Added history snapshot creation, snapshot restore, and version length comparison.
- **Templates & Placeholders:** Implemented template creation engine with `{{PROJECT_NAME}}` and `{{DATE}}` replacement.
- **Cross-Module Task & Event Creation:** Added text selection conversion directly to Docket tasks and Almanac events.
- **Focus Mode & Find/Replace:** Added writing Focus Mode (`Ctrl+Shift+P`) and Find & Replace modal (`Ctrl+F`, `Ctrl+H`).
- **Automated Test Suite:** Created `tests/folio_e2e.py` verifying Folio capabilities with 100% pass rate and 0 console errors.

## [2.1.0] - 2026-09-07 (Session 16 - Grid Functional Completion)
- Added Undo/Redo history stack, row filtering engine, freeze panes, Find & Replace modal, keyboard navigation, cell notes, status bar metrics, and expanded formula functions.
