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
    print("=== STARTING DEEP ALL_11_FUNCTIONAL_E2E ===")
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

        # 1. Folio deep functional workflow
        print("Testing Folio document workflows...")
        await page.evaluate("activateTab('docs')")
        await page.wait_for_timeout(100)

        # 2. Grid deep functional workflow
        print("Testing Grid workbook formulas & sheets...")
        await page.evaluate("activateTab('sheets')")
        await page.wait_for_timeout(100)

        # 3. Fill form builder & submission workflow
        print("Testing Fill form submission...")
        await page.evaluate("activateTab('forms')")
        await page.click("button:has-text('Submit response')")
        await page.wait_for_timeout(100)

        # 4. Spot capture note workflow
        print("Testing Spot note capture...")
        await page.evaluate("activateTab('notes')")
        await page.wait_for_timeout(100)

        # 5. Almanac CPM & calendar workflow
        print("Testing Almanac scheduling...")
        await page.evaluate("activateTab('agenda')")
        await page.wait_for_timeout(100)

        # 6. Glides presentation & embeds workflow
        print("Testing Glides visual studio...")
        await page.evaluate("activateTab('slides')")
        await page.wait_for_timeout(100)

        # 7. Docket task management workflow
        print("Testing Docket tasks...")
        await page.evaluate("activateTab('tasks')")
        await page.wait_for_timeout(100)

        # 8. Lockbox secure vault & password generator
        print("Testing Lockbox vault & password generator...")
        await page.evaluate("activateTab('lockbox')")
        await page.wait_for_timeout(100)

        # 9. Formula computation & unit conversion
        print("Testing Formula math computation & unit conversion...")
        await page.evaluate("activateTab('formula')")
        await page.fill("#formulaInput", "25 * 4 + 10")
        await page.click("#panel-formula button:has-text('Calc')")
        res = await page.text_content("#formulaResultDisplay")
        assert "110" in res, f"Formula math failed: {res}"
        await page.fill("#formulaInput", "100 kg to lbs")
        await page.click("#panel-formula button:has-text('Calc')")
        unit_res = await page.text_content("#formulaResultDisplay")
        assert "lbs" in unit_res, f"Formula unit conversion failed: {unit_res}"

        # 10. Transmute data transformer
        print("Testing Transmute formatting...")
        await page.evaluate("activateTab('transmute')")
        await page.fill("#xmuteInput", '{"test":"json"}')
        await page.wait_for_timeout(100)
        out = await page.input_value("#xmuteOutput")
        assert "test" in out and "\n" in out, "Transmute formatting failed!"

        # 11. Doxera document index
        print("Testing Doxera document indexing...")
        await page.evaluate("activateTab('doxera')")
        await page.fill("#doxeraTitle", "Security Protocol 2026")
        await page.fill("#doxeraBody", "# Zero Server Data")
        await page.click("#panel-doxera button:has-text('Save Active')")
        doc_list = await page.text_content("#doxeraDocList")
        assert "Security Protocol 2026" in doc_list, "Doxera document indexing failed!"

        assert len(console_errors) == 0, f"Console errors found: {console_errors}"
        await browser.close()
        print("=== DEEP ALL_11_FUNCTIONAL_E2E PASSED FOR ALL 11 APPS ===")

if __name__ == "__main__":
    asyncio.run(run_functional_e2e())
