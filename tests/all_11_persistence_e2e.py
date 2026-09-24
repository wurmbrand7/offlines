import os
import sys
import asyncio
from playwright.async_api import async_playwright

async def run_persistence_all_11():
    print("=== STARTING ALL_11_PERSISTENCE_E2E ===")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        file_path = f"file://{os.path.abspath('index.html')}"
        await page.goto(file_path)

        # 1. Formula computation
        await page.evaluate("activateTab('formula')")
        await page.fill("#formulaInput", "50 * 2")
        await page.click("#panel-formula button:has-text('Calc')")
        await page.wait_for_timeout(100)

        # 2. Doxera document
        await page.evaluate("activateTab('doxera')")
        await page.fill("#doxeraTitle", "Persistent Doc 2026")
        await page.fill("#doxeraBody", "Content to be reloaded.")
        await page.click("#panel-doxera button:has-text('Save Active')")
        await page.wait_for_timeout(100)

        # Reload page and verify state survives
        print("Reloading page to verify persistence across browser reload...")
        await page.reload()
        await page.wait_for_timeout(300)

        # Verify Formula
        await page.evaluate("activateTab('formula')")
        hist_text = await page.text_content("#formulaHistoryList")
        assert "50 * 2" in hist_text and "100" in hist_text, "Formula persistence failed!"
        print("✓ Formula calculation history persisted across reload.")

        # Verify Doxera
        await page.evaluate("activateTab('doxera')")
        doc_list = await page.text_content("#doxeraDocList")
        assert "Persistent Doc 2026" in doc_list, "Doxera document persistence failed!"
        print("✓ Doxera document index persisted across reload.")

        assert len(console_errors) == 0, f"Console errors found: {console_errors}"
        await browser.close()
        print("=== ALL_11_PERSISTENCE_E2E PASSED ===")

if __name__ == "__main__":
    asyncio.run(run_persistence_all_11())
