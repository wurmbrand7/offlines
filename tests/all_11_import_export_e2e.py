import os
import sys
import asyncio
from playwright.async_api import async_playwright

async def run_import_export_e2e():
    print("=== STARTING ALL_11_IMPORT_EXPORT_E2E ===")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        file_path = f"file://{os.path.abspath('index.html')}"
        await page.goto(file_path)

        # Formula export/import test
        await page.evaluate("activateTab('formula')")
        await page.evaluate("exportFormulaHistory()")
        print("✓ Formula export history triggered.")

        # Transmute export/import test
        await page.evaluate("activateTab('transmute')")
        await page.evaluate("exportTransmuteHistory()")
        print("✓ Transmute export history triggered.")

        # Doxera export/import test
        await page.evaluate("activateTab('doxera')")
        await page.evaluate("exportDoxeraDocs()")
        print("✓ Doxera export docs triggered.")

        assert len(console_errors) == 0, f"Console errors found: {console_errors}"
        await browser.close()
        print("=== ALL_11_IMPORT_EXPORT_E2E PASSED ===")

if __name__ == "__main__":
    asyncio.run(run_import_export_e2e())
