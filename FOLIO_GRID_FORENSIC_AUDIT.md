# FOLIO & GRID FORENSIC AUDIT

**Date:** September 2026
**Auditor:** Jules (Software Engineer)
**Scope:** Forensic inventory of all Folio and Grid functions, controls, data models, persistence mechanisms, and export options.

---

## 1. FOLIO FUNCTION INVENTORY & STATUS

| Function | Exists | Wired | Actually Works | Persists | Undo | Offline | Export | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `getFolioDocument()` | Yes | Yes | Yes | Yes | N/A | Yes | N/A | **PASS** |
| `saveFolioDocument()` | Yes | Yes | Yes | Yes | N/A | Yes | N/A | **PASS** |
| `formatDocText()` | Yes | Yes | Yes | No | Yes | Yes | N/A | **PASS** |
| `setFolioStyle()` | Yes | Yes | Yes | No | Yes | Yes | N/A | **PASS** |
| `insertFolioTable()` | Yes | Yes | Yes | Yes | Yes | Yes | Yes | **PASS** |
| `insertFolioPageBreak()` | Yes | Yes | Yes | Yes | Yes | Yes | Yes | **PASS** |
| `generateFolioTOC()` | Yes | Yes | Yes | Yes | Yes | Yes | Yes | **PASS** |
| `insertFolioFootnote()` | Yes | Yes | Yes | Yes | Yes | Yes | Yes | **PASS** |
| `insertFolioEndnote()` | Yes | Yes | Yes | Yes | Yes | Yes | Yes | **PASS** |
| `insertFolioEquation()` | Yes | Yes | Yes | Yes | Yes | Yes | Yes | **PASS** |
| `setFolioPageSettings()` | Yes | Yes | Yes | Yes | Yes | Yes | Yes | **PASS** |
| `setFolioWatermark()` | Yes | Yes | Yes | Yes | Yes | Yes | Yes | **PASS** |
| `toggleFolioTrackChanges()` | Yes | Yes | Yes | Yes | N/A | Yes | N/A | **PASS** |
| `addFolioComment()` | Yes | Yes | Yes | Yes | Yes | Yes | Yes | **PASS** |
| `exportDocsPDF()` | Yes | Yes | Yes | N/A | N/A | Yes | Yes | **PASS** |
| `exportDocsDOCX()` | Yes | Yes | Yes | N/A | N/A | Yes | Yes | **PASS** |

---

## 2. GRID FUNCTION INVENTORY & STATUS

| Function | Exists | Wired | Actually Works | Persists | Undo | Offline | Export | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `getGridWorkbook()` | Yes | Yes | Yes | Yes | N/A | Yes | N/A | **PASS** |
| `saveGridWorkbook()` | Yes | Yes | Yes | Yes | N/A | Yes | N/A | **PASS** |
| `evalGridFormula()` | Yes | Yes | Yes | Yes | N/A | Yes | N/A | **PASS** |
| `onGridCellBlur()` | Yes | Yes | Yes | Yes | Yes | Yes | N/A | **PASS** |
| `formatActiveCell()` | Yes | Yes | Yes | Yes | Yes | Yes | N/A | **PASS** |
| `addGridRow()` | Yes | Yes | Yes | Yes | Yes | Yes | N/A | **PASS** |
| `addGridCol()` | Yes | Yes | Yes | Yes | Yes | Yes | N/A | **PASS** |
| `addGridSheet()` | Yes | Yes | Yes | Yes | Yes | Yes | N/A | **PASS** |
| `sortGridColumn()` | Yes | Yes | Yes | Yes | Yes | Yes | N/A | **PASS** |
| `setGridFilter()` | Yes | Yes | Yes | Yes | Yes | Yes | N/A | **PASS** |
| `generateGridChart()` | Yes | Yes | Yes | Yes | N/A | Yes | N/A | **PASS** |
| `exportGridCSV()` | Yes | Yes | Yes | N/A | N/A | Yes | Yes | **PASS** |
| `exportSheets()` | Yes | Yes | Yes | N/A | N/A | Yes | Yes | **PASS** |
