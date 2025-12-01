"""
Helper script to create new test scenarios from template.

Usage:
    python backend/tests/create_scenario.py {scenario_name}
"""

import sys
import shutil
from pathlib import Path

def create_scenario(scenario_name: str):
    """Create a new test scenario from template"""

    test_dir = Path(__file__).parent
    template_dir = test_dir / "scenarios" / "_template"
    new_scenario_dir = test_dir / "scenarios" / scenario_name

    # Check if template exists
    if not template_dir.exists():
        print(f"Error: Template directory not found at {template_dir}")
        return 1

    # Check if scenario already exists
    if new_scenario_dir.exists():
        print(f"Error: Scenario '{scenario_name}' already exists")
        print(f"Location: {new_scenario_dir}")
        return 1

    # Copy template
    print(f"Creating new scenario: {scenario_name}")
    print(f"Copying template from: {template_dir}")
    print(f"Creating at: {new_scenario_dir}")

    shutil.copytree(template_dir, new_scenario_dir)

    print(f"\nScenario '{scenario_name}' created successfully!")
    print("\nNext steps:")
    print(f"1. Edit scenarios/{scenario_name}/input.json with your parameters")
    print(f"2. Generate outputs:")
    print(f"   python backend/tests/calculate_expected_outputs.py")
    print(f"3. Run test:")
    print(f"   python backend/tests/run_tests.py {scenario_name}")

    return 0

def main():
    if len(sys.argv) < 2:
        print("Usage: python backend/tests/create_scenario.py {scenario_name}")
        print("\nExample:")
        print("  python backend/tests/create_scenario.py hefa_malaysia_100kta")
        return 1

    scenario_name = sys.argv[1]

    # Validate scenario name
    if not scenario_name.replace("_", "").replace("-", "").isalnum():
        print("Error: Scenario name should only contain letters, numbers, underscores, and hyphens")
        return 1

    return create_scenario(scenario_name)

if __name__ == "__main__":
    sys.exit(main())
