import os
import sys
import asyncio
from playwright.async_api import async_playwright

async def run_security_e2e():
    print("=== STARTING SECURITY_E2E ===")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        file_path = f"file://{os.path.abspath('index.html')}"
        await page.goto(file_path)

        # Verify Privacy Center & Security Center metrics
        await page.evaluate("activateTab('privacy')")
        priv_text = await page.text_content("#panel-privacy")
        assert "0 bytes" in priv_text, "Privacy Center metrics failed!"
        print("✓ Privacy Center verified: 0 bytes transmitted.")

        await page.evaluate("activateTab('security')")
        sec_text = await page.text_content("#panel-security")
        assert "Password Health" in sec_text or "Protected" in sec_text or "Active" in sec_text, "Security Center metrics failed!"
        print("✓ Security Center dashboard metrics verified.")

        assert len(console_errors) == 0, f"Console errors found: {console_errors}"
        await browser.close()
        print("=== SECURITY_E2E PASSED ===")

if __name__ == "__main__":
    asyncio.run(run_security_e2e())
