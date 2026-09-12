import json
import os
from playwright.sync_api import sync_playwright

def test_local_only():
    print("=== STARTING STRICT LOCAL ONLY E2E TEST SUITE ===")

    html_path = os.path.abspath("index.html")
    file_url = f"file://{html_path}"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()

        # MANDATORY RULE: Network blocking MUST occur BEFORE application startup
        context.set_offline(True)
        page = context.new_page()

        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        network_requests = []
        page.on("request", lambda req: network_requests.append(req.url))

        print("1. Loading Suite with network blocked prior to navigation...")
        page.goto(file_url)
        page.wait_for_selector("#workspace")
        print("✓ Suite loaded successfully with network blocked before navigation.")

        # 2. Forensic Source Audit
        print("2. Performing Executable Source Forensics Audit...")
        prohibited_terms = [
            'mergeItemArrays', 'mergeBundles', 'remoteBundle', 'remoteModTimes',
            'SYNC_PUSH_URL', 'SYNC_PULL_URL', 'suite-sync', 'pwnedpasswords',
            'BREACH_API', 'LICENSE_VERIFY_URL', 'mode-toggle', 'free:true', 'free:false'
        ]

        exec_files = ['index.html', 'manifest.json', 'sw.js']
        for root, dirs, files in os.walk('standalone'):
            for f in files:
                exec_files.append(os.path.join(root, f))

        violations = []
        for fpath in exec_files:
            if os.path.isfile(fpath):
                with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
                    txt = f.read()
                    for term in prohibited_terms:
                        if term in txt:
                            violations.append((fpath, term))

        print(f"Forensic violations found: {len(violations)}")
        assert len(violations) == 0, f"Prohibited terms in executable source: {violations}"
        print("✓ Zero prohibited terms found in executable source.")

        # 3. Test Navigation across all modules
        print("3. Testing Navigation across all 11 workspace modules...")
        modules = ['today', 'docs', 'sheets', 'forms', 'notes', 'tasks', 'agenda', 'slides', 'lockbox', 'security', 'privacy']
        for mod in modules:
            page.evaluate(f"activateTab('{mod}')")
            page.wait_for_selector(f"#panel-{mod}.active")
        print("✓ All 11 modules accessible without lock screens or network requests.")

        # 4. Verify External Network Requests
        print("4. Verifying captured network activity...")
        external_reqs = [u for u in network_requests if not u.startswith("file://") and not u.startswith("data:")]
        print(f"External network requests captured: {len(external_reqs)}")
        assert len(external_reqs) == 0, f"External network requests detected: {external_reqs}"
        print("✓ Zero external network requests detected.")

        # 5. Console Error Audit
        print(f"5. Console Error Audit: {len(console_errors)} errors detected.")
        assert len(console_errors) == 0, f"Console errors detected: {console_errors}"
        print("✓ Zero console errors detected.")

        browser.close()
        print("=== LOCAL ONLY E2E TEST SUITE PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    test_local_only()
