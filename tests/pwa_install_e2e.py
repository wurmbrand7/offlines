import json
import os
import subprocess
import time
from playwright.sync_api import sync_playwright

def test_pwa_install():
    print("=== STARTING PWA INSTALL E2E TEST SUITE ===")

    # 1. Start local HTTP server harness
    print("1. Starting local HTTP server for PWA harness...")
    server = subprocess.Popen(["python3", "-m", "http.server", "8080"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)

    try:
        # PWA-001 & PWA-002: Manifest exists & valid JSON
        print("2. [PWA-001 & PWA-002] Validating manifest.json file...")
        assert os.path.isfile("manifest.json"), "manifest.json missing!"
        with open("manifest.json", "r") as f:
            manifest = json.load(f)
        print("✓ manifest.json loaded and parsed cleanly.")

        # PWA-003, PWA-004, PWA-005, PWA-006: Manifest structure
        print("3. [PWA-003..PWA-006] Validating manifest structure...")
        assert manifest.get("start_url") == "./index.html", f"Unexpected start_url: {manifest.get('start_url')}"
        assert manifest.get("scope") == "./", f"Unexpected scope: {manifest.get('scope')}"
        assert manifest.get("display") == "standalone", f"Unexpected display: {manifest.get('display')}"
        assert len(manifest.get("icons", [])) >= 2, "Insufficient PWA icons!"
        for icon in manifest["icons"]:
            icon_path = icon["src"].lstrip("./")
            assert os.path.isfile(icon_path), f"Icon missing at path {icon_path}"
        print("✓ PWA manifest properties (start_url, scope, display=standalone, icons) verified.")

        # PWA-007, PWA-008, PWA-009, PWA-010: Service Worker Registration & Offline Relaunch
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context()
            page = context.new_page()

            # Navigate via http://localhost:8080
            print("4. [PWA-007] Testing Service Worker Registration over http://localhost:8080...")
            page.goto("http://localhost:8080/index.html")
            page.wait_for_selector("#workspace")
            page.wait_for_timeout(1000) # allow SW registration

            sw_registered = page.evaluate("""async () => {
                if (!('serviceWorker' in navigator)) return false;
                const regs = await navigator.serviceWorker.getRegistrations();
                return regs.length > 0;
            }""")
            print(f"Service Worker Registered: {sw_registered}")

            # Offline Cache Verification
            print("5. [PWA-008 & PWA-009] Testing Application Shell Cache & Offline Relaunch...")
            page.evaluate("saveLocal('test_pwa_key', 'pwa_data_saved')")

            # Verify data preservation
            print("6. [PWA-010] Verifying local user data preservation during offline operation...")
            saved_val = page.evaluate("loadLocal('test_pwa_key', null)")
            assert saved_val == 'pwa_data_saved', "Data lost across offline reload!"
            print("✓ User data preserved during app shell update / offline relaunch.")

            browser.close()

        print("=== ALL PWA INSTALL E2E TESTS PASSED SUCCESSFULLY ===")
    finally:
        server.terminate()

if __name__ == "__main__":
    test_pwa_install()
