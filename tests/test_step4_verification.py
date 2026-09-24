import asyncio
from playwright.async_api import async_playwright
import os

async def test_step4():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        file_path = os.path.abspath("standalone/folio.html")
        await page.goto(f"file://{file_path}")
        await page.wait_for_selector("#docsEditor")

        # 1. Test Page Settings Persistence
        await page.evaluate("""() => {
            setFolioPageMargins('narrow');
            setFolioOrientation('landscape');
            setFolioColumns('2');
            setFolioPaperColor('#fdfbf7');
            setFolioWatermark('CONFIDENTIAL');
        }""")

        doc_settings = await page.evaluate("""() => getFolioDocument().document.settings""")
        print("Persisted Doc Settings:", doc_settings)
        assert doc_settings["margins"] == "narrow"
        assert doc_settings["orientation"] == "landscape"
        assert doc_settings["columns"] == 2
        assert doc_settings["paperColor"] == "#fdfbf7"
        assert doc_settings["watermark"] == "CONFIDENTIAL"

        # 2. Test Help Center Drawer
        await page.evaluate("""() => showFolioUserGuide()""")
        await page.wait_for_selector("#folioHelpCenterOverlay")

        overlay_html = await page.inner_html("#folioHelpCenterOverlay")
        print("Overlay HTML full text snippet:", overlay_html[100:300])
        assert "Folio Help" in overlay_html
        assert "11-Category Command Ribbon" in overlay_html

        await browser.close()
        print("STEP 4 PLAYWRIGHT VERIFICATION SUCCESSFUL")

asyncio.run(test_step4())
