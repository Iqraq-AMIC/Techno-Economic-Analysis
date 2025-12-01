# Scenario Template

This is a template folder for creating new test scenarios.

## How to Use

1. **Copy this folder:**
   ```bash
   cp -r scenarios/_template scenarios/{your_scenario_name}
   ```

2. **Edit input.json:**
   - Update description
   - Change process_technology, feedstock, country
   - Modify plant capacity and other parameters
   - Adjust product yields, prices, etc.

3. **Generate or edit output.json:**

   **Option A - Calculate:**
   ```bash
   python backend/tests/calculate_expected_outputs.py
   mv backend/tests/hefa_expected_outputs_calculated.json scenarios/{your_scenario_name}/output.json
   ```

   **Option B - Manual:**
   Edit output.json with expected values

4. **Run your test:**
   ```bash
   python backend/tests/run_tests.py {your_scenario_name}
   ```

## Files

- `input.json` - Test input parameters
- `output.json` - Expected calculation results
- `README.md` - This file

## Tips

- Use descriptive names: `{process}_{country}_{capacity}_{variant}`
- Examples: `hefa_malaysia_100kta`, `ptl_usa_200kta_low_h2`
- Keep units consistent across all scenarios
- Document special assumptions in the input description field
