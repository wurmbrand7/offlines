import os
import sys
import asyncio
from playwright.async_api import async_playwright

STANDALONE_FILES = [
    ('almanac.html', 'Almanac — Time Planner'),
    ('docket.html', 'Docket — Action Planning'),
    ('doxera.html', 'Doxera — Structured Documents'),
    ('fill.html', 'Fill — Private Forms'),
    ('folio.html', 'Folio — Document Studio'),
    ('formula.html', 'Formula — Math & Unit Engine'),
    ('glides.html', 'Glides — Presentation Studio'),
    ('grid.html', 'Grid — Data Studio'),
    ('lockbox.html', 'Lockbox — Secure Vault'),
    ('spot.html', 'Spot — Capture Board'),
    ('transmute.html', 'Transmute — Crypto & Format Transformer')
]

async def run_standalone_e2e():
    print("=== STARTING STANDALONE_ALL_11_E2E ===")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        for st_file, expected_title in STANDALONE_FILES:
            st_path = f"file://{os.path.abspath(os.path.join('standalone', st_file))}"
            await page.goto(st_path)
            await page.wait_for_timeout(200)

            # Strict non-iframe & non-redirect audit
            iframe_count = await page.locator("iframe").count()
            assert iframe_count == 0, f"FAIL: {st_file} contains an iframe wrapper!"

            assert "standalone/" in page.url, f"FAIL: {st_file} redirected top-level location!"

            title = await page.title()
            assert expected_title in title, f"FAIL: {st_file} title mismatch '{title}'"
            print(f"✓ Standalone {st_file} loaded natively (0 iframes, 0 redirects). Title: '{title}'")

        assert len(console_errors) == 0, f"Console errors found: {console_errors}"
        await browser.close()
        print("=== STANDALONE_ALL_11_E2E PASSED ===")

if __name__ == "__main__":
    asyncio.run(run_standalone_e2e())
