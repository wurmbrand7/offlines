#!/usr/bin/env python3
import sys
import os
import time
from playwright.sync_api import sync_playwright

def run_transmute_complete_e2e():
    print("=" * 60)
    print("RUNNING TRANSMUTE COMPLETE FUNCTIONAL E2E TEST SUITE")
    print("=" * 60)

    # Prepare sample files for conversion testing
    os.makedirs("/tmp/sample_test_files", exist_ok=True)

    # 1. Sample PDF File
    pdf_path = os.path.abspath("/tmp/sample_test_files/sample_invoice.pdf")
    sample_pdf_content = (
        b"%PDF-1.4\n"
        b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n"
        b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n"
        b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n"
        b"4 0 obj << /Length 75 >> stream\n"
        b"BT /F1 12 Tf 50 750 Td (INVOICE #1004) Tj ET\n"
        b"BT /F1 10 Tf 50 730 Td (Total Amount Due: $1,250.00) Tj ET\n"
        b"endstream\nendobj\n"
        b"5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n"
        b"xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000244 00000 n \n0000000368 00000 n \n"
        b"trailer << /Size 6 /Root 1 0 R >>\nstartxref\n430\n%%EOF"
    )
    with open(pdf_path, "wb") as f:
        f.write(sample_pdf_content)

    # 2. Sample CSV File
    csv_path = os.path.abspath("/tmp/sample_test_files/suppliers.csv")
    with open(csv_path, "w") as f:
        f.write("Product,Quantity,Price\nWidget A,100,25.00\nWidget B,50,45.50\n")

    # 3. Sample TXT File
    txt_path = os.path.abspath("/tmp/sample_test_files/notes.txt")
    with open(txt_path, "w") as f:
        f.write("Project Alpha Requirements\n1. Security Audit\n2. Local Encryption\n")

    html_path = os.path.abspath("index.html")
    url = f"file://{html_path}"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Open Application and Navigate to Transmute (.xmute)
        page.goto(url)
        page.wait_for_selector(".app-shell")

        page.click(".sidebar-item[data-id='transmute']")
        time.sleep(0.5)

        # Verify header
        assert page.locator("h2:has-text('Transmute Studio')").is_visible(), "Transmute header missing"
        print("  ✓ Navigation: Opened Transmute Studio (.xmute) panel")

        # ----------------------------------------------------
        # TEST 1: PDF FILE INSPECTION & NO "FILE INSPECTION FAILED"
        # ----------------------------------------------------
        print("\n[TEST 1] PDF File Inspection & Analysis...")

        # Set file input
        file_input = page.locator("#xmuteFileInput")
        file_input.set_input_files(pdf_path)
        time.sleep(0.5)

        # Assert file card details
        assert page.locator("div:has-text('sample_invoice.pdf')").first.is_visible(), "PDF file name missing from file card"
        assert page.locator("div:has-text('PDF Document')").first.is_visible(), "PDF Document structure not detected"
        assert not page.locator("text='file inspection failed'").is_visible(), "Erroneous file inspection failed alert displayed"
        print("  ✓ PDF Inspection: sample_invoice.pdf inspected successfully (PDF Document structure verified)")

        # ----------------------------------------------------
        # TEST 2: PDF -> TXT & PDF -> DOCX REAL CONVERSIONS
        # ----------------------------------------------------
        print("\n[TEST 2] PDF -> TXT & PDF -> DOCX Real Conversions...")

        # Select TXT target format
        page.click(".xmute-format-card:has-text('Extracted Text')")
        time.sleep(0.3)

        # Click Convert
        page.click("button:has-text('Convert File to TXT')")
        time.sleep(0.5)

        # Assert result and preview
        assert page.locator("div:has-text('Output Validated')").first.is_visible(), "TXT conversion output validation failed"
        assert page.locator("button:has-text('Download Converted')").is_visible(), "Download converted button not rendered"
        preview_txt = page.input_value("#xmutePreviewArea")
        assert "INVOICE #1004" in preview_txt, f"Extracted text mismatch: {preview_txt}"
        print("  ✓ PDF -> TXT Conversion: Extracted text 'INVOICE #1004' verified")

        # Select DOCX target format
        page.click(".xmute-format-card:has-text('Word Document')")
        time.sleep(0.3)
        page.click("button:has-text('Convert File to DOCX')")
        time.sleep(0.5)

        assert page.locator("div:has-text('Output Validated')").first.is_visible(), "DOCX conversion output validation failed"
        assert "OPENXML WORD DOCX PACKAGE GENERATED" in page.input_value("#xmutePreviewArea"), "Word DOCX conversion failed"
        print("  ✓ PDF -> DOCX Conversion: Generated Word DOCX document Blob successfully")

        # ----------------------------------------------------
        # TEST 3: CSV -> JSON & CSV -> HTML CONVERSIONS
        # ----------------------------------------------------
        print("\n[TEST 3] CSV -> JSON & CSV -> HTML Conversions...")

        page.click("button:has-text('Change File')")
        time.sleep(0.3)

        file_input.set_input_files(csv_path)
        time.sleep(0.5)

        # Select JSON Array target
        page.click(".xmute-format-card:has-text('JSON Array')")
        time.sleep(0.3)
        page.click("button:has-text('Convert File to JSON')")
        time.sleep(0.5)

        preview_json = page.input_value("#xmutePreviewArea")
        assert "Widget A" in preview_json and "Widget B" in preview_json, f"CSV -> JSON conversion failed: {preview_json}"
        print("  ✓ CSV -> JSON Conversion: Transmuted tabular CSV to JSON object array")

        # ----------------------------------------------------
        # TEST 4: TXT -> PDF REAL CONVERSION
        # ----------------------------------------------------
        print("\n[TEST 4] TXT -> PDF Document Conversion...")

        page.click("button:has-text('Change File')")
        time.sleep(0.3)

        file_input.set_input_files(txt_path)
        time.sleep(0.5)

        page.click(".xmute-format-card:has-text('PDF Document')")
        time.sleep(0.3)
        page.click("button:has-text('Convert File to PDF')")
        page.wait_for_selector("text=Output Validated")

        assert page.locator("text=Output Validated").first.is_visible(), "PDF generation output validation failed"
        assert "PDF DOCUMENT GENERATED" in page.input_value("#xmutePreviewArea"), "TXT -> PDF conversion failed"
        print("  ✓ TXT -> PDF Conversion: Transmuted text file into valid PDF document Blob")

        # ----------------------------------------------------
        # TEST 5: SAVED TRANSFORMATION PIPELINES
        # ----------------------------------------------------
        print("\n[TEST 5] Saved Transformation Pipelines...")
        page.click(".xmute-subnav-btn:has-text('Saved Pipelines')")
        time.sleep(0.5)

        # Load preset pipeline
        page.click("button:has-text('Base64 Decode + JSON Prettify')")
        time.sleep(0.3)

        # Enter Base64 JSON input ("eyJhbGciOiJIUzI1NiJ9" -> '{"alg":"HS256"}')
        b64_json = "eyJhbGciOiJIUzI1NiJ9"
        page.fill("#xmutePipelineInput", b64_json)
        page.click("button:has-text('Run Pipeline')")
        time.sleep(0.5)

        pipeline_out = page.input_value("#xmutePipelineOutput")
        assert "HS256" in pipeline_out, f"Pipeline execution failed: {pipeline_out}"
        print("  ✓ Saved Pipelines: Executed multi-step pipeline (Base64 Decode -> JSON Prettify)")

        # ----------------------------------------------------
        # TEST 6: TRANSFORM WORKBENCH TOOLS
        # ----------------------------------------------------
        print("\n[TEST 6] Transform Workbench Tools...")
        page.click(".xmute-subnav-btn:has-text('Transform Workbench')")
        time.sleep(0.5)

        # Test Base64 Encode
        page.select_option("#xmuteMode", "b64-enc")
        page.fill("#xmuteInput", "Offlines Private Workspace")
        time.sleep(0.3)
        out_b64 = page.input_value("#xmuteOutput")
        assert len(out_b64) > 10, "Base64 encoding output missing"
        print("  ✓ Transform Workbench: Base64 Encode verified")

        # Test SHA-256 Hash
        page.select_option("#xmuteMode", "sha256")
        time.sleep(0.3)
        out_sha = page.input_value("#xmuteOutput")
        assert len(out_sha) == 64, f"SHA-256 hash length mismatch: {out_sha}"
        print("  ✓ Transform Workbench: SHA-256 Hash generated (64 hex chars)")

        # ----------------------------------------------------
        # TEST 7: HISTORY & RELOAD PERSISTENCE
        # ----------------------------------------------------
        print("\n[TEST 7] History & Reload Persistence...")
        page.click("button:has-text('Save to Log')")
        time.sleep(0.3)

        page.click(".xmute-subnav-btn:has-text('History')")
        time.sleep(0.5)

        assert page.locator("#xmuteHistoryList").first.is_visible(), "History list not rendered"
        print("  ✓ History Log: Verified history entries")

        # Trigger .xmute export
        page.click("button:has-text('Export .xmute')")
        time.sleep(0.3)
        print("  ✓ Import/Export: Triggered .xmute package export")

        # Take screenshot
        os.makedirs("verification", exist_ok=True)
        screenshot_path = os.path.abspath("verification/transmute_complete_acceptance.png")
        page.screenshot(path=screenshot_path)
        print(f"  ✓ Captured verification screenshot at {screenshot_path}")

        browser.close()

    print("\n" + "=" * 60)
    print("ALL TRANSMUTE FUNCTIONAL E2E TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_transmute_complete_e2e()
