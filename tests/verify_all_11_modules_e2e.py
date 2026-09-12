import os
import sys
import asyncio
from playwright.async_api import async_playwright

ALL_SUITE_MODULES = [
    'today', 'docs', 'sheets', 'forms', 'notes', 'tasks',
    'agenda', 'slides', 'lockbox', 'formula', 'transmute', 'doxera',
    'privacy', 'security'
]

STANDALONE_FILES = [
    'almanac.html', 'docket.html', 'doxera.html', 'fill.html', 'folio.html',
    'formula.html', 'glides.html', 'grid.html', 'lockbox.html', 'spot.html', 'transmute.html'
]

async def run_comprehensive_e2e():
    print("=== STARTING COMPREHENSIVE 11-APP SUITE E2E TESTS ===")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        file_path = f"file://{os.path.abspath('index.html')}"
        print(f"1. Loading main application from {file_path}...")
        await page.goto(file_path)

        app_title = await page.title()
        print(f"✓ App shell loaded. Title: '{app_title}'")

        print("2. Verifying navigation across all 11 applications + hub panels...")
        for m in ALL_SUITE_MODULES:
            await page.evaluate(f"activateTab('{m}')")
            await page.wait_for_timeout(50)
            panel = page.locator(f"#panel-{m}")
            is_active = await panel.evaluate("el => el.classList.contains('active')")
            assert is_active, f"Panel {m} was not activated!"
        print(f"✓ All {len(ALL_SUITE_MODULES)} workspace panels activated cleanly.")

        print("3. Testing Formula (.formu) calculator engine...")
        await page.evaluate("activateTab('formula')")
        await page.fill("#formulaInput", "25 * 4 + 10")
        await page.click("#panel-formula button:has-text('Calc')")
        res_text = await page.text_content("#formulaResultDisplay")
        print(f"  Formula math output: {res_text}")
        assert "110" in res_text, f"Unexpected Formula result: {res_text}"

        await page.fill("#formulaInput", "100 kg to lbs")
        await page.click("#panel-formula button:has-text('Calc')")
        unit_res = await page.text_content("#formulaResultDisplay")
        print(f"  Formula unit conversion output: {unit_res}")
        assert "lbs" in unit_res, f"Unexpected unit conversion result: {unit_res}"
        print("✓ Formula engine verified.")

        print("4. Testing Transmute (.xmute) transformation engine...")
        await page.evaluate("activateTab('transmute')")
        await page.fill("#xmuteInput", '{"hello":"offlines"}')
        await page.wait_for_timeout(100)
        out_text = await page.input_value("#xmuteOutput")
        print(f"  Transmute JSON output:\n{out_text}")
        assert "hello" in out_text and "\n" in out_text, "Transmute JSON format failed!"
        print("✓ Transmute engine verified.")

        print("5. Testing Doxera (.ddf) knowledge studio...")
        await page.evaluate("activateTab('doxera')")
        await page.fill("#doxeraTitle", "Security Protocol 2026")
        await page.fill("#doxeraBody", "# Zero Server Data\nAll data is local.")
        await page.click("#panel-doxera button:has-text('Save Active')")
        doc_list_text = await page.text_content("#doxeraDocList")
        print(f"  Doxera document list: {doc_list_text.strip()}")
        assert "Security Protocol 2026" in doc_list_text, "Doxera document title not in index!"
        print("✓ Doxera studio verified.")

        print("6. Verifying all 11 Standalone Entry HTML files...")
        for st in STANDALONE_FILES:
            st_path = f"file://{os.path.abspath(os.path.join('standalone', st))}"
            await page.goto(st_path)
            await page.wait_for_timeout(100)
            st_body = await page.text_content("body")
            assert "Loading" in st_body or "Offlines" in (await page.title()), f"Standalone page {st} failed to load!"
        print(f"✓ All {len(STANDALONE_FILES)} standalone entry points verified.")

        print("7. Generating verification screenshot on Dashboard Command Center...")
        await page.goto(file_path)
        await page.evaluate("activateTab('today')")
        os.makedirs("tests/screenshots", exist_ok=True)
        screenshot_path = "tests/screenshots/dashboard_suite_verification.png"
        await page.screenshot(path=screenshot_path)
        print(f"✓ Screenshot saved to {screenshot_path}")

        print(f"8. Console Error Audit: {len(console_errors)} errors detected.")
        assert len(console_errors) == 0, f"Console errors found: {console_errors}"

        await browser.close()
        print("=== COMPREHENSIVE 11-APP E2E SUITE PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    asyncio.run(run_comprehensive_e2e())
