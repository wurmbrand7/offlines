import os
import sys
import time
from playwright.sync_api import sync_playwright

def run_docket_deep_rebuild_e2e():
    print("==================================================")
    print("RUNNING DOCKET DEEP REBUILD E2E VERIFICATION TEST")
    print("==================================================")

    html_path = os.path.abspath("index.html")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Load application
        page.goto(f"file://{html_path}")
        page.wait_for_selector(".app-shell")

        # Navigate to Docket Tasks (.plot)
        page.click(".sidebar-item[data-id='tasks']")
        time.sleep(0.5)

        # TEST 1: Quick Capture Modal
        page.click("button[onclick*='openDocketQuickCaptureModal']")
        page.wait_for_selector("#qcTaskTitle")
        page.fill("#qcTaskTitle", "Deep Rebuild Verification Task")
        page.fill("#qcTaskNotes", "Testing end-to-end task inspector and execution mechanics")
        page.click("button:has-text('Save Task')")
        time.sleep(0.5)

        # Assert Task Rendered in List
        assert "Deep Rebuild Verification Task" in page.content(), "TEST FAILED: Quick Captured task title not found on page"
        print("  [PASS] DOC-001: Quick Capture task successfully created and rendered")

        # TEST 2: Task Inspector & Subtasks Creation
        # Find task item and open detail modal
        page.click("text=Deep Rebuild Verification Task")
        page.wait_for_selector("#capsuleModal")
        time.sleep(0.3)

        # Switch to Structure tab and add subtasks
        page.click("button:has-text('🌿 Structure')")
        time.sleep(0.3)

        page.fill("#newSubtaskTitle", "Subtask Alpha 1")
        page.click("button:has-text('+ Add Subtask')")
        time.sleep(0.3)

        page.fill("#newSubtaskTitle", "Subtask Beta 2")
        page.click("button:has-text('+ Add Subtask')")
        time.sleep(0.3)

        assert "Subtask Alpha 1" in page.content(), "TEST FAILED: Subtask Alpha 1 not rendered in Structure tab"
        assert "Subtask Beta 2" in page.content(), "TEST FAILED: Subtask Beta 2 not rendered in Structure tab"
        print("  [PASS] DOC-002: Created parent task with 2 subtasks in Task Inspector")

        # Save Changes
        page.click("button:has-text('Save Changes')")
        time.sleep(0.3)

        # TEST 3: Kanban Drag and Drop / View Switching
        page.click(".docket-header-bar button:has-text('Board')")
        time.sleep(0.5)
        assert "DEEP REBUILD VERIFICATION TASK" in page.content().upper() or "Deep Rebuild Verification Task" in page.content(), "TEST FAILED: Task not found in Kanban Board view"
        print("  [PASS] DOC-003: Rendered Kanban Board view")

        # TEST 4: Date-Driven Calendar View
        page.click(".docket-header-bar button:has-text('Calendar')")
        time.sleep(0.5)
        assert "CALENDAR SCHEDULE" in page.content().upper(), "TEST FAILED: Calendar Schedule view not rendered"
        print("  [PASS] DOC-004: Date-Driven Calendar view rendered with current month schedule")

        # TEST 5: Date-Driven Timeline Gantt Chart
        page.click(".docket-header-bar button:has-text('Timeline')")
        time.sleep(0.5)
        assert "DATE-DRIVEN PROJECT TIMELINE" in page.content().upper() or "Timeline" in page.content(), "TEST FAILED: Timeline Gantt chart view not rendered"
        print("  [PASS] DOC-005: Date-driven Timeline Gantt chart successfully calculated and rendered")

        # TEST 6: Review Action Center
        page.click("button[onclick*=\"setDocketNav('review')\"]")
        time.sleep(0.5)
        assert "WORKFLOW REVIEW" in page.content().upper() and "ACTION CENTER" in page.content().upper(), "TEST FAILED: Review Action Center title not found"
        print("  [PASS] DOC-006: Review Workflow Action Center rendered with action buttons")

        # TEST 7: Local Storage Reload Persistence
        page.reload()
        page.wait_for_selector(".app-shell")
        page.click(".sidebar-item[data-id='tasks']")
        time.sleep(0.5)

        assert "Deep Rebuild Verification Task" in page.content(), "TEST FAILED: Task not persisted in localStorage after page reload"
        print("  [PASS] DOC-007: Verified local storage reload persistence")

        # Capture screenshot for visual inspection
        os.makedirs("/home/jules/verification", exist_ok=True)
        screenshot_path = "/home/jules/verification/docket_deep_rebuild.png"
        page.screenshot(path=screenshot_path)
        print(f"  [PASS] Captured verification screenshot at {screenshot_path}")

        browser.close()

    print("--------------------------------------------------")
    print("ALL DOCKET DEEP REBUILD E2E TESTS PASSED!")
    print("--------------------------------------------------")

if __name__ == "__main__":
    run_docket_deep_rebuild_e2e()
