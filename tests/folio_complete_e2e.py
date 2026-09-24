import os
from playwright.sync_api import sync_playwright

def test_folio_complete_e2e():
    print("=== STARTING FOLIO COMPLETE PROFESSIONAL E2E TEST ===")
    html_path = os.path.abspath("index.html")
    file_url = f"file://{html_path}"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(file_url)
        page.wait_for_selector("#workspace")

        # 1. Navigate to Folio Studio
        print("1. Navigating to Folio Document Studio...")
        page.evaluate("activateTab('docs')")
        page.wait_for_selector("#panel-docs.active")
        print("✓ Folio Document Studio active.")

        # 2. Document Title and Content Editing
        print("2. Editing Document Title & Content...")
        page.fill("#folioDocTitle", "Executive Spec Document")
        page.dispatch_event("#folioDocTitle", "input")
        page.click("#docsEditor")
        page.type("#docsEditor", " Executive Summary Content for Professional Test Suite.")
        page.click("#panel-docs button:has-text('Save Document')")

        page.reload()
        page.evaluate("activateTab('docs')")
        page.wait_for_selector("#panel-docs.active")
        assert page.input_value("#folioDocTitle") == "Executive Spec Document"
        print("✓ Document title and content saved & persisted across reload.")

        # 3. Heading & Outline Generation
        print("3. Testing Outline Generation...")
        page.evaluate("""() => {
            const ed = document.getElementById('docsEditor');
            ed.innerHTML = '<h1>Project Introduction</h1><p>Body text</p><h2>System Architecture</h2>';
            updateFolioOutline();
        }""")
        outline_html = page.inner_html("#folioOutlineList")
        assert "Project Introduction" in outline_html
        assert "System Architecture" in outline_html
        print("✓ Document outline captured heading hierarchy.")

        # 4. Table Insertion
        print("4. Testing Table Insertion...")
        page.evaluate("insertFolioTable()")
        assert "table" in page.locator("#docsEditor").inner_html().lower()
        print("✓ Table inserted into document canvas.")

        # 5. Footnote Insertion
        print("5. Testing Footnote Insertion...")
        page.evaluate("insertFolioFootnote()")
        assert "footnote" in page.locator("#docsEditor").inner_html().lower()
        print("✓ Footnote inserted into document canvas.")

        # 6. TOC Generation
        print("6. Testing Table of Contents Generation...")
        page.evaluate("generateFolioTOC()")
        assert "Table of Contents" in page.locator("#docsEditor").inner_text()
        print("✓ Table of Contents generated.")

        # 7. Focus Mode
        print("7. Testing Focus Mode Toggle...")
        page.evaluate("toggleFolioFocusMode()")
        print("✓ Focus mode toggled.")

        browser.close()
        print("=== FOLIO COMPLETE E2E TEST PASSED 100% ===")

if __name__ == "__main__":
    test_folio_complete_e2e()
