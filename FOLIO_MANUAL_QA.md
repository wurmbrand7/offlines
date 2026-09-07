# FOLIO MANUAL QA CHECKLIST

**Audit Date:** September 7, 2026
**Auditor:** Suite Lead Core Engineer
**Target Module:** Folio Document Studio (`#panel-docs`)

---

## 1. Responsive Layout Verification

| Viewport Resolution | Target Device | Layout Behavior | Status |
| :--- | :--- | :--- | :--- |
| **1440 × 900** | Desktop Workstation | Full split layout (Canvas + Inspector Panel) | **PASS** |
| **1024 × 768** | Tablet Landscape | Flexible inspector panel with responsive toolbar | **PASS** |
| **768 × 1024** | Tablet Portrait | Stacked editor canvas and inspector tabs | **PASS** |
| **390 × 844** | Mobile Device | Compact toolbar, full-width canvas, scrollable inspector | **PASS** |

---

## 2. Interactive Feature QA Checklist

- [x] **Document Title Editing:** Auto-saves title directly into canonical `.folio` schema.
- [x] **Heading Outline:** Dynamically extracts `H1`, `H2`, `H3` headings and scrolls page smoothly on click.
- [x] **Slash Command Menu:** Opens menu on typing `/` and inserts H1, H2, Quotes, Tables, or Page Breaks.
- [x] **Table Engine:** Inserts styled HTML tables into `#docsEditor`.
- [x] **Image & Attachments:** Supports local file reading and attachment metadata tracking.
- [x] **Text Comments:** Prompts for selected text comments and tracks resolved state.
- [x] **Find & Replace:** Replaces occurrences across document text via Find/Replace modal.
- [x] **Version History Snapshots:** Creates snapshots and allows single-click version restoration.
- [x] **Templates & Placeholders:** Instantiates templates with `{{PROJECT_NAME}}` replacement.
- [x] **Cross-Module Tasks & Events:** Creates Docket tasks and Almanac events directly from text selection.
- [x] **Print / PDF:** Triggers native print dialog formatted for print stylesheets.
