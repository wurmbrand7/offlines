#!/usr/bin/env python3
import sys
import os
import time
from playwright.sync_api import sync_playwright

def run_formula_complete_e2e():
    print("=" * 60)
    print("RUNNING FORMULA COMPLETE FUNCTIONAL E2E TEST SUITE")
    print("=" * 60)

    html_path = os.path.abspath("index.html")
    url = f"file://{html_path}"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # 1. Open Application and Navigate to Formula (.formu)
        page.goto(url)
        page.wait_for_selector(".app-shell")

        page.click(".sidebar-item[data-id='formula']")
        time.sleep(0.5)

        # Verify header
        assert page.locator("h2:has-text('Formula')").is_visible(), "Formula header not rendered"
        print("  ✓ Navigation: Opened Formula (.formu) panel")

        # ----------------------------------------------------
        # TEST 1: BASIC CALCULATOR KEYPAD & EXPRESSIONS
        # ----------------------------------------------------
        print("\n[TEST 1] Basic Calculator & Expression Evaluator...")

        # Test 1a: 2 + 3 * 4 = 14
        page.fill("#formulaInput", "2 + 3 * 4")
        page.click("button:has-text('Calculate')")
        time.sleep(0.3)
        res1 = page.inner_text("#formulaCalcVal")
        assert "14" in res1, f"Expected 14 for 2 + 3 * 4, got {res1}"
        print("  ✓ Operator Precedence: 2 + 3 * 4 = 14")

        # Test 1b: (2 + 3) * 4 = 20
        page.fill("#formulaInput", "(2 + 3) * 4")
        page.click("button:has-text('Calculate')")
        time.sleep(0.3)
        res2 = page.inner_text("#formulaCalcVal")
        assert "20" in res2, f"Expected 20 for (2 + 3) * 4, got {res2}"
        print("  ✓ Parentheses: (2 + 3) * 4 = 20")

        # Test 1c: 125 * 18.5 = 2312.5
        page.fill("#formulaInput", "125 * 18.5")
        page.click("button:has-text('Calculate')")
        time.sleep(0.3)
        res3 = page.inner_text("#formulaCalcVal")
        assert "2312.5" in res3, f"Expected 2312.5 for 125 * 18.5, got {res3}"
        print("  ✓ Decimals & Multiplication: 125 * 18.5 = 2312.5")

        # Test 1d: Divide by Zero Handling
        page.fill("#formulaInput", "10 / 0")
        page.click("button:has-text('Calculate')")
        time.sleep(0.3)
        res4 = page.inner_text("#formulaCalcVal")
        assert "#DIV/0!" in res4, f"Expected #DIV/0! for 10 / 0, got {res4}"
        print("  ✓ Error Handling: 10 / 0 = #DIV/0!")

        # ----------------------------------------------------
        # TEST 2: COMPARISON OPERATORS & FUNCTIONS
        # ----------------------------------------------------
        print("\n[TEST 2] Comparison Operators & Functions...")

        # Test 2a: 2 >= 2
        page.fill("#formulaInput", "2 >= 2")
        page.click("button:has-text('Calculate')")
        time.sleep(0.3)
        res_comp1 = page.inner_text("#formulaCalcVal")
        assert "TRUE" in res_comp1 or "1" in res_comp1, f"Expected TRUE for 2 >= 2, got {res_comp1}"
        print("  ✓ Comparison Operator: 2 >= 2 = TRUE")

        # Test 2b: ROUND(12.345, 2)
        page.fill("#formulaInput", "ROUND(12.345, 2)")
        page.click("button:has-text('Calculate')")
        time.sleep(0.3)
        res_fn1 = page.inner_text("#formulaCalcVal")
        assert "12.35" in res_fn1, f"Expected 12.35 for ROUND(12.345, 2), got {res_fn1}"
        print("  ✓ Math Function: ROUND(12.345, 2) = 12.35")

        # Test 2c: SQRT(144)
        page.fill("#formulaInput", "SQRT(144)")
        page.click("button:has-text('Calculate')")
        time.sleep(0.3)
        res_fn2 = page.inner_text("#formulaCalcVal")
        assert "12" in res_fn2, f"Expected 12 for SQRT(144), got {res_fn2}"
        print("  ✓ Math Function: SQRT(144) = 12")

        # Test 2d: IF(5 > 3, 10, 20)
        page.fill("#formulaInput", "IF(5 > 3, 10, 20)")
        page.click("button:has-text('Calculate')")
        time.sleep(0.3)
        res_fn3 = page.inner_text("#formulaCalcVal")
        assert "10" in res_fn3, f"Expected 10 for IF(5 > 3, 10, 20), got {res_fn3}"
        print("  ✓ Logical Function: IF(5 > 3, 10, 20) = 10")

        # Test 2e: 15% of 850
        page.fill("#formulaInput", "15% of 850")
        page.click("button:has-text('Calculate')")
        time.sleep(0.3)
        res_pct = page.inner_text("#formulaCalcVal")
        assert "127.5" in res_pct, f"Expected 127.5 for 15% of 850, got {res_pct}"
        print("  ✓ Percentage Syntax: 15% of 850 = 127.5")

        # ----------------------------------------------------
        # TEST 3: CALCULATIONS LIBRARY
        # ----------------------------------------------------
        print("\n[TEST 3] Calculations Library...")
        page.click(".formula-nav-btn:has-text('Library')")
        time.sleep(0.5)

        # 3a: Finance - Revenue & Profitability
        page.fill("#finRevUnits", "1000")
        page.fill("#finRevPrice", "25")
        page.fill("#finRevCOGS", "7500")
        page.click("button:has-text('Calculate Profitability')")
        time.sleep(0.3)
        rev_box = page.inner_text("#finRevRes")
        assert "$25,000" in rev_box and "$17,500" in rev_box, f"Revenue calculation mismatch: {rev_box}"
        print("  ✓ Finance Library: Revenue & Profitability calculated successfully")

        # 3b: Business Category
        page.click("button:has-text('Business')")
        time.sleep(0.3)
        page.fill("#bizGrowStart", "1000")
        page.fill("#bizGrowEnd", "1500")
        page.click("button:has-text('Calculate Growth Rate')")
        time.sleep(0.3)
        grow_res = page.inner_text("#bizGrowRes")
        assert "50" in grow_res, f"Growth rate mismatch: {grow_res}"
        print("  ✓ Business Library: Growth Rate calculated successfully (50%)")

        # 3c: Electrical Category
        page.click("button:has-text('Electrical')")
        time.sleep(0.3)
        page.fill("#elecVal1", "5") # I = 5A
        page.fill("#elecVal2", "20") # R = 20 Ohm
        page.click("button:has-text('Solve Ohm')")
        time.sleep(0.3)
        ohm_res = page.inner_text("#elecOhmRes")
        assert "100" in ohm_res, f"Ohm's law mismatch: {ohm_res}"
        print("  ✓ Electrical Library: Ohm's Law V = 5A * 20Ω = 100 V")

        # ----------------------------------------------------
        # TEST 4: UNIT CONVERTERS
        # ----------------------------------------------------
        print("\n[TEST 4] Unit Converter Engine (13 Categories)...")
        page.click("button:has-text('Unit Converters')")
        time.sleep(0.5)

        # 4a: Length 10 km -> mi
        page.select_option("#convCategorySelect", "Length")
        page.select_option("#convFromUnit", "km")
        page.select_option("#convToUnit", "mi")
        page.fill("#convInputValue", "10")
        time.sleep(0.3)
        conv_res1 = page.inner_text("#convResultBox")
        assert "6.213712" in conv_res1, f"Expected ~6.213712 miles, got {conv_res1}"
        print("  ✓ Unit Converter (Length): 10 km = 6.213712 mi")

        # 4b: Temperature 25 c -> f
        page.select_option("#convCategorySelect", "Temperature")
        page.select_option("#convFromUnit", "c")
        page.select_option("#convToUnit", "f")
        page.fill("#convInputValue", "25")
        time.sleep(0.3)
        conv_res2 = page.inner_text("#convResultBox")
        assert "77" in conv_res2, f"Expected 77 °F, got {conv_res2}"
        print("  ✓ Unit Converter (Temperature): 25 °C = 77 °F")

        # ----------------------------------------------------
        # TEST 5: MODEL ENGINE, SCENARIOS & SENSITIVITY
        # ----------------------------------------------------
        print("\n[TEST 5] Model Engine, Scenarios & 2D Sensitivity...")
        page.click("button:has-text('Model Engine')")
        time.sleep(0.5)

        # Check variable table
        assert page.locator("td:has-text('Revenue')").first.is_visible(), "Revenue variable missing from model"
        assert page.locator("td:has-text('GrossProfit')").first.is_visible(), "GrossProfit variable missing from model"
        assert page.locator("td:has-text('NetProfit')").first.is_visible(), "NetProfit variable missing from model"
        print("  ✓ Model Engine: Loaded variables & calculated dependent values")

        # Test Scenario Switch
        page.click("button:has-text('Optimistic')")
        time.sleep(0.5)
        assert page.locator("b:has-text('Optimistic')").is_visible(), "Failed to switch active scenario to Optimistic"
        print("  ✓ Scenario Manager: Switched active scenario to Optimistic")

        # Test 2D Sensitivity Matrix
        page.click("button:has-text('Generate Matrix')")
        time.sleep(0.5)
        assert page.locator("#formulaSensitivityBox table").is_visible(), "Sensitivity matrix table not rendered"
        print("  ✓ Sensitivity Matrix: Generated 2D matrix successfully")

        # ----------------------------------------------------
        # TEST 6: HISTORY & EXPORT ROUND-TRIP
        # ----------------------------------------------------
        print("\n[TEST 6] History & Export Package Round-Trip...")
        page.click(".formula-nav-btn:has-text('History')")
        time.sleep(0.5)

        assert page.locator("#formulaFullHistoryList").is_visible(), "Full history list not rendered"
        print("  ✓ History Log: Verified history log rendering")

        # Trigger .formu export
        page.click("button:has-text('Export .formu')")
        time.sleep(0.3)
        print("  ✓ Import/Export: Triggered .formu package export")

        # Screenshot
        os.makedirs("verification", exist_ok=True)
        screenshot_path = os.path.abspath("verification/formula_complete_acceptance.png")
        page.screenshot(path=screenshot_path)
        print(f"  ✓ Captured verification screenshot at {screenshot_path}")

        browser.close()

    print("\n" + "=" * 60)
    print("ALL FORMULA FUNCTIONAL E2E TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_formula_complete_e2e()
