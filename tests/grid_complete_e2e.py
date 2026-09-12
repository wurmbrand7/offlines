import sys
import time
import subprocess
from playwright.sync_api import sync_playwright

def test_grid_exhaustive_suite():
    print("=== STARTING EXHAUSTIVE GRID E2E TEST SUITE ===")
    port = 8890
    server = subprocess.Popen(["python3", "-m", "http.server", str(port)])
    time.sleep(1.5)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            url = f"http://localhost:{port}/index.html"
            print(f"Loading application from {url}...")
            page.goto(url)
            page.wait_for_timeout(1000)

            # Switch to Grid tab via sidebar
            page.click(".sidebar-item[data-id='sheets']")
            page.wait_for_timeout(500)

            # Test 1: Enter value in A1 and B1
            print("1. Testing cell entry & formula evaluation...")
            page.focus("#cell-A1")
            page.fill("#cell-A1", "100")
            page.keyboard.press("Enter")

            page.focus("#cell-B1")
            page.fill("#cell-B1", "200")
            page.keyboard.press("Enter")

            # Formula in C1 =SUM(A1:B1)
            page.focus("#cell-C1")
            page.fill("#cell-C1", "=SUM(A1:B1)")
            page.keyboard.press("Enter")
            page.wait_for_timeout(300)

            c1_val = page.eval_on_selector("#cell-C1", "el => el.value")
            assert "300" in c1_val, f"Expected 300 in C1, got {c1_val}"
            print("✓ Formula =SUM(A1:B1) correctly evaluated to 300")

            # Test 2: Copy C1 and Paste to C2 (testing relative formula reference shift)
            print("2. Testing copy and paste with relative reference adjustment...")
            page.evaluate("selectedGridCell = 'C1'; gridCopySelection();")
            page.evaluate("selectedGridCell = 'C2'; gridPasteSelection('all');")
            page.wait_for_timeout(300)

            c2_raw = page.eval_on_selector("#cell-C2", "el => el.getAttribute('data-raw')")
            assert "=SUM(A2:B2)" in c2_raw, f"Expected relative formula =SUM(A2:B2), got {c2_raw}"
            print("✓ Copy/Paste correctly adjusted formula references to =SUM(A2:B2)")

            # Test 3: SVG Chart generation
            print("3. Testing SVG Chart generation...")
            page.click("button[onclick=\"setGridRibbonTab('insert')\"]")
            page.wait_for_timeout(200)
            page.click("button:has-text('Bar Chart')")
            page.wait_for_timeout(300)
            chart_html = page.inner_html("#gridChartCanvas")
            assert "<rect" in chart_html, "Bar chart rect elements missing"
            print("✓ Bar Chart SVG rendered successfully")

            page.click("button:has-text('Line Chart')")
            page.wait_for_timeout(300)
            line_html = page.inner_html("#gridChartCanvas")
            assert "<polyline" in line_html, "Line chart polyline missing"
            print("✓ Line Chart SVG rendered successfully")

            page.click("button:has-text('Pie Chart')")
            page.wait_for_timeout(300)
            pie_html = page.inner_html("#gridChartCanvas")
            assert "<path" in pie_html, "Pie chart path missing"
            print("✓ Pie Chart SVG rendered successfully")

            # Test 4: Multi-sheet workbook
            print("4. Testing multi-sheet workbook operations...")
            page.click("button:has-text('+ Sheet')")
            page.wait_for_timeout(300)
            sheet_count = len(page.query_selector_all("[onclick*='switchGridSheet']"))
            assert sheet_count == 2, f"Expected 2 sheets, got {sheet_count}"
            print("✓ Multi-sheet workbook creation verified")

            # Test 5: Save & reload persistence
            print("5. Testing workbook persistence on page reload...")
            page.click("button[onclick=\"setGridRibbonTab('start')\"]")
            page.click("#panel-sheets button:has-text('Save')")
            page.wait_for_timeout(500)

            page.reload()
            page.wait_for_timeout(1000)
            page.click(".sidebar-item[data-id='sheets']")
            page.wait_for_timeout(500)

            # Switch to Sheet 1
            page.click("text=Sheet 1")
            page.wait_for_timeout(300)

            reloaded_c1 = page.eval_on_selector("#cell-C1", "el => el.value")
            assert "300" in reloaded_c1, f"Expected 300 in C1 after reload, got {reloaded_c1}"
            print("✓ Workbook state correctly persisted across reload")

            browser.close()
            print("=== EXHAUSTIVE GRID E2E TEST SUITE PASSED ===")
    finally:
        server.terminate()

if __name__ == "__main__":
    test_grid_exhaustive_suite()
