import os
import sys
import asyncio
from playwright.async_api import async_playwright

GRID_RIBBON_TABS = [
    'file', 'home', 'insert', 'draw', 'page_layout', 'formulas',
    'data', 'review', 'view', 'automate', 'developer', 'help',
    'doc_tools', 'data_model'
]

async def run_grid_ribbon_complete_e2e():
    print("=== STARTING GRID RIBBON COMPLETE E2E TEST ===")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        file_path = f"file://{os.path.abspath('index.html')}"
        await page.goto(file_path)

        # Activate Grid tab
        await page.evaluate("activateTab('sheets')")
        await page.wait_for_timeout(200)

        # Test switching across all 14 ribbon categories
        for tab_id in GRID_RIBBON_TABS:
            await page.evaluate(f"setGridRibbonTab('{tab_id}')")
            await page.wait_for_timeout(100)
            active_tab = await page.evaluate("currentGridRibbonTab")
            assert active_tab == tab_id, f"Failed switching to ribbon tab {tab_id}! Got {active_tab}"
            print(f"✓ Grid ribbon tab switched successfully: {tab_id}")

        # Test Conditional Formatting Modal
        await page.evaluate("setGridRibbonTab('home')")
        await page.evaluate("openGridConditionalFormatModal()")
        await page.wait_for_timeout(100)
        modal_visible = await page.locator("#capsuleModalBg").is_visible()
        assert modal_visible, "Conditional formatting modal failed to display!"
        await page.evaluate("closeCapsuleModal()")
        print("✓ Conditional formatting modal verified.")

        # Test Data Validation Modal
        await page.evaluate("setGridRibbonTab('data')")
        await page.evaluate("openGridDataValidationModal()")
        await page.wait_for_timeout(100)
        modal_visible = await page.locator("#capsuleModalBg").is_visible()
        assert modal_visible, "Data Validation modal failed to display!"
        await page.evaluate("saveGridDataValidation()")
        print("✓ Data Validation modal verified.")

        # Test Remove Duplicates Modal & Execution
        await page.evaluate("openGridRemoveDuplicatesModal()")
        await page.wait_for_timeout(100)
        modal_visible = await page.locator("#capsuleModalBg").is_visible()
        assert modal_visible, "Remove Duplicates modal failed to display!"
        await page.evaluate("executeGridRemoveDuplicates()")
        print("✓ Remove Duplicates engine executed.")

        # Test Pivot Modal
        await page.evaluate("openGridPivotModal()")
        await page.wait_for_timeout(100)
        modal_visible = await page.locator("#capsuleModalBg").is_visible()
        assert modal_visible, "Pivot Engine modal failed to display!"
        await page.evaluate("closeCapsuleModal()")
        print("✓ Pivot Engine modal verified.")

        # Test Name Manager Modal
        await page.evaluate("setGridRibbonTab('formulas')")
        await page.evaluate("openGridNameManagerModal()")
        await page.wait_for_timeout(100)
        modal_visible = await page.locator("#capsuleModalBg").is_visible()
        assert modal_visible, "Name Manager modal failed to display!"
        await page.evaluate("closeCapsuleModal()")
        print("✓ Name Manager modal verified.")

        # Test Data Model Modal
        await page.evaluate("setGridRibbonTab('data_model')")
        await page.evaluate("openGridDataModelModal()")
        await page.wait_for_timeout(100)
        modal_visible = await page.locator("#capsuleModalBg").is_visible()
        assert modal_visible, "Data Model Studio modal failed to display!"
        await page.evaluate("closeCapsuleModal()")
        print("✓ Data Model Studio modal verified.")

        if console_errors:
            print("Console errors detected during run:", console_errors)
            sys.exit(1)

        print("=== GRID RIBBON COMPLETE E2E PASSED ALL 14 CATEGORIES & ENGINES ===")

if __name__ == "__main__":
    asyncio.run(run_grid_ribbon_complete_e2e())
