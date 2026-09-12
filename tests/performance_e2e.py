import os
import sys
import asyncio
import time
from playwright.async_api import async_playwright

async def run_performance_e2e():
    print("=== STARTING PERFORMANCE_E2E ===")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        file_path = f"file://{os.path.abspath('index.html')}"
        t0 = time.time()
        await page.goto(file_path)
        t_load = time.time() - t0
        print(f"✓ Application bundle load time: {t_load:.3f}s")
        assert t_load < 5.0, "App shell took too long to load!"

        # Benchmark Formula evaluation latency
        await page.evaluate("activateTab('formula')")
        t_calc_0 = time.time()
        for i in range(10):
            await page.fill("#formulaInput", f"{i} * 10 + 5")
            await page.click("#panel-formula button:has-text('Calc')")
        t_calc = time.time() - t_calc_0
        print(f"✓ 10 Formula evaluations completed in {t_calc:.3f}s")

        assert len(console_errors) == 0, f"Console errors found: {console_errors}"
        await browser.close()
        print("=== PERFORMANCE_E2E PASSED ===")

if __name__ == "__main__":
    asyncio.run(run_performance_e2e())
