import os
import sys
import asyncio
from playwright.async_api import async_playwright

FOLIO_RIBBON_TABS = [
    'FILE', 'HOME', 'PDF TOOLS', 'INSERT', 'DESIGN', 'LAYOUT',
    'REFERENCES', 'MAILINGS', 'REVIEW', 'VIEW', 'HELP'
]

async def run_folio_professional_ribbon_e2e():
    print("=== STARTING FOLIO PROFESSIONAL RIBBON E2E TEST ===")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        page.on("dialog", lambda dialog: dialog.accept("Test Value"))

        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        file_path = f"file://{os.path.abspath('index.html')}"
        await page.goto(file_path)

        # Activate Folio Document Studio tab
        await page.evaluate("activateTab('docs')")
        await page.wait_for_timeout(200)

        # Test switching across all 11 ribbon categories
        for tab_name in FOLIO_RIBBON_TABS:
            await page.evaluate(f"setFolioRibbonTab('{tab_name}')")
            await page.wait_for_timeout(100)
            active_tab = await page.evaluate("currentFolioRibbonTab")
            assert active_tab == tab_name, f"Failed switching to Folio ribbon tab {tab_name}! Got {active_tab}"
            print(f"✓ Folio ribbon tab switched successfully: {tab_name}")

        # Test Table of Contents Insertion
        await page.evaluate("setFolioRibbonTab('REFERENCES')")
        await page.evaluate("document.getElementById('docsEditor').innerHTML = '<h1>Project Summary</h1><p>Text</p><h2>Details</h2><p>More</p>'")
        await page.evaluate("insertFolioTOC()")
        await page.wait_for_timeout(100)
        has_toc = await page.evaluate("document.querySelector('.folio-toc') !== null")
        assert has_toc, "Table of Contents element was not generated!"
        print("✓ Dynamic Table of Contents insertion verified.")

        # Test Endnote Insertion
        await page.evaluate("insertFolioEndnote()")
        await page.wait_for_timeout(100)

        # Test Mail Merge Execution
        await page.evaluate("setFolioRibbonTab('MAILINGS')")
        await page.evaluate("document.getElementById('docsEditor').innerHTML = '<p>Hello {{name}}, welcome to {{company}}.</p>'")
        await page.evaluate("generateFolioMailMerge()")
        await page.wait_for_timeout(100)
        has_merged = await page.evaluate("document.querySelector('.folio-merged-doc') !== null")
        assert has_merged, "Mail Merge output was not generated!"
        print("✓ Mail Merge engine execution verified.")

        # Test Page Layout Margins & Orientation
        await page.evaluate("setFolioRibbonTab('LAYOUT')")
        await page.evaluate("setFolioPageMargins('narrow')")
        await page.evaluate("setFolioOrientation('landscape')")
        await page.wait_for_timeout(100)
        padding = await page.evaluate("document.getElementById('folioPaperContainer').style.padding")
        max_width = await page.evaluate("document.getElementById('folioPaperContainer').style.maxWidth")
        assert padding == '24px 28px', f"Narrow margin padding expected '24px 28px', got {padding}"
        assert max_width == '1100px', f"Landscape max-width expected '1100px', got {max_width}"
        print("✓ Page layout margins & orientation verified.")

        # Test Design Watermark
        await page.evaluate("setFolioRibbonTab('DESIGN')")
        await page.evaluate("setFolioWatermark('CONFIDENTIAL')")
        await page.wait_for_timeout(100)
        wm_text = await page.evaluate("document.getElementById('folioWatermarkOverlay').textContent")
        assert wm_text == 'CONFIDENTIAL', f"Watermark text expected 'CONFIDENTIAL', got {wm_text}"
        print("✓ Document watermark verified.")

        # Test Document Protection
        await page.evaluate("setFolioRibbonTab('FILE')")
        await page.evaluate("toggleFolioDocProtection()")
        await page.wait_for_timeout(100)
        is_protected = await page.evaluate("getFolioDocument().document.protected")
        assert is_protected is True, "Document protection lock failed!"
        await page.evaluate("toggleFolioDocProtection()")
        print("✓ Document protection lock verified.")

        if console_errors:
            print("Console errors detected during run:", console_errors)
            sys.exit(1)

        print("=== FOLIO PROFESSIONAL RIBBON E2E PASSED ALL 11 CATEGORIES & ENGINES ===")

if __name__ == "__main__":
    asyncio.run(run_folio_professional_ribbon_e2e())
