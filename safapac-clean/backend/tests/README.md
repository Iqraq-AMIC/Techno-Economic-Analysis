# HEFA Calculation Test Suite

Automated test framework for verifying HEFA (Hydrotreated Esters and Fatty Acids) calculation accuracy against reference specifications.

## Directory Structure

```
backend/tests/
├── README.md                          # This file
├── run_tests.py                       # Main test runner
├── check_setup.py                     # Pre-flight verification script
├── calculate_expected_outputs.py      # Utility to calculate expected outputs
├── scenarios/                         # Test scenario definitions
│   ├── README.md                      # Guide for creating scenarios
│   ├── hefa_usa_500kta/              # Example scenario folder
│   │   ├── input.json                # Input parameters
│   │   └── output.json               # Expected outputs
│   └── {your_scenario}/              # Your test scenario
│       ├── input.json
│       └── output.json
├── results/                           # Test results (timestamped JSON files)
│   └── {scenario}_{timestamp}.json   # Individual test results
└── utils/                             # Test utilities
    ├── __init__.py
    ├── test_runner.py                 # Test execution engine
    └── test_colors.py                 # Console color formatting
```

## Quick Start

### 1. Prerequisites

Ensure your PostgreSQL database is running and seeded with reference data:

```bash
# Check if everything is set up correctly
python backend/tests/check_setup.py
```

### 2. Run All Tests

```bash
python backend/tests/run_tests.py
```

### 3. Run Specific Scenario

```bash
python backend/tests/run_tests.py hefa_usa_500kta
```

### 4. List Available Scenarios

```bash
python backend/tests/run_tests.py --list
```

## Test Results

Test results are automatically saved to the `results/` directory with timestamps:

```
results/
└── HEFA_USA_500KTPA_20250601_143022.json
```

Each result file contains:
- Test status (passed/failed/error)
- Detailed comparison of calculated vs expected values
- All calculation results (TCI, OPEX, LCOP, etc.)
- Timestamp and scenario metadata

### Result File Structure

```json
{
  "scenario_name": "hefa_usa_500kta",
  "timestamp": "2025-06-01T14:30:22.123456",
  "status": "passed",
  "tests": [
    {
      "test_name": "Total Capital Investment (TCI)",
      "expected": 400.0,
      "actual": 400.0,
      "unit": "MUSD",
      "difference_pct": 0.0,
      "tolerance_pct": 1.0,
      "passed": true
    }
  ],
  "calculation_results": {
    "tci": 400.0,
    "feedstock_consumption": 605000.0,
    "production": 500000.0,
    "total_direct_opex": 679350000.0,
    "total_indirect_opex": 30800000.0,
    "total_opex": 710150000.0,
    "lcop": 1495.81,
    "revenue": 1177500000.0
  },
  "summary": {
    "total_tests": 6,
    "passed": 6,
    "failed": 0
  }
}
```

## Creating New Test Scenarios

See [scenarios/README.md](scenarios/README.md) for detailed instructions on creating new test scenarios.

### Quick Example

1. **Create scenario folder:**
   ```bash
   mkdir backend/tests/scenarios/hefa_malaysia_100kta
   ```

2. **Create input.json and output.json files in that folder**

3. **Run the test:**
   ```bash
   python backend/tests/run_tests.py hefa_malaysia_100kta
   ```

## Understanding Test Output

### Console Output

The test runner provides color-coded output:

```
================================================================================
TEST RESULTS: hefa_usa_500kta
================================================================================

Status: PASSED
Tests Passed: 6/6
Timestamp: 2025-06-01T14:30:22.123456

Test Results:
Metric                                   Expected           Actual             Diff %     Status
----------------------------------------------------------------------------------------------------
Total Capital Investment (TCI)           $400.00M           $400.00M           0.00%      PASS
Feedstock Consumption                    605,000            605,000            0.00%      PASS
Total Direct OPEX                        $679,350,000       $679,350,000       0.00%      PASS
Total Indirect OPEX                      $30,800,000        $30,800,000        0.00%      PASS
Total OPEX                               $710,150,000       $710,150,000       0.00%      PASS
LCOP                                     $1,495.81          $1,495.81          0.00%      PASS

Calculated Values:
  TCI:                $400.00M
  Feedstock Consumed: 605,000 tons/year
  Production:         500,000 tons/year
  Direct OPEX:        $679,350,000/year
  Indirect OPEX:      $30,800,000/year
  Total OPEX:         $710,150,000/year
  Revenue:            $1,177,500,000/year
  LCOP:               $1,495.81/ton
```

### Status Indicators

- **✓ PASS** (Green) - Test passed within tolerance
- **✗ FAIL** (Red) - Test failed, difference exceeds tolerance
- **ERROR** (Red) - Test encountered an error during execution

## Test Tolerances

Different metrics have different tolerance levels to account for rounding and calculation differences:

| Metric | Tolerance |
|--------|-----------|
| TCI | 1% |
| Feedstock Consumption | 1% |
| Direct/Indirect OPEX | 2% |
| Total OPEX | 2% |
| LCOP | 2% |

## Troubleshooting

### Database Connection Fails

```bash
# Check database is running
python backend/tests/check_setup.py

# Verify connection settings in backend/app/core/config.py
```

### Reference Data Not Found

```bash
# Ensure HEFA, UCO, USA are in the database
python backend/app/core/seeding.py
```

### Test Fails with Large Variance

1. Check that the database reference data matches the expected inputs
2. Verify unit conversions (KTPA, MUSD, $/MWh, etc.)
3. Review the calculation logic in `backend/app/services/feature_calculations.py`
4. Check the detailed results to identify which layer is causing discrepancies

### Creating Expected Outputs

Use the calculation script to generate mathematically correct expected outputs:

```bash
python backend/tests/calculate_expected_outputs.py
```

This will show you:
- Step-by-step calculations
- Comparison with any existing expected outputs
- Identification of calculation errors

## CI/CD Integration

You can integrate this test suite into your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Run HEFA Calculation Tests
  run: |
    python backend/tests/check_setup.py
    python backend/tests/run_tests.py
```

The test runner returns:
- Exit code 0: All tests passed
- Exit code 1: Some tests failed or error occurred

## Advanced Usage

### Running with Custom Results Directory

```bash
python backend/tests/run_tests.py --results-dir /path/to/custom/results
```

### Programmatic Usage

```python
from utils import TestRunner, TestScenario
from pathlib import Path

# Create scenario
scenario = TestScenario(
    name="my_test",
    inputs_file=Path("scenarios/my_test_inputs.json"),
    outputs_file=Path("scenarios/my_test_outputs.json")
)

# Run test
runner = TestRunner(scenario)
results = runner.run()

# Save results
runner.save_results(Path("results"))

# Print to console
runner.print_results()
```

## Related Files

- **Calculation Logic:** `backend/app/services/feature_calculations.py`
- **Database Models:** `backend/app/models/biofuel_model.py`
- **CRUD Operations:** `backend/app/crud/biofuel_crud.py`
- **Original Specification:** `Wave 1 - specs for miniTEA_with HEFA and PTL examples(1).xlsx`

## Contributing

When adding new test scenarios:

1. Follow the naming convention in `scenarios/README.md`
2. Verify calculations manually for at least one data point
3. Document any assumptions or special cases
4. Run the test to ensure it passes before committing
5. Include both input and output files

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review existing test scenarios for examples
3. Verify database seeding is complete
4. Check calculation logic in the backend services
