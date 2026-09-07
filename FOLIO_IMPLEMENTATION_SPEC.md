# FOLIO IMPLEMENTATION SPECIFICATION

**Version:** 2.0 (Session 16 Upgrade)
**Target Module:** Folio Document Studio (`#panel-docs` / `.folio`)
**Source Location:** `index.html`

---

## 1. Executive Architecture Overview

Folio is transformed into an offline-first, professional-grade desktop document publishing workspace. The design incorporates a split layout with a **Page Canvas Container** and a **Document Inspector Panel** (Outline, History, Properties), slash command menu (`/`), rich tables, page breaks, local attachments, comment review layer, Find & Replace modal, template placeholder engine, and cross-module task/event integration.

### Key Principles
1. **Zero Server Dependency:** All document contents, attachments, history snapshots, and comments remain local (`localStorage` key `suite_docs`).
2. **Canonical Data Format:** Uses `"format": "folio", "version": 1` with automatic migration from legacy flat HTML payloads.
3. **Distinct Suite Design:** High visual hierarchy using Suite's dark graphite palette (`#0f172a`, `#1e293b`, `#3b82f6`, `#10b981`).

---

## 2. Document Data Schema (`suite_docs`)

```typescript
interface SuiteFolioPayload {
  format: "folio";
  version: 1;
  document: SuiteFolioDocument;
}

interface SuiteFolioDocument {
  id: string;
  title: string;
  metadata: {
    created: number;
    modified: number;
    author: string;
    tags: string[];
    status: string;
    priority: string;
  };
  content: string; // Rich HTML string
  attachments: SuiteFolioAttachment[];
  comments: SuiteFolioComment[];
  history: SuiteFolioVersion[];
  relations: string[];
}

interface SuiteFolioAttachment {
  id: string;
  filename: string;
  size: number;
  data: string; // Base64 data URL
  timestamp: number;
}

interface SuiteFolioComment {
  id: string;
  textSelection: string;
  comment: string;
  author: string;
  timestamp: number;
  resolved: boolean;
}

interface SuiteFolioVersion {
  id: string;
  title: string;
  timestamp: number;
  content: string;
}
```

---

## 3. Inspector Panel Specifications

The right-side inspector (`#folioInspectorContent`) provides tabbed navigation:
- **Outline Tab:** Automatically extracts `<h1>`, `<h2>`, and `<h3>` tags and renders a clickable hierarchy that scrolls smoothly to headings.
- **History Tab:** Displays version snapshots with timestamp metadata, single-click snapshot creation, and restoration capabilities.
- **Properties Tab:** Displays author, creation date, status, and priority metadata.

---

## 4. Cross-Module Integration

- **Folio → Docket Tasks (`createTaskFromFolioSelection`):** Converts selected document text directly into an actionable task in Docket.
- **Folio → Almanac Events (`createAlmanacEventFromFolioSelection`):** Converts selected document text directly into a scheduled calendar event in Almanac.
- **Folio → Spot Margin Notes (`docsAddMarginNote`):** Pins selected text as an anchored note on Spot's canvas.
