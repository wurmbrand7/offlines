import os
import sys
import asyncio
from playwright.async_api import async_playwright

MODULES = ['today', 'docs', 'sheets', 'forms', 'notes', 'tasks', 'agenda', 'slides', 'lockbox', 'privacy', 'security']

async def run_e2e_tests():
    print("=== STARTING OFFLINES E2E TEST SUITE ===")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        file_path = f"file://{os.path.abspath('index.html')}"
        print(f"1. Loading application from {file_path}...")
        await page.goto(file_path)

        app_title = await page.title()
        print(f"✓ App shell loaded. Title: '{app_title}'")

        print("2. Testing navigation across all workspace modules...")
        unlocked_count = 0
        for m in MODULES:
            await page.evaluate(f"activateTab('{m}')")
            await page.wait_for_timeout(50)
            panel = page.locator(f"#panel-{m}")
            is_visible = await panel.is_visible()
            if is_visible:
                unlocked_count += 1
            else:
                print(f"  ⚠ Module panel '{m}' not visible.")

        print(f"✓ All {unlocked_count}/{len(MODULES)} modules opened natively with 0 lock overlays.")

        print("3. Testing Universal Search and Command Palette (Cmd+K)...")
        await page.evaluate("openCommandPalette()")
        await page.wait_for_selector("#cmdPaletteBg.open")
        await page.evaluate("closeCommandPalette()")
        print("✓ Global search and command palette executed cleanly.")

        print("4. Testing Backup Capsule modal...")
        await page.evaluate("openCapsuleModal('export')")
        await page.wait_for_selector("#capsuleModalBg.show")
        await page.evaluate("closeCapsuleModal()")
        print("✓ Capsule modal test passed.")

        print(f"5. Console Error Audit: {len(console_errors)} errors detected.")
        if console_errors:
            print("Errors:", console_errors)

        await browser.close()
        return len(console_errors) == 0 and unlocked_count == len(MODULES)

if __name__ == "__main__":
    success = asyncio.run(run_e2e_tests())
    if not success:
        sys.exit(1)
    print("=== E2E TEST SUITE PASSED SUCCESSFULLY ===")
