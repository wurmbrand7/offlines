import os
import time
import json
from playwright.sync_api import sync_playwright

def test_transmute_complete():
    print("=== STARTING TRANSMUTE COMPLETE E2E TEST ===")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto('file:///app/standalone/transmute.html')
        page.wait_for_timeout(500)

        # 1. Verify Subnav buttons exist
        subnav_buttons = page.query_selector_all('.xmute-subnav-btn')
        print(f"✓ Found {len(subnav_buttons)} subnav buttons.")
        assert len(subnav_buttons) >= 6

        # 2. Verify Format cards
        format_cards = page.query_selector_all('.xmute-format-card')
        print(f"✓ Found {len(format_cards)} target format cards.")
        assert len(format_cards) >= 9

        # 3. Test Navigation to Home, Transform, Pipelines, Settings
        page.click("button:has-text('Transform Workbench')")
        page.wait_for_timeout(200)
        assert page.query_selector('#xmuteInput') is not None
        print("✓ Switched to Transform Workbench.")

        page.click("button:has-text('Saved Pipelines')")
        page.wait_for_timeout(200)
        assert page.query_selector('#xmutePipelineInput') is not None
        print("✓ Switched to Saved Pipelines.")

        page.click("button:has-text('Convert Files')")
        page.wait_for_timeout(200)
        assert page.query_selector('.xmute-dropzone') is not None
        print("✓ Returned to Convert Files.")

        browser.close()
    print("=== TRANSMUTE COMPLETE E2E TEST PASSED ===")

if __name__ == '__main__':
    test_transmute_complete()
