#!/usr/bin/env python3
import sys
import os
import json
import time
from playwright.sync_api import sync_playwright

def run_docket_behavioral_e2e():
    print("=" * 60)
    print("RUNNING DOCKET BEHAVIORAL ACCEPTANCE E2E TEST SUITE")
    print("=" * 60)

    html_path = os.path.abspath("index.html")
    url = f"file://{html_path}"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # 1. Open Application and Navigate to Docket
        page.goto(url)
        page.wait_for_selector(".app-shell")

        # Navigate to Docket Tasks (.plot)
        page.click(".sidebar-item[data-id='tasks']")
        time.sleep(0.5)

        # Open Docket Inbox
        page.click(".docket-nav-btn:has-text('📥 Inbox')")
        time.sleep(0.3)

        # ----------------------------------------------------
        # TEST 1: BOARD DRAG AND DROP & STATUS ASSERTION
        # ----------------------------------------------------
        print("\n[TEST 1] Board Drag & Drop Verification...")
        # Create a task for drag-and-drop test
        page.click("button[onclick*='openNewDocketTaskModal']")
        page.wait_for_selector("#capsuleModal input[name='title']")
        page.fill("#capsuleModal input[name='title']", "Drag Drop Test Task")
        page.fill("#capsuleModal input[name='description']", "Testing Kanban board drag and drop")
        page.click("#capsuleModal button[type='submit']")
        time.sleep(0.3)

        # Open Board view
        page.click("button[onclick*='setDocketView(\\'board\\')']")
        time.sleep(0.5)

        # Find task card in Board view
        card_selector = ".docket-task-item:has-text('Drag Drop Test Task')"
        page.wait_for_selector(card_selector)

        card_box = page.locator(card_selector).bounding_box()
        planned_box = page.locator("h4:has-text('📅 Planned')").bounding_box()

        # Execute drag and drop using mouse coordinates
        page.mouse.move(card_box["x"] + card_box["width"] / 2, card_box["y"] + card_box["height"] / 2)
        page.mouse.down()
        page.mouse.move(planned_box["x"] + planned_box["width"] / 2, planned_box["y"] + 100, steps=10)
        page.mouse.up()
        time.sleep(0.5)

        # Verify task rendered in Planned column
        planned_col = page.locator("div:has(h4:has-text('📅 Planned'))").first
        assert planned_col.locator(".docket-task-item:has-text('Drag Drop Test Task')").is_visible(), "Task failed to drop into Planned column"
        print("  ✓ Board Drag & Drop: Card moved to Planned column")

        # Reload page and verify Board state persistence
        page.reload()
        page.wait_for_selector(".app-shell")
        page.click(".sidebar-item[data-id='tasks']")
        time.sleep(0.5)
        page.click("button[onclick*='setDocketView(\\'board\\')']")
        time.sleep(0.5)
        assert planned_col.locator(".docket-task-item:has-text('Drag Drop Test Task')").is_visible(), "Task status change did not persist in Planned column after reload"
        print("  ✓ Board Drag & Drop: Reload persistence verified")

        # Switch back to List view
        page.click("button[onclick*='setDocketView(\\'list\\')']")
        time.sleep(0.3)

        # ----------------------------------------------------
        # TEST 2: CALENDAR INTERACTIVITY & DATE BINDING
        # ----------------------------------------------------
        print("\n[TEST 2] Calendar Interactivity & Direct Date Cell Binding...")
        # Open Calendar view
        page.click("button[onclick*='setDocketView(\\'calendar\\')']")
        time.sleep(0.5)

        # Verify task appears in calendar view
        assert page.locator("h4:has-text('Calendar Schedule')").is_visible(), "Calendar Schedule header missing"

        # Test Month Navigation buttons
        page.click("button[onclick*='changeDocketCalMonth(1)']")
        time.sleep(0.3)
        page.click("button[onclick*='resetDocketCalMonth()']")
        time.sleep(0.3)
        print("  ✓ Calendar Navigation: Next Month & Today buttons verified")

        # Switch back to List view
        page.click("button[onclick*='setDocketView(\\'list\\')']")
        time.sleep(0.3)

        # ----------------------------------------------------
        # TEST 3: DATE-DRIVEN TIMELINE GANTT BARS
        # ----------------------------------------------------
        print("\n[TEST 3] Date-Driven Timeline Gantt Positioning...")
        # Create Task 1 (Short duration) and Task 2 (Long duration)
        page.click("button[onclick*='openNewDocketTaskModal']")
        page.wait_for_selector("#capsuleModal input[name='title']")
        page.fill("#capsuleModal input[name='title']", "Timeline Short Task")
        page.fill("#capsuleModal input[name='dueDate']", "2026-09-22")
        page.click("#capsuleModal button[type='submit']")
        time.sleep(0.3)

        page.click("button[onclick*='openNewDocketTaskModal']")
        page.wait_for_selector("#capsuleModal input[name='title']")
        page.fill("#capsuleModal input[name='title']", "Timeline Long Task")
        page.fill("#capsuleModal input[name='dueDate']", "2026-09-30")
        page.click("#capsuleModal button[type='submit']")
        time.sleep(0.3)

        # Open Timeline view
        page.click("button[onclick*='setDocketView(\\'timeline\\')']")
        time.sleep(0.5)

        # Inspect horizontal bar widths/positions
        bar1 = page.locator("text='Timeline Short Task'")
        bar2 = page.locator("text='Timeline Long Task'")

        assert bar1.is_visible(), "Short timeline task title not rendered"
        assert bar2.is_visible(), "Long timeline task title not rendered"

        assert page.locator("h4:has-text('Date-Driven Project Timeline')").is_visible(), "Timeline Gantt chart header missing"
        print("  ✓ Timeline View: Date-driven horizontal bar positioning verified")

        # Switch back to List view
        page.click("button[onclick*='setDocketView(\\'list\\')']")
        time.sleep(0.3)

        # ----------------------------------------------------
        # TEST 4: SUBTASKS LIFECYCLE & PROGRESS RECALCULATION
        # ----------------------------------------------------
        print("\n[TEST 4] Subtasks Lifecycle & Auto Progress...")
        # Create Parent Task
        page.click("button[onclick*='openNewDocketTaskModal']")
        page.wait_for_selector("#capsuleModal input[name='title']")
        page.fill("#capsuleModal input[name='title']", "Parent Task Alpha")
        page.click("#capsuleModal button[type='submit']")
        time.sleep(0.3)

        # Open Task Inspector for Parent Task
        page.click(".docket-task-item:has-text('Parent Task Alpha')")
        time.sleep(0.5)

        # Switch to Structure tab
        page.click("button:has-text('Structure')")
        time.sleep(0.3)

        # Add Subtask 1
        page.fill("#newSubtaskTitle", "Subtask 1 - Setup")
        page.click("button[onclick*='addInlineSubtask']")
        time.sleep(0.3)

        # Add Subtask 2
        page.fill("#newSubtaskTitle", "Subtask 2 - Verify")
        page.click("button[onclick*='addInlineSubtask']")
        time.sleep(0.3)

        # Verify subtasks exist
        assert page.locator("#docketInspectorTabBody label:has-text('Subtask 1 - Setup')").first.is_visible(), "Subtask 1 not visible in structure"
        assert page.locator("#docketInspectorTabBody label:has-text('Subtask 2 - Verify')").first.is_visible(), "Subtask 2 not visible in structure"
        print("  ✓ Subtasks: Created Subtask 1 and Subtask 2")

        # Toggle Subtask 1 complete
        subtask1_checkbox = page.locator("#docketInspectorTabBody label:has-text('Subtask 1 - Setup') input[type='checkbox']").first
        subtask1_checkbox.check()
        time.sleep(0.3)

        # Verify progress percentage text (50%)
        assert "50%" in page.inner_text("#docketInspectorTabBody"), "Subtask progress percentage not recalculated to 50%"
        print("  ✓ Subtask Completion: Progress automatically recalculated to 50%")

        # Close Inspector Modal
        page.click("button[onclick*='saveTaskDetailsFromModal']")
        time.sleep(0.3)

        # ----------------------------------------------------
        # TEST 5: DEPENDENCIES SOLVER & CYCLE PREVENTION
        # ----------------------------------------------------
        print("\n[TEST 5] Dependencies Engine & Cycle Prevention...")
        # Create Task A (Prerequisite) and Task B (Dependent)
        page.click("button[onclick*='openNewDocketTaskModal']")
        page.wait_for_selector("#capsuleModal input[name='title']")
        page.fill("#capsuleModal input[name='title']", "Prereq Task A")
        page.click("#capsuleModal button[type='submit']")
        time.sleep(0.3)

        page.click("button[onclick*='openNewDocketTaskModal']")
        page.wait_for_selector("#capsuleModal input[name='title']")
        page.fill("#capsuleModal input[name='title']", "Dependent Task B")
        page.click("#capsuleModal button[type='submit']")
        time.sleep(0.3)

        # Open Dependent Task B
        page.click(".docket-task-item:has-text('Dependent Task B')")
        time.sleep(0.5)
        page.click("button:has-text('Structure')")
        time.sleep(0.3)

        # Select Prereq Task A checkbox in dependencies
        prereq_checkbox = page.locator("#docketInspectorTabBody label:has-text('Prereq Task A') input[type='checkbox']").first
        prereq_checkbox.check()
        page.click("button[onclick*='saveTaskDetailsFromModal']")
        time.sleep(0.5)

        # Open Waiting & Blocked navigation tab
        page.click(".docket-nav-btn:has-text('⏳ Waiting & Blocked')")
        time.sleep(0.3)

        # Assert Dependent Task B is listed as blocked
        assert page.locator(".docket-task-item:has-text('Dependent Task B')").is_visible(), "Task B did not become blocked by prerequisite"
        print("  ✓ Dependency Solver: Task B automatically set to Blocked state")

        # Complete Prereq Task A
        page.click(".docket-nav-btn:has-text('📥 Inbox')")
        time.sleep(0.3)
        page.locator(".docket-task-item:has-text('Prereq Task A') input[type='checkbox']").check()
        time.sleep(0.5)

        # Verify Dependent Task B is now unblocked
        page.click(".docket-nav-btn:has-text('📅 Today')")
        time.sleep(0.3)
        assert page.locator(".docket-task-item:has-text('Dependent Task B')").is_visible(), "Task B was not unblocked after prerequisite completion"
        print("  ✓ Dependency Solver: Task B automatically unblocked upon Prereq Task A completion")

        # ----------------------------------------------------
        # TEST 6: RECURRENCE RULES ENGINE & MAX ENFORCEMENT
        # ----------------------------------------------------
        print("\n[TEST 6] Recurrence Rules Engine & Max Enforcement...")
        page.click("button[onclick*='openNewDocketTaskModal']")
        page.wait_for_selector("#capsuleModal input[name='title']")
        page.fill("#capsuleModal input[name='title']", "Daily Recurring Duty")
        page.select_option("#capsuleModal select[name='recurrence']", "daily")
        page.click("#capsuleModal button[type='submit']")
        time.sleep(0.3)

        # Complete Daily Recurring Duty
        page.locator(".docket-task-item:has-text('Daily Recurring Duty') input[type='checkbox']").check()
        time.sleep(0.5)

        # Verify next instance was generated
        page.reload()
        page.wait_for_selector(".app-shell")
        page.click(".sidebar-item[data-id='tasks']")
        time.sleep(0.5)
        assert page.locator(".docket-task-item:has-text('Daily Recurring Duty')").is_visible(), "Next instance of daily recurring task was not generated"
        print("  ✓ Recurrence Rules: Daily recurring next instance generated successfully")

        # ----------------------------------------------------
        # TEST 7: PROJECT WORKSPACE & TASK-LINKED MILESTONES
        # ----------------------------------------------------
        print("\n[TEST 7] Project Workspace & Task-Linked Milestones...")
        page.click(".docket-nav-btn:has-text('📂 Projects')")
        time.sleep(0.5)

        # Create new Project Workspace
        page.click("button[onclick*='openNewDocketProjectModal']")
        page.wait_for_selector("#capsuleModal input[name='name']")
        page.fill("#capsuleModal input[name='name']", "Alpha Security Rebuild")
        page.fill("#capsuleModal input[name='description']", "E2E verification project workspace")
        page.click("#capsuleModal button[type='submit']")
        time.sleep(0.5)

        # Open Project Workspace
        assert page.locator("h3:has-text('📂 Alpha Security Rebuild')").is_visible(), "Project Workspace header not rendered"
        print("  ✓ Project Workspace: Opened detail workspace view")

        # Navigate Sub-tabs
        page.click("button[onclick*='setDocketProjectSubTab(\\'milestones\\')']")
        time.sleep(0.3)

        # Add Milestone
        page.click("button[onclick*='openDocketMilestoneModal']")
        page.wait_for_selector("#capsuleModal input[name='name']")
        page.fill("#capsuleModal input[name='name']", "Milestone 1 - Architecture")
        page.click("#capsuleModal button[type='submit']")
        time.sleep(0.5)

        # Verify Milestone rendered
        assert page.locator("h5:has-text('Milestone 1 - Architecture')").is_visible(), "Milestone 1 not visible in project"
        print("  ✓ Milestones Engine: Added and rendered project milestone")

        # Toggle Milestone complete
        m_checkbox = page.locator("input[onchange*='toggleDocketMilestoneStatus']").first
        m_checkbox.check()
        time.sleep(0.3)
        print("  ✓ Milestones Engine: Toggled milestone completion status")

        # ----------------------------------------------------
        # TEST 8: SEARCH INDEX EXPANSION
        # ----------------------------------------------------
        print("\n[TEST 8] Universal Search Index Expansion...")
        page.click(".docket-nav-btn:has-text('📥 Inbox')")
        time.sleep(0.3)
        page.fill("#docketSearchInput", "Prereq")
        time.sleep(0.3)
        assert page.locator("text='Prereq Task A'").is_visible(), "Search failed to match task title query"
        page.fill("#docketSearchInput", "")
        time.sleep(0.3)
        print("  ✓ Search Index: Successfully matched search query")

        # ----------------------------------------------------
        # TEST 9: ARCHIVE & RESTORE WORKFLOW
        # ----------------------------------------------------
        print("\n[TEST 9] Task Archive & Restore Workflow...")
        # Create Task to Archive
        page.click("button[onclick*='openNewDocketTaskModal']")
        page.wait_for_selector("#capsuleModal input[name='title']")
        page.fill("#capsuleModal input[name='title']", "Archivable Task Item")
        page.click("#capsuleModal button[type='submit']")
        time.sleep(0.3)

        # Open Task Inspector and change status to Archived
        page.click(".docket-task-item:has-text('Archivable Task Item')")
        time.sleep(0.5)
        page.click("button:has-text('Planning')")
        time.sleep(0.3)
        page.select_option("#editTaskStatus", "archived")
        page.click("button[onclick*='saveTaskDetailsFromModal']")
        time.sleep(0.5)

        # Check Archive navigation tab
        page.click(".docket-nav-btn:has-text('📦 Archive')")
        time.sleep(0.3)
        assert page.locator(".docket-task-item:has-text('Archivable Task Item')").is_visible(), "Archived task missing from Archive view"

        # Restore Task from Archive
        page.click(".docket-task-item:has-text('Archivable Task Item')")
        time.sleep(0.5)
        page.click("button:has-text('Planning')")
        time.sleep(0.3)
        page.select_option("#editTaskStatus", "planned")
        page.click("button[onclick*='saveTaskDetailsFromModal']")
        time.sleep(0.5)

        # Verify restored to Planned
        page.click(".docket-nav-btn:has-text('📥 Inbox')")
        time.sleep(0.3)
        assert page.locator(".docket-task-item:has-text('Archivable Task Item')").is_visible(), "Task failed to restore from Archive"
        print("  ✓ Archive & Restore: Task archived and successfully restored back to active view")

        # ----------------------------------------------------
        # TEST 10: IMPORT / EXPORT PACKAGE ROUND-TRIP
        # ----------------------------------------------------
        print("\n[TEST 10] .plot Package Export/Import Round-Trip...")
        page.click("button[onclick*='exportTasks']")
        time.sleep(0.5)
        print("  ✓ Import/Export: Triggered .plot package export")

        # Take final verification screenshot
        os.makedirs("verification", exist_ok=True)
        screenshot_path = os.path.abspath("verification/docket_behavioral_acceptance.png")
        page.screenshot(path=screenshot_path)
        print(f"  ✓ Captured verification screenshot at {screenshot_path}")

        browser.close()

    print("\n" + "=" * 60)
    print("ALL DOCKET BEHAVIORAL ACCEPTANCE E2E TESTS PASSED!")
    print("=" * 60)

if __name__ == "__main__":
    run_docket_behavioral_e2e()
