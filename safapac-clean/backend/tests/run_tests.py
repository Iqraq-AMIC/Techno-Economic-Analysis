"""
Main test runner for HEFA calculation verification.

Usage:
    python backend/tests/run_tests.py                    # Run all scenarios
    python backend/tests/run_tests.py hefa_usa_500kta    # Run specific scenario
    python backend/tests/run_tests.py --list             # List all scenarios
"""

import sys
import argparse
from pathlib import Path

from utils import TestRunner, TestScenario, Colors


def discover_scenarios(scenarios_dir: Path):
    """Discover all test scenarios in the scenarios directory"""
    scenarios = []

    # Find all scenario folders (directories that contain input.json and output.json)
    for scenario_folder in scenarios_dir.iterdir():
        if not scenario_folder.is_dir():
            continue

        # Skip template and hidden folders
        if scenario_folder.name.startswith("_") or scenario_folder.name.startswith("."):
            continue

        input_file = scenario_folder / "input.json"
        output_file = scenario_folder / "output.json"

        if input_file.exists() and output_file.exists():
            scenarios.append(TestScenario(
                name=scenario_folder.name,
                inputs_file=input_file,
                outputs_file=output_file
            ))
        else:
            if not input_file.exists():
                print(f"{Colors.WARNING}Warning: Missing input.json in {scenario_folder.name}/{Colors.ENDC}")
            if not output_file.exists():
                print(f"{Colors.WARNING}Warning: Missing output.json in {scenario_folder.name}/{Colors.ENDC}")

    return scenarios


def list_scenarios(scenarios):
    """List all available test scenarios"""
    print(f"\n{Colors.HEADER}{'='*80}{Colors.ENDC}")
    print(f"{Colors.HEADER}AVAILABLE TEST SCENARIOS{Colors.ENDC}")
    print(f"{Colors.HEADER}{'='*80}{Colors.ENDC}\n")

    for i, scenario in enumerate(scenarios, 1):
        print(f"{i}. {Colors.BOLD}{scenario.name}{Colors.ENDC}")
        print(f"   Location: scenarios/{scenario.name}/")
        print(f"   Files:    input.json, output.json\n")

    print(f"Total scenarios: {len(scenarios)}\n")


def run_scenario(scenario: TestScenario, results_dir: Path):
    """Run a single test scenario"""
    print(f"\n{Colors.OKBLUE}Running scenario: {scenario.name}{Colors.ENDC}")

    runner = TestRunner(scenario)
    results = runner.run()

    # Save results
    result_file = runner.save_results(results_dir)
    print(f"\n{Colors.OKCYAN}Results saved to: {result_file}{Colors.ENDC}")

    # Print results
    runner.print_results()

    return results["status"] == "passed"


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Run HEFA calculation tests")
    parser.add_argument(
        "scenario",
        nargs="?",
        help="Specific scenario to run (optional)"
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List all available scenarios"
    )
    parser.add_argument(
        "--results-dir",
        type=Path,
        default=Path(__file__).parent / "results",
        help="Directory to save test results"
    )

    args = parser.parse_args()

    # Setup paths
    test_dir = Path(__file__).parent
    scenarios_dir = test_dir / "scenarios"
    results_dir = args.results_dir

    # Create results directory if it doesn't exist
    results_dir.mkdir(parents=True, exist_ok=True)

    # Discover scenarios
    scenarios = discover_scenarios(scenarios_dir)

    if not scenarios:
        print(f"{Colors.FAIL}No test scenarios found in {scenarios_dir}{Colors.ENDC}")
        return 1

    # List scenarios if requested
    if args.list:
        list_scenarios(scenarios)
        return 0

    # Filter scenarios if specific one requested
    if args.scenario:
        scenarios = [s for s in scenarios if s.name == args.scenario]
        if not scenarios:
            print(f"{Colors.FAIL}Scenario '{args.scenario}' not found{Colors.ENDC}")
            return 1

    # Run scenarios
    print(f"\n{Colors.BOLD}{Colors.HEADER}{'='*80}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.HEADER}HEFA CALCULATION TEST SUITE{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.HEADER}{'='*80}{Colors.ENDC}")
    print(f"\nRunning {len(scenarios)} scenario(s)...")

    all_passed = True
    results_summary = []

    for scenario in scenarios:
        passed = run_scenario(scenario, results_dir)
        all_passed = all_passed and passed
        results_summary.append((scenario.name, passed))

    # Print final summary
    print(f"\n{Colors.HEADER}{'='*80}{Colors.ENDC}")
    print(f"{Colors.HEADER}FINAL SUMMARY{Colors.ENDC}")
    print(f"{Colors.HEADER}{'='*80}{Colors.ENDC}\n")

    for name, passed in results_summary:
        status = f"{Colors.OKGREEN}PASSED{Colors.ENDC}" if passed else f"{Colors.FAIL}FAILED{Colors.ENDC}"
        print(f"  {name:<50} {status}")

    passed_count = sum(1 for _, passed in results_summary if passed)
    total_count = len(results_summary)

    print(f"\n{Colors.BOLD}Total:{Colors.ENDC} {passed_count}/{total_count} scenarios passed")

    if all_passed:
        print(f"\n{Colors.OKGREEN}{Colors.BOLD}ALL TESTS PASSED!{Colors.ENDC}\n")
        return 0
    else:
        print(f"\n{Colors.FAIL}{Colors.BOLD}SOME TESTS FAILED{Colors.ENDC}\n")
        return 1


if __name__ == "__main__":
    sys.exit(main())
