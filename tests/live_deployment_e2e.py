import sys
import time
import subprocess
import json
from playwright.sync_api import sync_playwright

def test_local_and_live_deployment_parity():
    print("=== STARTING DEPLOYMENT PARITY E2E TEST ===")

    # 1. Start local HTTP server
    port = 8889
    server = subprocess.Popen(["python3", "-m", "http.server", str(port)])
    time.sleep(1.5)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            # Load local server
            url = f"http://localhost:{port}/index.html"
            print(f"Loading local HTTP app from {url}...")
            res = page.goto(url)
            assert res.status == 200, f"Failed HTTP load: status {res.status}"
            page.wait_for_timeout(1000)

            # Inspect Build Fingerprint
            build_id = page.evaluate("window.SUITE_BUILD_ID")
            print(f"Verified Local Build ID: {build_id}")
            assert build_id == "LOCAL-ONLY-2026-09-10-V6", f"Unexpected build ID: {build_id}"

            # Verify Diagnostics Modal
            page.click("button:has-text('⚙ Diagnostics')")
            page.wait_for_timeout(300)
            diag_text = page.inner_text("#capsuleModal")
            assert "LOCAL-ONLY-2026-09-10-V6" in diag_text, "Build ID missing from Diagnostics"
            assert "suite-cache-v6" in diag_text, "SW Cache V6 missing from Diagnostics"
            print("✓ Diagnostics Modal contains verified V6 fingerprint")

            # Verify SW script
            sw_res = page.goto(f"http://localhost:{port}/sw.js")
            assert sw_res.status == 200
            sw_content = page.content()
            assert "suite-cache-v6" in sw_content, "sw.js missing suite-cache-v6"
            print("✓ Service Worker sw.js verified with suite-cache-v6")

            # Verify BUILD_INFO.json
            info_res = page.goto(f"http://localhost:{port}/BUILD_INFO.json")
            assert info_res.status == 200
            info_data = page.inner_text("body")
            assert "LOCAL-ONLY-2026-09-10-V6" in info_data, "BUILD_INFO.json missing V6 build ID"
            print("✓ BUILD_INFO.json verified with V6 build ID")

            browser.close()
            print("=== DEPLOYMENT PARITY E2E TEST PASSED ===")
    finally:
        server.terminate()

if __name__ == "__main__":
    test_local_and_live_deployment_parity()
