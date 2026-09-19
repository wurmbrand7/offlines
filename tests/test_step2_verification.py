import asyncio
from playwright.async_api import async_playwright
import os

async def test_step2():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        page.on("dialog", lambda dialog: dialog.accept("E = mc²"))

        file_path = os.path.abspath("standalone/folio.html")
        await page.goto(f"file://{file_path}")
        await page.wait_for_selector("#docsEditor")

        # Test HOME tab formatting buttons
        await page.evaluate("""() => setFolioRibbonTab('HOME')""")
        await page.wait_for_timeout(200)

        # Verify HOME tools rendering
        content = await page.content()
        assert "Clear Format" in content
        assert "Line Spacing" in content or "Spacing:" in content

        # Test INSERT tab tools rendering
        await page.evaluate("""() => setFolioRibbonTab('INSERT')""")
        await page.wait_for_timeout(200)
        content_insert = await page.content()
        assert "Symbol Picker" in content_insert
        assert "Equation" in content_insert
        assert "Text Box" in content_insert

        # Test inserting equation via helper
        await page.evaluate("""() => {
            const editor = document.getElementById('docsEditor');
            editor.focus();
            folioInsertEquation();
        }""")

        await page.wait_for_timeout(200)

        editor_html = await page.inner_html("#docsEditor")
        print("Editor HTML after equation:", editor_html)
        assert "folio-equation" in editor_html or "E = mc²" in editor_html

        await browser.close()
        print("STEP 2 PLAYWRIGHT VERIFICATION SUCCESSFUL")

asyncio.run(test_step2())
