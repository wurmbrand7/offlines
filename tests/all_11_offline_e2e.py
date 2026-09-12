import os
import sys
import asyncio
from playwright.async_api import async_playwright

ALL_11_APPS = ['docs', 'sheets', 'forms', 'notes', 'agenda', 'slides', 'tasks', 'lockbox', 'formula', 'transmute', 'doxera']

async def run_offline_all_11():
    print("=== STARTING ALL_11_OFFLINE_E2E ===")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(offline=True) # Strict offline emulation
        page = await context.new_page()

        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        file_path = f"file://{os.path.abspath('index.html')}"
        await page.goto(file_path)

        for app_id in ALL_11_APPS:
            await page.evaluate(f"activateTab('{app_id}')")
            await page.wait_for_timeout(50)
            assert await page.locator(f"#panel-{app_id}").is_visible(), f"App {app_id} failed in offline mode!"

        # Test Formula computation offline
        await page.evaluate("activateTab('formula')")
        await page.fill("#formulaInput", "12 * 12")
        await page.click("#panel-formula button:has-text('Calc')")
        res = await page.text_content("#formulaResultDisplay")
        assert "144" in res, "Formula calculation failed offline!"
        print("✓ All 11 applications active & functional under strict offline network emulation.")

        assert len(console_errors) == 0, f"Console errors found: {console_errors}"
        await browser.close()
        print("=== ALL_11_OFFLINE_E2E PASSED ===")

if __name__ == "__main__":
    asyncio.run(run_offline_all_11())
