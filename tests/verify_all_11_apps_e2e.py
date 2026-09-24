import os
import sys
import asyncio
from playwright.async_api import async_playwright

ALL_11_APPS = [
    ('docs', 'Folio', 'Document Studio'),
    ('sheets', 'Grid', 'Data Studio'),
    ('forms', 'Fill', 'Private Forms'),
    ('notes', 'Spot', 'Capture Board'),
    ('agenda', 'Almanac', 'Time Planner'),
    ('slides', 'Glides', 'Presentation Studio'),
    ('tasks', 'Docket', 'Action Planning'),
    ('lockbox', 'Lockbox', 'Secure Vault'),
    ('formula', 'Formula', 'Math & Unit Engine'),
    ('transmute', 'Transmute', 'Crypto & Format Transformer'),
    ('doxera', 'Doxera', 'Structured Documents')
]

async def run_all_11_apps_verification():
    print("=== STARTING VERIFY_ALL_11_APPS_E2E ===")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        file_path = f"file://{os.path.abspath('index.html')}"
        await page.goto(file_path)

        for app_id, app_name, app_desc in ALL_11_APPS:
            await page.evaluate(f"activateTab('{app_id}')")
            await page.wait_for_timeout(50)
            panel = page.locator(f"#panel-{app_id}")
            assert await panel.is_visible(), f"App panel {app_id} is not visible!"
            print(f"✓ {app_name} ({app_id}) panel active & functional.")

        assert len(console_errors) == 0, f"Console errors found: {console_errors}"
        await browser.close()
        print("=== VERIFY_ALL_11_APPS_E2E PASSED ===")

if __name__ == "__main__":
    asyncio.run(run_all_11_apps_verification())
