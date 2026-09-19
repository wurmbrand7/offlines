import asyncio
from playwright.async_api import async_playwright
import os

async def test_step3():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        file_path = os.path.abspath("standalone/folio.html")
        await page.goto(f"file://{file_path}")
        await page.wait_for_selector("#docsEditor")

        # Override prompt for headless execution
        await page.evaluate("""() => { window.prompt = (msg) => 'Sample Footnote Entry'; }""")

        # 1. Test TOC generation
        await page.evaluate("""() => {
            const editor = document.getElementById('docsEditor');
            editor.innerHTML = '<h1>Heading 1 Overview</h1><p>Content block 1</p><h2>Subheading Section</h2><p>Content block 2</p>';
            insertFolioTOC();
        }""")

        editor_html = await page.inner_html("#docsEditor")
        assert "folio-toc" in editor_html
        assert "Heading 1 Overview" in editor_html

        # 2. Test Footnote insertion
        await page.evaluate("""() => {
            insertFolioFootnote();
        }""")

        editor_html_fn = await page.inner_html("#docsEditor")
        print("Editor HTML after Footnote:", editor_html_fn)
        assert "folio-footnote-marker" in editor_html_fn
        assert "folio-footnotes-section" in editor_html_fn
        assert "Sample Footnote Entry" in editor_html_fn

        # 3. Test Find & Replace
        await page.evaluate("""() => {
            openFolioFindReplaceModal();
            document.getElementById('folioFindInput').value = 'Content block';
            document.getElementById('folioReplaceInput').value = 'Revised text block';
            executeFolioReplaceAll();
        }""")

        editor_html_fr = await page.inner_html("#docsEditor")
        assert "Revised text block 1" in editor_html_fr

        await browser.close()
        print("STEP 3 PLAYWRIGHT VERIFICATION SUCCESSFUL")

asyncio.run(test_step3())
