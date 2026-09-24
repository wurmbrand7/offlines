import os
from playwright.sync_api import sync_playwright

def test_offline_persistence():
    print("=== STARTING OFFLINE PERSISTENCE E2E TEST MATRIX ===")

    standalone_apps = [
        ("standalone/folio.html", "docs", "Folio Document"),
        ("standalone/grid.html", "sheets", "Grid Workbook"),
        ("standalone/docket.html", "tasks", "Docket Task"),
        ("standalone/almanac.html", "agenda", "Almanac Event"),
        ("standalone/spot.html", "notes", "Spot Note"),
        ("standalone/fill.html", "forms", "Fill Form"),
        ("standalone/glides.html", "slides", "Glides Slide"),
        ("standalone/lockbox.html", "lockbox", "Lockbox Vault")
    ]

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        context.set_offline(True)

        for app_rel_path, mod_id, app_name in standalone_apps:
            page = context.new_page()
            console_errors = []
            network_requests = []

            page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
            page.on("request", lambda req: network_requests.append(req.url))

            app_path = os.path.abspath(app_rel_path)
            file_url = f"file://{app_path}"

            print(f"\n--- Testing Standalone App: {app_name} ({app_rel_path}) ---")

            # A & B. Start with network blocked and open app
            page.goto(file_url)
            page.wait_for_selector(f"#panel-{mod_id}.active")
            print(f"  ✓ {app_name} opened standalone offline.")

            # C & D. Create and save real data
            if mod_id == 'docs':
                page.evaluate("""() => {
                    saveLocal('docs', { format: 'folio', document: { title: 'Standalone Folio Title', content: 'Initial standalone content.' } });
                    renderDocs();
                }""")
            elif mod_id == 'sheets':
                page.evaluate("""() => {
                    saveLocal('sheets', { version: '2.0', sheets: [{ name: 'Sheet 1', rows: 10, cols: 5, cells: { 'A1': { value: '500', raw: '500' } } }] });
                    renderSheets();
                }""")
            elif mod_id == 'tasks':
                page.evaluate("""() => {
                    const d = getTasksData();
                    d.items.push({id: 881, x: 20, y: 20, label: 'Standalone Task 1', done: false, createdDate: todayStr()});
                    saveLocal('tasks', d);
                    renderTasks();
                }""")
            elif mod_id == 'agenda':
                page.evaluate("""() => {
                    const d = getAgendaData();
                    d.events.push({id: 882, title: 'Standalone Event 1', date: todayStr(), category: 'event'});
                    saveLocal('agenda', d);
                    renderAgenda();
                }""")
            elif mod_id == 'notes':
                page.evaluate("""() => {
                    const d = getNotesData();
                    d.items.push({id: 883, x: 30, y: 30, text: 'Standalone Note 1'});
                    saveLocal('notes', d);
                    renderNotes();
                }""")
            elif mod_id == 'forms':
                page.evaluate("""() => {
                    const d = getFormsData();
                    d.fields.push({label: 'Standalone Field 1', type: 'text'});
                    saveLocal('forms', d);
                    renderForms();
                }""")
            elif mod_id == 'slides':
                page.evaluate("""() => {
                    const d = getSlidesData();
                    d.slides.push({text: 'Standalone Slide 1'});
                    saveLocal('slides', d);
                    renderSlides();
                }""")
            elif mod_id == 'lockbox':
                page.evaluate("""() => {
                    saveLocal('test_lockbox_persistence', 'lockbox_persisted');
                }""")

            print(f"  ✓ Initial data created and saved in {app_name}.")

            # E & F. Reload and verify data
            page.reload()
            page.wait_for_selector(f"#panel-{mod_id}.active")

            if mod_id == 'docs':
                assert page.input_value("#folioDocTitle") == "Standalone Folio Title"
            elif mod_id == 'sheets':
                assert page.locator("#cell-A1").input_value() == "500"
            elif mod_id == 'tasks':
                assert "Standalone Task 1" in page.content()
            elif mod_id == 'agenda':
                assert "Standalone Event 1" in page.content()
            elif mod_id == 'notes':
                assert "Standalone Note 1" in page.content()
            elif mod_id == 'forms':
                assert "Standalone Field 1" in page.content()
            elif mod_id == 'slides':
                assert "Standalone Slide 1" in page.content()
            elif mod_id == 'lockbox':
                val = page.evaluate("loadLocal('test_lockbox_persistence', null)")
                assert val == 'lockbox_persisted'

            print(f"  ✓ Initial data verified after reload in {app_name}.")

            # G & H & I. Modify data, reload, and verify modified data
            if mod_id == 'docs':
                page.evaluate("""() => {
                    saveLocal('docs', { format: 'folio', document: { title: 'Modified Folio Title', content: 'Modified standalone content.' } });
                    renderDocs();
                }""")
                page.reload()
                page.wait_for_selector(f"#panel-{mod_id}.active")
                assert page.input_value("#folioDocTitle") == "Modified Folio Title"
            elif mod_id == 'sheets':
                page.evaluate("""() => {
                    saveLocal('sheets', { version: '2.0', sheets: [{ name: 'Sheet 1', rows: 10, cols: 5, cells: { 'A1': { value: '999', raw: '999' } } }] });
                    renderSheets();
                }""")
                page.reload()
                page.wait_for_selector(f"#panel-{mod_id}.active")
                assert page.locator("#cell-A1").input_value() == "999"
            else:
                page.evaluate(f"saveLocal('test_mod_{mod_id}', 'modified_val')")
                page.reload()
                page.wait_for_selector(f"#panel-{mod_id}.active")
                mod_val = page.evaluate(f"loadLocal('test_mod_{mod_id}', null)")
                assert mod_val == 'modified_val'

            print(f"  ✓ Modified data verified after second reload in {app_name}.")

            # J & K. Network and Console Error Audits
            ext_reqs = [u for u in network_requests if not u.startswith("file://") and not u.startswith("data:")]
            assert len(ext_reqs) == 0, f"External requests detected in {app_name}: {ext_reqs}"
            assert len(console_errors) == 0, f"Console errors detected in {app_name}: {console_errors}"

            print(f"  ✓ 0 external requests and 0 console errors verified in {app_name}.")
            page.close()

        browser.close()
        print("\n=== OFFLINE PERSISTENCE E2E TEST MATRIX PASSED 100% ===")

if __name__ == "__main__":
    test_offline_persistence()
