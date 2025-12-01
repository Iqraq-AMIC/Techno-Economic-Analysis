# Quick Start Guide - HEFA Calculation Tests

## 🚀 Running Tests (3 Easy Steps)

### Step 1: Verify Setup
```bash
python backend/tests/check_setup.py
```
This checks if your database is ready.

### Step 2: List Scenarios
```bash
python backend/tests/run_tests.py --list
```
See all available test scenarios.

### Step 3: Run Tests
```bash
# Run all scenarios
python backend/tests/run_tests.py

# Or run a specific one
python backend/tests/run_tests.py hefa_usa_500kta
```

## 📊 View Results

Results are saved to `backend/tests/results/` with timestamps.

Example: `HEFA_USA_500KTPA_20250601_143022.json`

## ➕ Adding New Test Scenarios

### Method 1: Use Helper Script (Recommended)
```bash
# Create new scenario from template
python backend/tests/create_scenario.py hefa_malaysia_100kta

# Edit the generated input.json
# Edit backend/tests/scenarios/hefa_malaysia_100kta/input.json

# Run the test
python backend/tests/run_tests.py hefa_malaysia_100kta
```

### Method 2: Copy Existing Scenario
```bash
# Copy existing scenario folder
cp -r backend/tests/scenarios/hefa_usa_500kta backend/tests/scenarios/hefa_malaysia_100kta

# Edit the input.json with your parameters
# Edit backend/tests/scenarios/hefa_malaysia_100kta/input.json

# Run the test
python backend/tests/run_tests.py hefa_malaysia_100kta
```

### Method 3: Manual Creation

```bash
# 1. Create scenario folder
mkdir backend/tests/scenarios/my_scenario

# 2. Create input.json and output.json
# (See scenarios/README.md for structure)

# 3. Run the test
python backend/tests/run_tests.py my_scenario
```

See [scenarios/README.md](scenarios/README.md) for detailed file structure.

## 🎯 Common Scenarios to Test

| Scenario | Description |
|----------|-------------|
| `hefa_usa_500kta` | Baseline: 500K tons/year HEFA plant in USA |
| `hefa_malaysia_100kta` | Smaller plant (100K tons/year) |
| `hefa_usa_500kta_high_feedstock` | Sensitivity: High UCO price |
| `hefa_usa_500kta_low_h2` | Sensitivity: Low hydrogen price |
| `hefa_singapore_250kta` | Medium size plant in Singapore |

## 📁 File Structure
```
backend/tests/
├── run_tests.py              ← Main test runner
├── scenarios/                ← Test definitions
│   ├── hefa_usa_500kta/
│   │   ├── input.json
│   │   └── output.json
│   └── {your_scenario}/
│       ├── input.json
│       └── output.json
└── results/                  ← Auto-generated results
    └── {scenario}_{timestamp}.json
```

## 🔍 What Gets Tested?

For each scenario:
- ✅ Total Capital Investment (TCI)
- ✅ Feedstock Consumption
- ✅ Total Direct OPEX
- ✅ Total Indirect OPEX
- ✅ Total OPEX
- ✅ LCOP (Levelized Cost of Production)

## 💡 Tips

- **Always run `check_setup.py` first** to avoid cryptic errors
- **Use descriptive scenario names** like `hefa_country_capacity_variant`
- **Results are timestamped** so you can track changes over time
- **2% tolerance** for most metrics (accounts for rounding)

## 🐛 Troubleshooting

**Problem:** "Reference data not found"
```bash
# Solution: Seed the database
python backend/app/core/seeding.py
```

**Problem:** Test fails with large variance
```bash
# Solution: Check your expected outputs
python backend/tests/calculate_expected_outputs.py
```

**Problem:** Database connection error
```bash
# Solution: Verify database is running
python backend/tests/check_setup.py
```

## 📖 More Info

- Full documentation: [README.md](README.md)
- Creating scenarios: [scenarios/README.md](scenarios/README.md)
- Original spec: `Wave 1 - specs for miniTEA_with HEFA and PTL examples(1).xlsx`
