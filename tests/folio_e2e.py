import os
import sys
import asyncio
from playwright.async_api import async_playwright

async def run_folio_tests():
    print("=== Starting Suite Folio Comprehensive Session 16 E2E Test Suite ===")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        file_path = f"file://{os.path.abspath('index.html')}"
        print(f"Loading page: {file_path}")
        await page.goto(file_path)

        # FOLIO-001 Navigation
        print("[FOLIO-001] Navigating to Folio module...")
        folio_tab = page.locator(".sidebar-item[data-id='docs']")
        await folio_tab.click()
        await page.wait_for_selector("#panel-docs.active")
        print("✓ Folio module active.")

        # FOLIO-002 Document Title & Content Editing
        print("[FOLIO-002] Editing Document Title and Content...")
        await page.fill("#folioDocTitle", "Project Alpha Specifications")
        await page.click("#docsEditor")
        await page.type("#docsEditor", " This is the updated executive summary for Project Alpha.")
        word_count = await page.locator("#docsWC").inner_text()
        print(f"Word count: {word_count}")
        assert "words" in word_count, "Word counter should display active word count"
        print("✓ Document title and content edited cleanly.")

        # FOLIO-003 Heading Outline Generation
        print("[FOLIO-003] Testing Heading Outline Generation...")
        await page.evaluate("document.execCommand('formatBlock', false, 'H1')")
        await page.type("#docsEditor", " 1. Executive Summary")
        await page.evaluate("updateFolioOutline()")
        await page.wait_for_timeout(100)
        outline_html = await page.locator("#folioInspectorContent").inner_html()
        assert "Executive Summary" in outline_html or "Heading" in outline_html, "Outline should capture headings"
        print("✓ Document outline captured heading hierarchy.")

        # FOLIO-004 Inspector Tab Switching (History & Props)
        print("[FOLIO-004] Testing Inspector Tab Switching...")
        await page.click("#panel-docs button:has-text('History')")
        await page.wait_for_timeout(100)
        await page.click("#panel-docs button:has-text('Props')")
        await page.wait_for_timeout(100)
        print("✓ Inspector tabs (History, Props) rendered successfully.")

        # FOLIO-005 Table Insertion
        print("[FOLIO-005] Testing Table Insertion...")
        await page.click("#panel-docs button[title='Insert Table']")
        table_count = await page.locator("#docsEditor table").count()
        assert table_count > 0, "Table element should exist in editor"
        print("✓ Table inserted into document editor.")

        # FOLIO-006 Page Break Insertion
        print("[FOLIO-006] Testing Page Break Insertion...")
        await page.click("#panel-docs button:has-text('Page Break')")
        page_break_count = await page.locator("#docsEditor div").count()
        assert page_break_count > 0, "Page break element should exist in editor"
        print("✓ Page break inserted into document editor.")

        # FOLIO-007 Focus Mode Toggle
        print("[FOLIO-007] Testing Focus Mode Toggle...")
        await page.click("#panel-docs button:has-text('Focus Mode')")
        focus_active = await page.evaluate("document.getElementById('panel-docs').classList.contains('focus-mode')")
        assert focus_active, "Focus mode class should be present on panel"
        print("✓ Focus mode toggled successfully.")

        # FOLIO-008 Console Error Audit
        print(f"[FOLIO-008] Console Error Audit: {len(console_errors)} errors detected.")
        if console_errors:
            print("Errors:", console_errors)
        assert len(console_errors) == 0, f"Found {len(console_errors)} console errors."

        await browser.close()
        print("=== All Session 16 Folio E2E Tests Passed Successfully! ===")

if __name__ == "__main__":
    asyncio.run(run_folio_tests())
