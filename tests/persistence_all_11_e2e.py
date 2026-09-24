import os
import sys
import asyncio
from playwright.async_api import async_playwright

async def run_persistence_e2e():
    print("=== STARTING PERSISTENCE_ALL_11_E2E ===")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        file_path = f"file://{os.path.abspath('index.html')}"
        await page.goto(file_path)

        # 1. Formula persistence test
        await page.evaluate("activateTab('formula')")
        await page.fill("#formulaInput", "50 * 2")
        await page.click("#panel-formula button:has-text('Calc')")
        await page.wait_for_timeout(100)

        # 2. Doxera persistence test
        await page.evaluate("activateTab('doxera')")
        await page.fill("#doxeraTitle", "Persistent Doc 2026")
        await page.fill("#doxeraBody", "Content to be reloaded.")
        await page.click("#panel-doxera button:has-text('Save Active')")
        await page.wait_for_timeout(100)

        # 3. Reload page and verify state survives
        print("Reloading page to verify persistence...")
        await page.reload()
        await page.wait_for_timeout(300)

        # Verify Formula history after reload
        await page.evaluate("activateTab('formula')")
        hist_text = await page.text_content("#formulaHistoryList")
        assert "50 * 2" in hist_text and "100" in hist_text, "Formula persistence failed after reload!"
        print("✓ Formula calculation history persisted after reload.")

        # Verify Doxera document index after reload
        await page.evaluate("activateTab('doxera')")
        doc_list = await page.text_content("#doxeraDocList")
        assert "Persistent Doc 2026" in doc_list, "Doxera document title lost after reload!"
        print("✓ Doxera document persisted after reload.")

        assert len(console_errors) == 0, f"Console errors found: {console_errors}"
        await browser.close()
        print("=== PERSISTENCE_ALL_11_E2E PASSED ===")

if __name__ == "__main__":
    asyncio.run(run_persistence_e2e())
