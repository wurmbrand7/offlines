import os
import sys
import asyncio
from playwright.async_api import async_playwright

ALL_11_APPS = ['docs', 'sheets', 'forms', 'notes', 'agenda', 'slides', 'tasks', 'lockbox', 'formula', 'transmute', 'doxera']

async def run_pwa_offline():
    print("=== STARTING PWA_OFFLINE_E2E ===")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(offline=True) # Emulate offline mode
        page = await context.new_page()

        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        file_path = f"file://{os.path.abspath('index.html')}"
        await page.goto(file_path)

        for app_id in ALL_11_APPS:
            await page.evaluate(f"activateTab('{app_id}')")
            await page.wait_for_timeout(30)
            assert await page.locator(f"#panel-{app_id}").is_visible(), f"PWA app {app_id} failed in offline mode!"

        assert len(console_errors) == 0, f"Console errors found: {console_errors}"
        await browser.close()
        print("=== PWA_OFFLINE_E2E PASSED ===")

if __name__ == "__main__":
    asyncio.run(run_pwa_offline())
