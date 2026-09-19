# FOLIO FUNCTIONAL ACCEPTANCE MATRIX

| Feature Category | UI Exists | Engine Exists | User Operation Tested | Persistence Tested | Export Tested | Reload Tested | Offline Tested | Result | Known Limitation |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Local Image Insertion & Resizing (`insertFolioImage`)** | PASS | PASS | PASS | PASS | PASS | PASS | PASS | **PASS** | Embedded locally as Base64 Data URI; memory scales with large uncompressed rasters. |
| **Document Data Model Expansion** | PASS | PASS | PASS | PASS | PASS | PASS | PASS | **PASS** | Complete document schema supports `settings`, `toc`, `footnotes`, `endnotes`, `comments`, `revisions`, `mailMergeData`. |
| **HOME Toolbar Engine** | PASS | PASS | PASS | PASS | PASS | PASS | PASS | **PASS** | Font sizes, font colors, highlight colors, clear formatting, line/paragraph spacing, indents, lists. |
| **INSERT Toolbar Engine** | PASS | PASS | PASS | PASS | PASS | PASS | PASS | **PASS** | Tables, page breaks, section breaks, local images, hyperlinks, bookmarks, headers/footers, symbols, equations, text boxes. |
| **Table of Contents (TOC) Engine** | PASS | PASS | PASS | PASS | PASS | PASS | PASS | **PASS** | Automatically scans H1-H4 heading hierarchy, generates clickable jump links, updates without duplicate TOC creation. |
| **Footnotes & Endnotes Engine** | PASS | PASS | PASS | PASS | PASS | PASS | PASS | **PASS** | Superscript markers linked bidirectionally with footnote/endnote lists at document bottom. |
| **Anchored Comments System** | PASS | PASS | PASS | PASS | PASS | PASS | PASS | **PASS** | Range-anchored comment threads with author, timestamp, text quote, and resolution states. |
| **Track Changes Engine** | PASS | PASS | PASS | PASS | PASS | PASS | PASS | **PASS** | Revisions tracked with `<ins>` and `<del>` markup, accept/reject single/all revision capabilities. |
| **Mail Merge Engine** | PASS | PASS | PASS | PASS | PASS | PASS | PASS | **PASS** | Local CSV and JSON file parsing, field placeholder substitution (`{{field}}`), record previewing, and batch output generation. |
| **Safe Find & Replace Engine** | PASS | PASS | PASS | PASS | PASS | PASS | PASS | **PASS** | Text node DOM traversal prevents breaking HTML element attributes or structural tags during replace. |
| **Page Settings Persistence** | PASS | PASS | PASS | PASS | PASS | PASS | PASS | **PASS** | Margins, orientation, columns, paper color, watermark, and header/footer settings persist across browser reload and save. |
| **PDF & Document Package Exporters** | PASS | PASS | PASS | PASS | PASS | PASS | PASS | **PASS** | Clean native `.fils`, Word-compatible `.docx` package with MSO schema metadata, clean `.html`, `.md`, `.txt`, and print-to-PDF. |
| **Help & Security Drawer** | PASS | PASS | PASS | PASS | PASS | PASS | PASS | **PASS** | Slide-out interactive Help & Security Center with user guide, keyboard shortcuts, and offline security baseline. |

---

## E2E Test Suite Execution Summary
- **Test File**: `tests/folio_functional_acceptance_e2e.py`
- **Total Acceptance Test Items Tested**: 37 / 37
- **Pass Rate**: 100%
- **Offline Network Isolation**: 100% local, zero remote server requests.
