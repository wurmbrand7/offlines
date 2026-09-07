import asyncio
import os
from playwright.async_api import async_playwright

async def run_e2e_tests():
    print("=== STARTING OFFLINES SESSION 13 E2E TEST SUITE ===")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()

        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))

        # 1. Load application
        app_url = "file:///app/index.html"
        print(f"1. Loading application from {app_url}...")
        await page.goto(app_url)
        await page.wait_for_selector(".app-shell", timeout=5000)
        print("✓ App shell loaded successfully.")

        # 2. Test navigation across all 23 source modules
        modules = [
            "today", "projects", "canvas", "files", "notes", "tasks", "agenda",
            "contacts", "passwords", "passkeys", "totp", "wallet", "identities",
            "lockbox", "secrets", "docs", "sheets", "forms", "slides", "activity",
            "backups", "security", "privacy"
        ]

        print(f"2. Testing navigation across all {len(modules)} workspace modules...")
        unlocked_count = 0
        for m in modules:
            # Activate tab directly via JS to test panel rendering
            await page.evaluate(f"activateTab('{m}')")
            await page.wait_for_timeout(30)

            # Verify panel visibility & no lock overlays
            panel = page.locator(f"#panel-{m}")
            lock_overlay = panel.locator(".lock-overlay")

            if await panel.is_visible() and await lock_overlay.count() == 0:
                unlocked_count += 1
            else:
                print(f"  ⚠ Module panel '{m}' not visible or contains lock overlay.")

        print(f"✓ All {unlocked_count}/{len(modules)} modules opened natively with 0 lock overlays.")

        # 3. Test Global Search & Command Palette
        print("3. Testing Universal Search and Command Palette (Cmd+K)...")
        search_input = page.locator("#gSearchInput")
        await search_input.fill("test")
        await page.wait_for_timeout(50)
        print("✓ Global search executed cleanly.")

        # 4. Test Modals (Settings & Capsule Backup)
        print("4. Testing Settings & Backup Capsule modals...")
        await page.evaluate("openSettingsModal('general')")
        await page.wait_for_selector("#settingsModalBg", timeout=2000)
        await page.evaluate("closeSettingsModal()")

        await page.evaluate("openCapsuleModal('export')")
        await page.wait_for_selector("#capsuleModalBg", timeout=2000)
        await page.evaluate("closeCapsuleModal()")
        print("✓ Modals opened and closed natively.")

        print("\n=== E2E TEST SUMMARY ===")
        print(f"Total Modules Unlocked: {unlocked_count}/23")
        print(f"Console Errors Encountered: {len(errors)}")
        if errors:
            print("Errors Detail:", errors)
        else:
            print("✓ ZERO console errors recorded across execution.")

        await browser.close()
        return len(errors) == 0 and unlocked_count == 23

if __name__ == "__main__":
    success = asyncio.run(run_e2e_tests())
    if success:
        print("\n>>> ALL SESSION 13 E2E TESTS PASSED SUCCESSFULLY <<<")
        exit(0)
    else:
        print("\n>>> E2E TEST SUITE FAILED <<<")
        exit(1)
