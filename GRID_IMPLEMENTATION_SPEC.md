# GRID IMPLEMENTATION SPECIFICATION

**Version:** 2.0 (Session 14 Upgrade)
**Target Module:** Grid Spreadsheet Studio (`#panel-sheets` / `.grid`)
**Source Location:** `index.html`

---

## 1. Executive Architecture Overview

Grid is transformed into an offline-first, professional-grade desktop data studio. The design incorporates a custom **Suite Command Ribbon**, multi-sheet workbooks, formula calculation engine with dependency resolution, cell range selection, rich cell formatting, chart rendering, and offline JSON `.grid` / CSV import/export.

### Key Principles
1. **Zero Server Dependency:** All data calculations, formatting, charts, and workbook state remain local (`localStorage` key `suite_sheets`).
2. **Distinct Suite Design:** High visual hierarchy using Suite's dark graphite palette (`#0f172a`, `#1e293b`, `#3b82f6`, `#10b981`) without mimicking trademarked competitor trade dress.
3. **Backward Compatibility:** Seamless automatic migration from legacy single-sheet 8x6 schema to multi-sheet workbook structure.

---

## 2. Suite Command Ribbon Architecture

The top interface of Grid features a tabbed ribbon container (`#gridRibbonContainer`). Clicking a ribbon tab displays its corresponding command tool group.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ [Start] [Format] [Insert] [Data] [Formulas] [Review] [View] [Automate]          │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [Tool Group 1 | Tool Group 2 | Tool Group 3 | Tool Group 4 | Tool Group 5]     │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Tab Tool Group Specifications

| Ribbon Tab | Group 1 | Group 2 | Group 3 | Group 4 | Group 5 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Start** | Undo / Redo | Cut / Copy / Paste | Font (Bold, Italic, Color, BG) | Alignment (Left, Center, Right) | Quick Save / Export |
| **Format** | Number Types (General, Currency, %, Date) | Decimal Places (.0 / .00) | Borders & Shading | Conditional Formatting Rules | Clear Formats |
| **Insert** | Insert Row / Column | Delete Row / Column | Charts (Bar, Line, Pie) | Summary KPI Cards | Smart Table |
| **Data** | Sort Ascending / Descending | Filter Controls | Data Validation | Remove Duplicates | Text to Columns |
| **Formulas** | AutoSum (SUM, AVG, MIN, MAX) | Financial Functions | Logical Functions | Math & Trig | Function Library Modal |
| **Review** | Calculation Audit | Inspect Cell Dependencies | Formula Guide | Data Integrity Check | Protect Sheet |
| **View** | Gridlines Toggle | Formula Bar Toggle | High Density View | Zoom Preset | Split View |
| **Automate** | Quick Rule Builder | Local Event Triggers | Record Action Macro | Run Automation | Reset Automation |

---

## 3. Data Schema & Migration Layer

### 3.1 Multi-Sheet Workbook Schema (`suite_sheets`)

```typescript
interface SuiteGridWorkbook {
  version: "2.0";
  activeSheetIndex: number;
  sheets: SuiteSheet[];
  created: number;
  modified: number;
}

interface SuiteSheet {
  id: string;
  name: string;
  rows: number; // Default 15, expandable to 100+
  cols: number; // Default 10 (A-J), expandable to 26+
  cells: Record<string, SuiteCell>; // e.g. "A1": { raw: "=B1*2", val: "200", format: "currency", bold: true }
  selectedRange?: string; // e.g. "A1:B5"
}

interface SuiteCell {
  raw: string;           // Input value or formula string
  val?: string | number; // Evaluated display value
  format?: 'general' | 'currency' | 'percent' | 'number' | 'date' | 'status';
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
  bg?: string;
  color?: string;
}
```

### 3.2 Legacy Migration Logic

If `localStorage.getItem('suite_sheets')` contains legacy key-value data (e.g. `{"A1": "100"}`), the engine converts it into a valid 2.0 Workbook object:

```javascript
function migrateGridData(raw) {
  if (raw && raw.version === "2.0" && Array.isArray(raw.sheets)) return raw;
  // Convert legacy single-sheet data
  return {
    version: "2.0",
    activeSheetIndex: 0,
    sheets: [{
      id: "sheet-1",
      name: "Sheet 1",
      rows: 15,
      cols: 10,
      cells: typeof raw === 'object' && raw !== null ? convertLegacyCells(raw) : {}
    }],
    created: Date.now(),
    modified: Date.now()
  };
}
```

---

## 4. Advanced Formula Engine Specification

### 4.1 Dependency Resolution & Topological Sorting
To evaluate formula expressions correctly without stale values or infinite loops, the engine builds a Directed Acyclic Graph (DAG) of cell references and evaluates cells in topological order.

### 4.2 Function Library
* **Math & Arithmetic:** `+`, `-`, `*`, `/`, `^`, `SUM`, `AVERAGE`, `MIN`, `MAX`, `COUNT`, `COUNTA`, `ROUND`, `ABS`, `SQRT`, `POWER`, `MOD`.
* **Logical & Conditional:** `IF`, `AND`, `OR`, `NOT`, `SUMIF`, `COUNTIF`, `IFERROR`.
* **Text Operations:** `CONCAT`, `UPPER`, `LOWER`, `LEN`, `TRIM`, `LEFT`, `RIGHT`.
* **Financial & Data:** `PMT`, `VLOOKUP`, `INDEX`, `MATCH`.

---

## 5. UI Canvas, Formula Bar & Chart Visualization

### 5.1 Interactive Formula Bar
Located between the Command Ribbon and the Grid Canvas:
```
┌──────────┬────────────────────────────────────────────────────────────────────────┐
│  [ A1 ]  │  fx  |=SUM(B1:B10)                                                     │
└──────────┴────────────────────────────────────────────────────────────────────────┘
```
* **Coordinate Indicator (`#gridActiveCellCoord`):** Displays currently selected cell or range (e.g. `B3` or `A1:C5`).
* **Formula Input (`#gridFormulaInput`):** Two-way binding with active cell raw input.

### 5.2 Sheet Tabs & Controls
Located beneath the Grid Canvas:
* Sheet tab buttons (`Sheet 1`, `Sheet 2`, `+ New Sheet`).
* Context menu / buttons to rename, duplicate, reorder, or delete sheets.

### 5.3 Embedded Chart Visualization (`#gridChartContainer`)
Supports dynamically rendered SVG/Canvas charts based on selected cell ranges:
* **Bar / Column Chart:** Compares categories vs numeric values.
* **Line Chart:** Displays trends across sequential data.
* **Pie Chart:** Proportional breakdown of single-column datasets.

---

## 6. Offline Persistence, Import & Export

* **Autosave:** Triggered on cell blur, ribbon formatting, or sheet operation. Saves directly to `suite_sheets` in `localStorage`.
* **`.grid` Export:** Downloads complete `SuiteGridWorkbook` JSON payload.
* **CSV Export:** Converts active sheet cells to standard Comma-Separated Values string.
* **Import Engine:** Supports `.grid` JSON files and standard `.csv` file parsing.
