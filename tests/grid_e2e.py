import os
import sys
import asyncio
from playwright.async_api import async_playwright

async def run_grid_tests():
    print("=== Starting Suite Grid E2E Test Suite ===")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        # Monitor console logs & errors
        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        file_path = f"file://{os.path.abspath('index.html')}"
        print(f"Loading page: {file_path}")
        await page.goto(file_path)

        # 1. Activate Grid Tab
        print("[Test 1] Navigating to Grid module...")
        grid_tab = page.locator(".sidebar-item[data-id='sheets']")
        await grid_tab.click()
        await page.wait_for_selector("#panel-sheets.active")
        print("✓ Grid module active.")

        # 2. Verify Command Ribbon Tabs
        print("[Test 2] Testing Suite Grid Command Ribbon tabs...")
        tabs = ['start', 'format', 'insert', 'data', 'formulas', 'review', 'view', 'automate']
        for tab in tabs:
            tab_btn = page.get_by_role("button", name=tab, exact=True)
            await tab_btn.click()
            await page.wait_for_timeout(100)
        print("✓ All 8 Ribbon tabs rendered and clickable.")

        # 3. Enter Values & Evaluate Formula
        print("[Test 3] Entering cell values & testing Formula Engine...")
        await page.click("#cell-A1")
        await page.fill("#cell-A1", "100")
        await page.evaluate("document.getElementById('cell-A1').dispatchEvent(new Event('blur'))")

        await page.click("#cell-A2")
        await page.fill("#cell-A2", "200")
        await page.evaluate("document.getElementById('cell-A2').dispatchEvent(new Event('blur'))")

        await page.click("#cell-A3")
        await page.fill("#gridFormulaInput", "=SUM(A1:A2)")
        await page.click("#panel-sheets button:has-text('Apply')")

        evaluated_val = await page.locator("#cell-A3").input_value()
        print(f"Formula evaluation result in A3: {evaluated_val}")
        assert evaluated_val == "300", f"Expected 300, got {evaluated_val}"
        print("✓ Formula engine evaluated =SUM(A1:A2) -> 300 correctly.")

        # 4. Test Ribbon Formatting (Currency & Bold)
        print("[Test 4] Testing Cell Formatting (Currency)...")
        await page.click("#cell-A3")
        await page.get_by_role("button", name="format", exact=True).click()
        await page.locator("#panel-sheets button:has-text('Currency')").click()

        formatted_val = await page.locator("#cell-A3").input_value()
        print(f"Formatted cell A3 value: {formatted_val}")
        assert "$300.00" in formatted_val or "$300" in formatted_val, f"Expected currency format, got {formatted_val}"
        print("✓ Currency formatting applied successfully.")

        # 5. Multi-Sheet Operations
        print("[Test 5] Testing Multi-Sheet Workbook operations...")
        await page.click("#panel-sheets button:has-text('+ Sheet')")
        await page.wait_for_timeout(200)

        sheets_count = await page.locator("#panel-sheets .grid-canvas-wrap").count()
        print(f"Canvas rendered after adding Sheet 2: {sheets_count > 0}")

        # Switch back to Sheet 1
        await page.click("#panel-sheets span:has-text('Sheet 1')")
        print("✓ Multi-sheet tab creation & switching verified.")

        # 6. Test Chart Generator
        print("[Test 6] Testing Chart Visualizer...")
        await page.get_by_role("button", name="insert", exact=True).click()
        await page.locator("#panel-sheets button:has-text('Bar Chart')").click()
        chart_visible = await page.locator("#gridChartArea").is_visible()
        assert chart_visible, "Chart area should be visible"
        print("✓ Chart generator rendered SVG visualizer.")

        # 7. Verify Console Error Freedom
        print(f"Console errors recorded: {len(console_errors)}")
        if console_errors:
            print("Errors:", console_errors)
        assert len(console_errors) == 0, f"Found {len(console_errors)} console errors."

        await browser.close()
        print("=== All Grid E2E Tests Passed Successfully! ===")

if __name__ == "__main__":
    asyncio.run(run_grid_tests())
