import os
import sys
import asyncio
from playwright.async_api import async_playwright

ALL_11_APPS = ['docs', 'sheets', 'forms', 'notes', 'agenda', 'slides', 'tasks', 'lockbox', 'formula', 'transmute', 'doxera']

async def run_gap_validation():
    print("=== STARTING COMPETITOR_GAP_VALIDATION ===")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        file_path = f"file://{os.path.abspath('index.html')}"
        await page.goto(file_path)

        for app_id in ALL_11_APPS:
            await page.evaluate(f"activateTab('{app_id}')")
            await page.wait_for_timeout(30)
            panel = page.locator(f"#panel-{app_id}")
            assert await panel.is_visible(), f"Gap validation failed for {app_id}"

        assert len(console_errors) == 0, f"Console errors found: {console_errors}"
        await browser.close()
        print("=== COMPETITOR_GAP_VALIDATION PASSED ===")

if __name__ == "__main__":
    asyncio.run(run_gap_validation())
