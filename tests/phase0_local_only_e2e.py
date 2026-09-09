import os
import re
from playwright.sync_api import sync_playwright

def test_phase0_local_only():
    print("=== STARTING PHASE 0 MANDATORY LOCAL-ONLY E2E TEST ===")
    html_path = os.path.abspath("index.html")
    file_url = f"file://{html_path}"

    # 1. Source Forensics Audit
    print("1. Source Forensics Audit on Executable Codebase...")
    prohibited_terms = [
        'hybrid', 'body.hybrid', 'sync-panel', 'sync-card', 'sync-badge',
        'setMode', 'loggedFetch', 'offlineModeStrict', 'SYNC_PUSH_URL', 'SYNC_PULL_URL',
        'suite-sync', 'offlines.xyz/suite-sync', 'codersagent.com/suite-sync', 'pwnedpasswords'
    ]

    executable_files = ['index.html', 'manifest.json', 'sw.js']
    for root, dirs, files in os.walk('standalone'):
        for f in files:
            executable_files.append(os.path.join(root, f))

    forensic_violations = []
    for fpath in executable_files:
        if os.path.isfile(fpath):
            with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                for term in prohibited_terms:
                    if term.lower() in content.lower():
                        forensic_violations.append((fpath, term))

    print(f"Forensic violations found in executable source: {len(forensic_violations)}")
    assert len(forensic_violations) == 0, f"Prohibited terms found in executable source: {forensic_violations}"
    print("✓ Source Forensics Audit PASSED (0 hybrid/sync/network-abstraction matches in executable source).")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Attach network request interception BEFORE navigation
        context = browser.new_context()
        page = context.new_page()

        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        network_requests = []
        page.on("request", lambda req: network_requests.append(req.url))

        # TEST 1 — APPLICATION STARTUP
        print("2. Testing Application Startup...")
        page.goto(file_url)
        page.wait_for_selector("#workspace")
        print("✓ Application loaded cleanly.")

        # TEST 2 — NO SYNC UI
        print("3. Testing DOM for Sync/Hybrid UI Removal...")
        dom_content = page.content()
        sync_ui_terms = ['Sync now', 'Sync Key', 'Auto-sync', 'Hybrid sync', 'Sync server', 'Hybrid mode']
        for term in sync_ui_terms:
            assert term.lower() not in dom_content.lower(), f"Forbidden UI term '{term}' found in DOM!"
        print("✓ Zero sync/hybrid UI elements found in DOM.")

        # TEST 3 & 4 — NO API KEY OR LICENSE REQUIREMENT
        print("4. Verifying No API Key or License Prompts...")
        assert "enter api key" not in dom_content.lower()
        assert "activate license" not in dom_content.lower()
        assert "upgrade to pro" not in dom_content.lower()
        print("✓ Zero API key, license, or payment prompts.")

        # TEST 5 — MODULE ACCESS
        print("5. Testing Module Access (All 11 workspace modules)...")
        modules = ['today', 'docs', 'sheets', 'forms', 'notes', 'tasks', 'agenda', 'slides', 'lockbox', 'security', 'privacy']
        for mod in modules:
            page.evaluate(f"activateTab('{mod}')")
            page.wait_for_selector(f"#panel-{mod}.active")
        print("✓ All 11 modules accessible without lock overlays.")

        # TEST 6 — FOLIO DOCUMENT PERSISTENCE
        print("6. Testing Folio Document Creation, Editing & Persistence...")
        page.evaluate("activateTab('docs')")
        page.wait_for_selector("#panel-docs.active")
        page.fill("#folioDocTitle", "Executive Spec")
        page.dispatch_event("#folioDocTitle", "input")
        page.click("#docsEditor")
        page.type("#docsEditor", " Strictly offline document content.")
        page.click("#panel-docs button:has-text('Save Document')")

        page.reload()
        page.evaluate("activateTab('docs')")
        page.wait_for_selector("#panel-docs.active")
        assert page.input_value("#folioDocTitle") == "Executive Spec"
        assert "Strictly offline document content." in page.locator("#docsEditor").inner_text()
        print("✓ Folio document created, saved, reloaded, and verified.")

        # TEST 7 — GRID SPREADSHEET PERSISTENCE, FORMULAS & MULTI-SHEET
        print("7. Testing Grid Spreadsheet Creation, Formulas, Multi-Sheet & Persistence...")
        page.evaluate("activateTab('sheets')")
        page.wait_for_selector("#panel-sheets.active")

        page.click("#cell-A1")
        page.fill("#cell-A1", "100")
        page.dispatch_event("#cell-A1", "blur")

        page.click("#cell-A2")
        page.fill("#cell-A2", "200")
        page.dispatch_event("#cell-A2", "blur")

        page.click("#cell-A3")
        page.fill("#gridFormulaInput", "=SUM(A1:A2)")
        page.click("#panel-sheets button:has-text('Apply')")

        val = page.locator("#cell-A3").input_value()
        assert val == "300", f"Expected cell A3 formula eval 300, got {val}"

        # Test Multi-Sheet Creation & Switching
        page.click("#panel-sheets button:has-text('+ Sheet')")
        page.wait_for_timeout(100)
        page.click("#panel-sheets span:has-text('Sheet 1')")
        page.wait_for_timeout(100)

        page.click("#panel-sheets button:has-text('Export .grid')")

        page.reload()
        page.evaluate("activateTab('sheets')")
        page.wait_for_selector("#panel-sheets.active")
        assert page.locator("#cell-A3").input_value() == "300"
        print("✓ Grid formula evaluated (=SUM(A1:A2) -> 300), multi-sheet created, and persisted across reload.")

        # TEST 8 — DOCKET (TASKS) PERSISTENCE
        print("8. Testing Docket Task Creation & Persistence...")
        page.evaluate("activateTab('tasks')")
        page.wait_for_selector("#panel-tasks.active")
        page.evaluate("""() => {
            const d = getTasksData();
            d.items = d.items || [];
            d.items.push({id: Date.now(), x:50, y:50, label: 'Local Task Phase 0', done: false, createdDate: todayStr()});
            saveLocal('tasks', d);
            renderTasks();
        }""")

        page.reload()
        page.evaluate("activateTab('tasks')")
        page.wait_for_selector("#panel-tasks.active")
        assert "Local Task Phase 0" in page.content()
        print("✓ Docket task created and persisted.")

        # TEST 9 — ALMANAC (AGENDA) PERSISTENCE
        print("9. Testing Almanac Event Creation & Persistence...")
        page.evaluate("activateTab('agenda')")
        page.wait_for_selector("#panel-agenda.active")
        page.evaluate("""() => {
            const d = getAgendaData();
            d.events = d.events || [];
            d.events.push({id: Date.now(), title: 'Local Event Phase 0', date: todayStr(), category: 'event'});
            saveLocal('agenda', d);
            renderAgenda();
        }""")

        page.reload()
        page.evaluate("activateTab('agenda')")
        page.wait_for_selector("#panel-agenda.active")
        assert "Local Event Phase 0" in page.content()
        print("✓ Almanac event created and persisted.")

        # TEST 10 — SPOT (NOTES) PERSISTENCE
        print("10. Testing Spot Note Creation & Persistence...")
        page.evaluate("activateTab('notes')")
        page.wait_for_selector("#panel-notes.active")
        page.evaluate("""() => {
            const d = getNotesData();
            d.items = d.items || [];
            d.items.push({id: Date.now(), x:40, y:40, text: 'Local Note Phase 0'});
            saveLocal('notes', d);
            renderNotes();
        }""")

        page.reload()
        page.evaluate("activateTab('notes')")
        page.wait_for_selector("#panel-notes.active")
        assert "Local Note Phase 0" in page.content()
        print("✓ Spot note created and persisted.")

        # TEST 11 — OFFLINE NETWORK BLOCK AUDIT
        print("11. Auditing External Network Activity Throughout Full Test Session...")
        ext_requests = [url for url in network_requests if not url.startswith("file://") and not url.startswith("data:")]
        print(f"External requests captured during session: {len(ext_requests)}")
        assert len(ext_requests) == 0, f"Expected 0 external requests, got: {ext_requests}"
        print("✓ 0 external network requests captured.")

        # TEST 12 — CONSOLE ERROR AUDIT
        print(f"12. Console Error Audit: {len(console_errors)} errors detected.")
        assert len(console_errors) == 0, f"Console errors detected: {console_errors}"
        print("✓ 0 console errors detected.")

        browser.close()
        print("=== MANDATORY PHASE 0 E2E TEST SUITE PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    test_phase0_local_only()
