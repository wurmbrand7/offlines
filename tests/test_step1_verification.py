import asyncio
from playwright.async_api import async_playwright
import os

async def test_step1():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        file_path = os.path.abspath("standalone/folio.html")
        await page.goto(f"file://{file_path}")
        await page.wait_for_selector("#docsEditor")

        # Verify getFolioDocument via page context
        res = await page.evaluate("""() => {
            const doc = getFolioDocument();
            return {
                format: doc.format,
                hasSettings: !!doc.document.settings,
                hasToc: Array.isArray(doc.document.toc),
                hasFootnotes: Array.isArray(doc.document.footnotes),
                hasEndnotes: Array.isArray(doc.document.endnotes),
                hasComments: Array.isArray(doc.document.comments),
                hasRevisions: Array.isArray(doc.document.revisions),
                hasMailMerge: !!doc.document.mailMergeData,
                hasInsertImageFunc: typeof insertFolioImage === 'function'
            };
        }""")
        print("STEP 1 EVALUATION RESULT:", res)
        assert res["format"] == "folio"
        assert res["hasSettings"] == True
        assert res["hasInsertImageFunc"] == True
        await browser.close()
        print("STEP 1 PLAYWRIGHT VERIFICATION SUCCESSFUL")

asyncio.run(test_step1())
