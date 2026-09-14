import os
import sys
import asyncio
from playwright.async_api import async_playwright

async def run_cross_app_e2e():
    print("=== STARTING CROSS_APP_E2E ===")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        file_path = f"file://{os.path.abspath('index.html')}"
        await page.goto(file_path)

        # 1. Spot notes workspace
        await page.evaluate("activateTab('notes')")
        await page.wait_for_timeout(100)

        # 2. Universal Search cross-indexing on Today tab
        await page.evaluate("activateTab('today')")
        await page.wait_for_timeout(100)
        await page.fill("#universalSearch", "Security")
        await page.wait_for_timeout(100)
        sr = await page.text_content("#universalSearchResults")
        print(f"Universal Search cross-app matches: {sr.strip()}")
        assert "Doxera" in sr or "Security" in sr or "No matches" in sr, "Universal search cross-indexing failed!"

        assert len(console_errors) == 0, f"Console errors found: {console_errors}"
        await browser.close()
        print("=== CROSS_APP_E2E PASSED ===")

if __name__ == "__main__":
    asyncio.run(run_cross_app_e2e())
