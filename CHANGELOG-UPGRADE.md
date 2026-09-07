# CHANGELOG - SUITE MAJOR UPGRADES

## [2.1.0] - 2026-09-07 (Session 16 - Grid Functional Completion)

### Added
- **Undo / Redo History Stack:** Implemented history stack (`undoGridAction`, `redoGridAction`) supporting `Ctrl+Z` and `Ctrl+Shift+Z` keyboard shortcuts.
- **Row Filtering Engine:** Implemented row filter modal (`openGridFilterModal`, `clearGridFilter`) dynamically filtering table rows by column search query.
- **Freeze Panes:** Implemented sticky top row and first column freeze controls (`toggleFreezePanes`).
- **Spreadsheet Keyboard Navigation:** Implemented navigation via `Arrow keys`, `Tab`, `Shift+Tab`, `Enter`, and `Shift+Enter`.
- **Find & Replace Modal:** Added Find & Replace modal (`openGridFindReplaceModal`) replacing matches across sheet values and formulas.
- **Cell Context Menu & Comments:** Added right-click cell context menu (`showGridContextMenu`) and local cell notes/comments (`addGridCellNote`).
- **Status Bar Metrics:** Added status bar indicator showing active cell, sheet name, filter state, and selected cell metrics.
- **Expanded Formula Library:** Added support for `COUNTIF`, `SUMIF`, `AVERAGEIF`, `VLOOKUP`, `INDEX`, `MATCH`, `ROUNDUP`, `ROUNDDOWN`, `NOW`, `IFERROR`, `CONCATENATE`, `LEFT`, `RIGHT`, `MID`.
- **RFC-Compliant CSV Parser:** Replaced basic string split with RFC-compliant CSV parser handling quoted strings and escaped commas.

### Fixed
- Wired all ribbon controls so zero dead or decorative buttons exist on the UI.
- Upgraded Grid spreadsheet engine with multi-tab Suite Command Ribbon, history stack, and expanded formula functions.
