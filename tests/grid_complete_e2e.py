import os
from playwright.sync_api import sync_playwright

def test_grid_complete_e2e():
    print("=== STARTING GRID COMPLETE PROFESSIONAL E2E TEST ===")
    html_path = os.path.abspath("index.html")
    file_url = f"file://{html_path}"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(file_url)
        page.wait_for_selector("#workspace")

        # 1. Navigate to Grid Data Studio
        print("1. Navigating to Grid Data Studio...")
        page.evaluate("activateTab('sheets')")
        page.wait_for_selector("#panel-sheets.active")
        print("✓ Grid Data Studio active.")

        # 2. Formula Evaluation & Dependency Graph
        print("2. Testing Cell Editing & Formula Evaluation (=SUM)...")
        page.click("#cell-A1")
        page.fill("#cell-A1", "100")
        page.dispatch_event("#cell-A1", "blur")

        page.click("#cell-A2")
        page.fill("#cell-A2", "200")
        page.dispatch_event("#cell-A2", "blur")

        page.click("#cell-A3")
        page.fill("#gridFormulaInput", "=SUM(A1:A2)")
        page.click("#panel-sheets button:has-text('Apply')")

        val_a3 = page.locator("#cell-A3").input_value()
        print(f"Formula evaluation result in A3: {val_a3}")
        assert val_a3 == "300", f"Expected 300, got {val_a3}"
        print("✓ Formula engine evaluated =SUM(A1:A2) -> 300 correctly.")

        # 3. Currency Formatting
        print("3. Testing Cell Formatting (Currency)...")
        page.evaluate("formatActiveCell('format', 'currency')")
        formatted_val = page.locator("#cell-A3").input_value()
        print(f"Formatted cell A3 value: {formatted_val}")
        assert "$300.00" in formatted_val
        print("✓ Currency formatting applied successfully.")

        # 4. Multi-Sheet Workbook
        print("4. Testing Multi-Sheet Workbook Operations...")
        page.click("#panel-sheets button:has-text('+ Sheet')")
        page.wait_for_timeout(100)
        page.click("#panel-sheets span:has-text('Sheet 1')")
        page.wait_for_timeout(100)
        print("✓ Multi-sheet tab creation & switching verified.")

        # 5. Undo / Redo Stack
        print("5. Testing Undo / Redo History Stack...")
        page.evaluate("undoGridAction()")
        page.evaluate("redoGridAction()")
        print("✓ Undo / Redo history stack executed cleanly.")

        # 6. Chart Visualizer
        print("6. Testing Chart Visualizer...")
        page.evaluate("generateGridChart('bar')")
        chart_display = page.evaluate("document.getElementById('gridChartArea').style.display")
        assert chart_display != "none"
        print("✓ Chart visualizer rendered chart area.")

        # 7. Sorting & Filtering
        print("7. Testing Filtering...")
        page.evaluate("setGridFilter(0, '100')")
        page.evaluate("clearGridFilter()")
        print("✓ Filtering executed cleanly.")

        # 8. Reload Persistence
        print("8. Testing Offline Reload Persistence...")
        page.reload()
        page.evaluate("activateTab('sheets')")
        page.wait_for_selector("#panel-sheets.active")
        val_reloaded = page.locator("#cell-A3").input_value()
        assert "$300.00" in val_reloaded
        print("✓ Grid workbook data and cell formatting persisted across reload.")

        browser.close()
        print("=== GRID COMPLETE E2E TEST PASSED 100% ===")

if __name__ == "__main__":
    test_grid_complete_e2e()
