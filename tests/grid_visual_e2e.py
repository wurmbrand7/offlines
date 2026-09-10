import sys
import time
import os
import subprocess
from playwright.sync_api import sync_playwright

def capture_visual_screenshots():
    print("=== STARTING VISUAL SCREENSHOT CAPTURE ===")
    os.makedirs("/tmp/screenshots", exist_ok=True)
    port = 8891
    server = subprocess.Popen(["python3", "-m", "http.server", str(port)])
    time.sleep(1.5)

    viewports = [
        {"width": 1440, "height": 900, "name": "desktop_1440x900"},
        {"width": 1280, "height": 800, "name": "desktop_1280x800"},
        {"width": 1024, "height": 768, "name": "tablet_landscape_1024x768"},
        {"width": 768, "height": 1024, "name": "tablet_portrait_768x1024"},
        {"width": 600, "height": 900, "name": "mobile_large_600x900"},
        {"width": 390, "height": 844, "name": "mobile_small_390x844"},
    ]

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)

            for vp in viewports:
                page = browser.new_page(viewport={"width": vp["width"], "height": vp["height"]})
                url = f"http://localhost:{port}/index.html"
                page.goto(url)
                page.wait_for_timeout(1000)

                # Screenshot 1: Dashboard
                dash_path = f"/tmp/screenshots/dashboard_{vp['name']}.png"
                page.screenshot(path=dash_path, full_page=True)
                print(f"Captured Dashboard screenshot: {dash_path}")

                # Switch to Grid
                page.click(".sidebar-item[data-id='sheets']")
                page.wait_for_timeout(500)

                # Fill some data and generate chart for visual presentation
                page.focus("#cell-A1")
                page.fill("#cell-A1", "Sales")
                page.keyboard.press("Enter")
                page.focus("#cell-B1")
                page.fill("#cell-B1", "1250")
                page.keyboard.press("Enter")
                page.focus("#cell-A2")
                page.fill("#cell-A2", "Services")
                page.keyboard.press("Enter")
                page.focus("#cell-B2")
                page.fill("#cell-B2", "850")
                page.keyboard.press("Enter")

                page.click("button:has-text('insert')")
                page.wait_for_timeout(200)
                page.click("button:has-text('Bar Chart')")
                page.wait_for_timeout(300)

                grid_path = f"/tmp/screenshots/grid_{vp['name']}.png"
                page.screenshot(path=grid_path, full_page=True)
                print(f"Captured Grid screenshot: {grid_path}")

                page.close()

            browser.close()
            print("=== VISUAL SCREENSHOT CAPTURE COMPLETED ===")
    finally:
        server.terminate()

if __name__ == "__main__":
    capture_visual_screenshots()
