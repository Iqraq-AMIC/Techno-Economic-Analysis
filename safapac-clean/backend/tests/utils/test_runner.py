"""
Test runner utility for executing calculation tests and generating results.
"""

import json
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional

# Add backend to path (we're already in backend/tests/utils)
backend_path = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_path))

from app.core.database import SessionLocal
from app.crud.biofuel_crud import BiofuelCRUD
from app.services.feature_calculations import Layer1, Layer2, Layer3, Layer4

from .test_colors import Colors


class TestScenario:
    """Represents a single test scenario"""

    def __init__(self, name: str, inputs_file: Path, outputs_file: Path):
        self.name = name
        self.inputs_file = inputs_file
        self.outputs_file = outputs_file
        self.inputs = None
        self.expected_outputs = None

    def load(self):
        """Load input and output files"""
        with open(self.inputs_file, 'r') as f:
            self.inputs = json.load(f)
        with open(self.outputs_file, 'r') as f:
            self.expected_outputs = json.load(f)

    def get_identifier(self):
        """Get unique identifier for this scenario"""
        return f"{self.inputs['process_technology']}_{self.inputs['country']}_{self.inputs['conversion_plant']['plant_capacity']['value']}KTPA"


class TestRunner:
    """Runs calculation tests and generates results"""

    def __init__(self, scenario: TestScenario):
        self.scenario = scenario
        self.db = None
        self.crud = None
        self.results = {
            "scenario_name": scenario.name,
            "timestamp": datetime.now().isoformat(),
            "status": "pending",
            "tests": [],
            "calculation_results": {},
            "summary": {}
        }

    def setup(self):
        """Setup database connection"""
        try:
            self.db = SessionLocal()
            self.crud = BiofuelCRUD(self.db)
            return True
        except Exception as e:
            self.results["status"] = "error"
            self.results["error"] = f"Database setup failed: {str(e)}"
            return False

    def teardown(self):
        """Cleanup database connection"""
        if self.db:
            self.db.close()

    def get_reference_data(self):
        """Retrieve reference data from database"""
        try:
            process_tech = self.scenario.inputs["process_technology"]
            feedstock = self.scenario.inputs["feedstock"]
            country = self.scenario.inputs["country"]

            ref_data = self.crud.get_project_reference_data(process_tech, feedstock, country)

            if not ref_data:
                raise ValueError(f"Reference data not found for {process_tech}-{feedstock}-{country}")

            return ref_data
        except Exception as e:
            raise ValueError(f"Failed to retrieve reference data: {str(e)}")

    def build_calculation_inputs(self, ref_data):
        """Build calculation inputs from test scenario"""
        inputs = self.scenario.inputs

        # Fix ref_data structure: convert mass_fractions list to dict
        if isinstance(ref_data.get("mass_fractions"), list):
            mass_fractions_dict = {}
            products_ref = ref_data.get("products", [])
            mass_fractions_list = ref_data.get("mass_fractions", [])

            for i, product in enumerate(products_ref):
                if i < len(mass_fractions_list):
                    product_name = product.get("name", f"Product_{i}")
                    mass_fractions_dict[product_name] = mass_fractions_list[i] * 100

            ref_data["mass_fractions"] = mass_fractions_dict

        # Get feedstock data from ref_data
        feedstock_carbon_content = ref_data.get("feedstock_carbon_content", 0.75)
        feedstock_ci = ref_data.get("feedstock_ci", 20.0)

        # Build products list
        products = []
        for p in inputs["products"]:
            products.append({
                "name": p["name"],
                "mass_fraction": p["yield"]["value"],
                "product_yield": p["yield"]["value"],
                "product_energy_content": p["energy_content"],
                "product_carbon_content": p["carbon_content"],
                "product_price": p["price"]["value"],
                "product_price_sensitivity_ci": 0.0
            })

        calc_inputs = {
            "plant_total_liquid_fuel_capacity": inputs["conversion_plant"]["plant_capacity"]["value"],
            "feedstock_carbon_intensity": feedstock_ci,
            "feedstock_carbon_content": feedstock_carbon_content,
            "feedstock_price": inputs["feedstock_data"]["price"]["value"],
            "feedstock_yield": inputs["feedstock_data"]["yield"]["value"],
            "hydrogen_price": inputs["utilities"][0]["price"]["value"],
            "hydrogen_yield": inputs["utilities"][0]["yield"]["value"],
            "electricity_rate": inputs["utilities"][1]["price"]["value"] / 1000,
            "electricity_yield": inputs["utilities"][1]["yield"]["value"],
            "process_type": inputs["process_technology"],
            "indirect_opex_tci_ratio": inputs["economic_parameters"]["indirect_opex_tci_ratio"],
            "products": products
        }

        return calc_inputs

    def run_calculations(self, ref_data, calc_inputs):
        """Run all calculation layers"""
        inputs = self.scenario.inputs

        # Initialize layers
        layer1 = Layer1()
        layer2 = Layer2()
        layer3 = Layer3()
        layer4 = Layer4()

        # Run calculations
        layer1_results = layer1.compute(ref_data, calc_inputs)
        layer2_results = layer2.compute(layer1_results, ref_data, calc_inputs)
        layer3_results = layer3.compute([layer2_results])

        discount_rate = inputs["economic_parameters"]["discount_rate"]
        plant_lifetime = inputs["economic_parameters"]["plant_lifetime"]
        layer4_results = layer4.compute(layer2_results, layer3_results, layer1_results, discount_rate, plant_lifetime)

        return {
            "layer1": layer1_results,
            "layer2": layer2_results,
            "layer3": layer3_results,
            "layer4": layer4_results
        }

    def compare_results(self, calc_results):
        """Compare calculated results with expected outputs"""
        expected = self.scenario.expected_outputs

        tests = [
            {
                "name": "Total Capital Investment (TCI)",
                "actual": calc_results["layer1"]["total_capital_investment"],
                "expected": expected["economic_outputs"]["total_capital_investment"]["value"],
                "unit": "MUSD",
                "tolerance": 0.01
            },
            {
                "name": "Feedstock Consumption",
                "actual": calc_results["layer1"]["feedstock_consumption"],
                "expected": expected["process_outputs"]["feedstock_consumption"][self.scenario.inputs["feedstock"]]["value"],
                "unit": "tons/year",
                "tolerance": 0.01
            },
            {
                "name": "Total Direct OPEX",
                "actual": calc_results["layer3"]["total_direct_opex"],
                "expected": expected["economic_outputs"]["total_direct_opex"]["value"],
                "unit": "USD/year",
                "tolerance": 0.02
            },
            {
                "name": "Total Indirect OPEX",
                "actual": calc_results["layer2"]["total_indirect_opex"],
                "expected": expected["economic_outputs"]["total_indirect_opex"]["value"],
                "unit": "USD/year",
                "tolerance": 0.02
            },
            {
                "name": "Total OPEX",
                "actual": calc_results["layer4"]["total_opex"],
                "expected": expected["economic_outputs"]["total_opex"]["value"],
                "unit": "USD/year",
                "tolerance": 0.02
            },
            {
                "name": "LCOP",
                "actual": calc_results["layer4"]["lcop"],
                "expected": expected["economic_outputs"]["lcop"]["value"],
                "unit": "USD/ton",
                "tolerance": 0.02
            }
        ]

        comparison_results = []
        passed_count = 0

        for test in tests:
            actual = test["actual"]
            expected_val = test["expected"]
            tolerance = test["tolerance"]

            if expected_val != 0:
                diff_pct = abs((actual - expected_val) / expected_val)
                passed = diff_pct <= tolerance
            else:
                passed = abs(actual - expected_val) < 1e-6
                diff_pct = 0

            if passed:
                passed_count += 1

            comparison_results.append({
                "test_name": test["name"],
                "expected": expected_val,
                "actual": actual,
                "unit": test["unit"],
                "difference_pct": diff_pct * 100,
                "tolerance_pct": tolerance * 100,
                "passed": passed
            })

        return comparison_results, passed_count == len(tests)

    def run(self):
        """Execute the test scenario"""
        try:
            # Setup
            if not self.setup():
                return self.results

            # Load scenario
            self.scenario.load()

            # Get reference data
            ref_data = self.get_reference_data()

            # Build inputs
            calc_inputs = self.build_calculation_inputs(ref_data)

            # Run calculations
            calc_results = self.run_calculations(ref_data, calc_inputs)

            # Store calculation results
            self.results["calculation_results"] = {
                "tci": calc_results["layer1"]["total_capital_investment"],
                "feedstock_consumption": calc_results["layer1"]["feedstock_consumption"],
                "production": calc_results["layer1"]["production"],
                "total_direct_opex": calc_results["layer3"]["total_direct_opex"],
                "total_indirect_opex": calc_results["layer2"]["total_indirect_opex"],
                "total_opex": calc_results["layer4"]["total_opex"],
                "lcop": calc_results["layer4"]["lcop"],
                "revenue": calc_results["layer2"]["revenue"]
            }

            # Compare results
            test_results, all_passed = self.compare_results(calc_results)
            self.results["tests"] = test_results

            # Update status
            self.results["status"] = "passed" if all_passed else "failed"
            self.results["summary"] = {
                "total_tests": len(test_results),
                "passed": sum(1 for t in test_results if t["passed"]),
                "failed": sum(1 for t in test_results if not t["passed"])
            }

        except Exception as e:
            self.results["status"] = "error"
            self.results["error"] = str(e)
            import traceback
            self.results["traceback"] = traceback.format_exc()

        finally:
            self.teardown()

        return self.results

    def save_results(self, output_dir: Path):
        """Save test results to JSON file"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{self.scenario.get_identifier()}_{timestamp}.json"
        output_file = output_dir / filename

        with open(output_file, 'w') as f:
            json.dump(self.results, f, indent=2)

        return output_file

    def print_results(self):
        """Print formatted test results to console"""
        print(f"\n{Colors.HEADER}{'='*80}{Colors.ENDC}")
        print(f"{Colors.HEADER}TEST RESULTS: {self.scenario.name}{Colors.ENDC}")
        print(f"{Colors.HEADER}{'='*80}{Colors.ENDC}")

        if self.results["status"] == "error":
            error_msg = self.results.get('error', 'Unknown error')
            # Handle potential unicode in error message
            try:
                print(f"\n{Colors.FAIL}ERROR: {error_msg}{Colors.ENDC}")
            except UnicodeEncodeError:
                # Fallback to ASCII-safe output
                safe_error = error_msg.encode('ascii', 'replace').decode('ascii')
                print(f"\n{Colors.FAIL}ERROR: {safe_error}{Colors.ENDC}")

            if "traceback" in self.results:
                try:
                    print(f"\n{self.results['traceback']}")
                except UnicodeEncodeError:
                    # Fallback to ASCII-safe traceback
                    safe_traceback = self.results['traceback'].encode('ascii', 'replace').decode('ascii')
                    print(f"\n{safe_traceback}")
            return

        # Print summary
        summary = self.results["summary"]
        status_color = Colors.OKGREEN if self.results["status"] == "passed" else Colors.FAIL
        print(f"\n{Colors.BOLD}Status:{Colors.ENDC} {status_color}{self.results['status'].upper()}{Colors.ENDC}")
        print(f"{Colors.BOLD}Tests Passed:{Colors.ENDC} {summary['passed']}/{summary['total_tests']}")
        print(f"{Colors.BOLD}Timestamp:{Colors.ENDC} {self.results['timestamp']}")

        # Print test details
        print(f"\n{Colors.BOLD}Test Results:{Colors.ENDC}")
        print(f"{'Metric':<40} {'Expected':<18} {'Actual':<18} {'Diff %':<10} {'Status':<10}")
        print("-" * 96)

        for test in self.results["tests"]:
            status = f"{Colors.OKGREEN}PASS{Colors.ENDC}" if test["passed"] else f"{Colors.FAIL}FAIL{Colors.ENDC}"

            # Format numbers based on unit
            if test["unit"] == "MUSD":
                exp_str = f"${test['expected']:,.2f}M"
                act_str = f"${test['actual']:,.2f}M"
            elif "USD" in test["unit"]:
                exp_str = f"${test['expected']:,.0f}"
                act_str = f"${test['actual']:,.0f}"
            else:
                exp_str = f"{test['expected']:,.2f}"
                act_str = f"{test['actual']:,.2f}"

            diff_str = f"{test['difference_pct']:.2f}%"

            print(f"{test['test_name']:<40} {exp_str:<18} {act_str:<18} {diff_str:<10} {status}")

        # Print calculation results
        print(f"\n{Colors.BOLD}Calculated Values:{Colors.ENDC}")
        calc = self.results["calculation_results"]
        print(f"  TCI:                ${calc['tci']:,.2f}M")
        print(f"  Feedstock Consumed: {calc['feedstock_consumption']:,.0f} tons/year")
        print(f"  Production:         {calc['production']:,.0f} tons/year")
        print(f"  Direct OPEX:        ${calc['total_direct_opex']:,.0f}/year")
        print(f"  Indirect OPEX:      ${calc['total_indirect_opex']:,.0f}/year")
        print(f"  Total OPEX:         ${calc['total_opex']:,.0f}/year")
        print(f"  Revenue:            ${calc['revenue']:,.0f}/year")
        print(f"  LCOP:               ${calc['lcop']:,.2f}/ton")
