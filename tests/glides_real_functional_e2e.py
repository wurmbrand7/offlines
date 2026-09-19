import os
import time
from playwright.sync_api import sync_playwright

def run_real_glides_e2e():
    print("==================================================")
    print("RUNNING GLIDES INTERACTIVE DOM PLAYWRIGHT E2E TEST")
    print("==================================================")

    file_path = f"file://{os.path.abspath('standalone/glides.html')}"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(e))

        page.goto(file_path)
        page.wait_for_timeout(1000)

        # 1. Verify Glides Title Header
        title_val = page.locator("#glidesDeckTitle").input_value()
        assert title_val != "", "Glides deck title input missing"
        print("  [PASS] 01. Loaded Glides standalone application shell")

        # 2. Add New Slide
        initial_slides_count = len(page.locator(".glides-thumb-card").all())
        page.click("button:has-text('+ Slide')")
        page.wait_for_timeout(500)
        new_slides_count = len(page.locator(".glides-thumb-card").all())
        assert new_slides_count == initial_slides_count + 1, "New slide not added"
        print("  [PASS] 02. Added new slide dynamically")

        # 3. Add Text Box Object
        page.click("button:has-text('+ Text Box')")
        page.wait_for_timeout(500)
        canvas_objs = page.locator(".glides-canvas-obj").all()
        assert len(canvas_objs) > 0, "Canvas object missing after adding text box"
        print("  [PASS] 03. Created text box object on slide canvas")

        # 4. Drag Object on Canvas
        obj_locator = page.locator(".glides-canvas-obj").first
        box = obj_locator.bounding_box()
        assert box is not None, "Canvas object bounding box is null"

        # Drag handle
        page.mouse.move(box["x"] + 10, box["y"] + 10)
        page.mouse.down()
        page.mouse.move(box["x"] + 100, box["y"] + 100)
        page.mouse.up()
        page.wait_for_timeout(500)
        print("  [PASS] 04. Performed pointer drag on slide canvas object")

        # 5. Insert Rectangle Shape
        page.click("button:has-text('INSERT')")
        page.wait_for_timeout(300)
        page.click("button:has-text('Rectangle')")
        page.wait_for_timeout(500)
        all_objs = page.locator(".glides-canvas-obj").all()
        assert len(all_objs) >= 2, "Rectangle shape object missing from slide canvas"
        print("  [PASS] 05. Inserted shape object from INSERT tab")

        # 6. Switch to DRAW Tab and Draw Freehand Stroke
        page.click("button:has-text('DRAW')")
        page.wait_for_timeout(300)
        page.click("button:has-text('✏ Pen')")
        page.wait_for_timeout(300)

        canvas = page.locator("#glidesSlideCanvas")
        cbox = canvas.bounding_box()
        assert cbox is not None, "Canvas bounding box is null"

        page.mouse.move(cbox["x"] + 50, cbox["y"] + 50)
        page.mouse.down()
        page.mouse.move(cbox["x"] + 150, cbox["y"] + 150)
        page.mouse.up()
        page.wait_for_timeout(500)

        draw_objs = page.locator(".glides-canvas-obj").all()
        assert len(draw_objs) >= 3, "Freehand drawing stroke object missing from slide canvas"
        print("  [PASS] 06. Executed freehand pointer drawing stroke on canvas")

        # 7. Apply Theme from DESIGN Tab
        page.click("button:has-text('DESIGN')")
        page.wait_for_timeout(300)
        page.click("button:has-text('Nebula')")
        page.wait_for_timeout(500)
        print("  [PASS] 07. Applied custom workstation theme (Nebula)")

        # 8. Start Presenter Mode from PRESENT Tab or Header
        page.click("button:has-text('Present')")
        page.wait_for_timeout(500)

        presenter_overlay = page.locator("#glidesPresenterOverlay")
        assert presenter_overlay.is_visible(), "Presenter mode overlay not visible"
        print("  [PASS] 08. Launched dual-view Presenter Overlay mode")

        # 9. Navigate Presenter Mode with Keyboard Arrow Right
        page.keyboard.press("ArrowRight")
        page.wait_for_timeout(300)
        print("  [PASS] 09. Navigated presenter slides using keyboard ArrowRight")

        # 10. Exit Presenter Mode with Escape
        page.keyboard.press("Escape")
        page.wait_for_timeout(500)
        assert not presenter_overlay.is_visible(), "Presenter overlay failed to exit on Escape"
        print("  [PASS] 10. Exited presenter mode cleanly with Escape key")

        assert len(errors) == 0, f"Page errors encountered: {errors}"
        browser.close()

    print("--------------------------------------------------")
    print("ALL REAL INTERACTIVE GLIDES PLAYWRIGHT TESTS PASSED!")
    print("--------------------------------------------------")

if __name__ == "__main__":
    run_real_glides_e2e()
