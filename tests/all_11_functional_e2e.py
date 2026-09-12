import os
import sys
import asyncio
from playwright.async_api import async_playwright

ALL_11_APPS = [
    ('docs', 'Folio'),
    ('sheets', 'Grid'),
    ('forms', 'Fill'),
    ('notes', 'Spot'),
    ('agenda', 'Almanac'),
    ('slides', 'Glides'),
    ('tasks', 'Docket'),
    ('lockbox', 'Lockbox'),
    ('formula', 'Formula'),
    ('transmute', 'Transmute'),
    ('doxera', 'Doxera')
]

async def run_functional_e2e():
    print("=== STARTING ALL_11_FUNCTIONAL_E2E ===")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        file_path = f"file://{os.path.abspath('index.html')}"
        await page.goto(file_path)

        for app_id, app_name in ALL_11_APPS:
            await page.evaluate(f"activateTab('{app_id}')")
            await page.wait_for_timeout(100)
            panel = page.locator(f"#panel-{app_id}")
            assert await panel.is_visible(), f"App panel {app_id} ({app_name}) is not visible!"
            print(f"✓ {app_name} ({app_id}) functional panel active.")

        # Test Formula
        await page.evaluate("activateTab('formula')")
        await page.fill("#formulaInput", "25 * 4 + 10")
        await page.click("#panel-formula button:has-text('Calc')")
        res = await page.text_content("#formulaResultDisplay")
        assert "110" in res, f"Formula math failed: {res}"
        print("✓ Formula math computation verified.")

        # Test Transmute
        await page.evaluate("activateTab('transmute')")
        await page.fill("#xmuteInput", '{"test":"json"}')
        await page.wait_for_timeout(100)
        out = await page.input_value("#xmuteOutput")
        assert "test" in out and "\n" in out, "Transmute formatting failed!"
        print("✓ Transmute formatting verified.")

        # Test Doxera
        await page.evaluate("activateTab('doxera')")
        await page.fill("#doxeraTitle", "Security Protocol 2026")
        await page.fill("#doxeraBody", "# Zero Server Data")
        await page.click("#panel-doxera button:has-text('Save Active')")
        doc_list = await page.text_content("#doxeraDocList")
        assert "Security Protocol 2026" in doc_list, "Doxera document indexing failed!"
        print("✓ Doxera document indexing verified.")

        assert len(console_errors) == 0, f"Console errors found: {console_errors}"
        await browser.close()
        print("=== ALL_11_FUNCTIONAL_E2E PASSED ===")

if __name__ == "__main__":
    asyncio.run(run_functional_e2e())
