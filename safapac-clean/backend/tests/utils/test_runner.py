"""
Test runner utility for executing calculation tests and generating results.
"""

import json
import sys
import numpy as np
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional

# Add backend to path (we're already in backend/tests/utils)
backend_path = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_path))

from app.core.database import SessionLocal
from app.crud.biofuel_crud import BiofuelCRUD
from app.services.feature_calculations import Layer1, Layer2, Layer3, Layer4
from app.services.financial_analysis import FinancialAnalysis

from .test_colors import Colors


class NumpyEncoder(json.JSONEncoder):
    """Custom JSON encoder that handles numpy types"""
    def default(self, obj):
        if isinstance(obj, (np.integer, np.floating)):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, (np.bool_, bool)):
            return bool(obj)
        return super().default(obj)


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
        # CHANGED: Use IDs instead of names, as the input JSON uses IDs now
        # Fallback to 'Unknown' if keys are missing to prevent crashes during debugging
        p_id = self.inputs.get('process_id', 'UnknownProcess')
        c_id = self.inputs.get('country_id', 'UnknownCountry')
        
        # Access nested capacity safely
        try:
            capacity = self.inputs['conversion_plant']['plant_capacity']['value']
        except (KeyError, TypeError):
            capacity = '0'

        return f"ProcessID{p_id}_CountryID{c_id}_{capacity}KTPA"


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
            process_tech = self.scenario.inputs["process_id"]
            feedstock = self.scenario.inputs["feedstock_id"]
            country = self.scenario.inputs["country_id"]

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

        # Get feedstock data from ref_data, but allow input.json to override
        feedstock_carbon_content = inputs["feedstock_data"].get("carbon_content", ref_data.get("feedstock_carbon_content", 0.75))
        feedstock_ci = inputs["feedstock_data"]["carbon_intensity"]["value"]

        # Build products list
        products = []
        for p in inputs["products"]:
            # Handle yield conversion (convert percentage to decimal if needed)
            product_yield = p["yield"]["value"]
            if p["yield"].get("unit") == "percent":
                product_yield = product_yield / 100

            products.append({
                "name": p["name"],
                "mass_fraction": product_yield,
                "product_yield": product_yield,
                "product_energy_content": p["energy_content"],
                "product_carbon_content": p["carbon_content"],
                "product_price": p["price"]["value"],
                "product_price_sensitivity_ci": 0.0
            })

        # Handle utility yield conversions
        hydrogen_yield = inputs["utilities"][0]["yield"]["value"]
        hydrogen_yield_unit = inputs["utilities"][0]["yield"].get("unit", "")
        if hydrogen_yield_unit == "percent":
            hydrogen_yield = hydrogen_yield / 100

        electricity_yield = inputs["utilities"][1]["yield"]["value"]
        electricity_yield_unit = inputs["utilities"][1]["yield"].get("unit", "")
        if electricity_yield_unit == "percent":
            electricity_yield = electricity_yield / 100
        elif "MWh" in electricity_yield_unit:
            # Convert MWh/ton to kWh/ton for calculation engine (which expects kWh/ton)
            electricity_yield = electricity_yield * 1000

        # Get utility carbon intensities
        hydrogen_ci = inputs["utilities"][0]["carbon_intensity"]["value"]
        electricity_ci = inputs["utilities"][1]["carbon_intensity"]["value"]

        # Get plant capacity and convert to base unit (tons/year)
        # The calculation engine expects tons/year as the base unit
        plant_capacity_raw = inputs["conversion_plant"]["plant_capacity"]["value"]
        plant_capacity_unit = inputs["conversion_plant"]["plant_capacity"].get("unit", "KTPA")

        # Convert to tons/year based on unit
        if plant_capacity_unit.upper() in ["KTPA", "KTA", "KT/YR"]:
            # KTA = kilotonne per annum, multiply by 1000 to get tons/year
            plant_capacity_tons = plant_capacity_raw * 1000
        elif plant_capacity_unit.upper() in ["TPA", "T/YR", "TONS/YEAR"]:
            # Already in tons/year
            plant_capacity_tons = plant_capacity_raw
        else:
            # Default: assume KTPA for backward compatibility
            plant_capacity_tons = plant_capacity_raw * 1000

        # Convert hydrogen price from $/kg to $/ton if unit is specified as kg
        hydrogen_price_raw = inputs["utilities"][0]["price"]["value"]
        hydrogen_price_unit = inputs["utilities"][0]["price"].get("unit", "USD/kg")
        if "kg" in hydrogen_price_unit.lower():
            hydrogen_price = hydrogen_price_raw * 1000  # Convert $/kg to $/ton
        else:
            hydrogen_price = hydrogen_price_raw

        calc_inputs = {
            "plant_total_liquid_fuel_capacity": plant_capacity_tons,  # Now in tons/year (base unit)
            "feedstock_carbon_intensity": feedstock_ci,
            "feedstock_carbon_content": feedstock_carbon_content,
            "feedstock_price": inputs["feedstock_data"]["price"]["value"],
            "feedstock_yield": inputs["feedstock_data"]["yield"]["value"],
            "hydrogen_price": hydrogen_price,
            "hydrogen_yield": hydrogen_yield,
            "hydrogen_carbon_intensity": hydrogen_ci,
            "electricity_rate": inputs["utilities"][1]["price"]["value"] / 1000,
            "electricity_yield": electricity_yield,
            "electricity_carbon_intensity": electricity_ci,

            # --- CHANGED THIS LINE ---
            # Use ref_data (from DB) to get the name, because inputs (from JSON) only has the ID
            "process_type": ref_data["process_technology"],

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

        # Run financial analysis
        financial_analyzer = FinancialAnalysis(discount_rate=discount_rate)
        tci_usd = layer1_results["total_capital_investment"] * 1_000_000  # Convert MUSD to USD
        annual_revenue = layer2_results["revenue"]
        annual_manufacturing_cost = layer4_results["total_opex"]

        financial_results = financial_analyzer.calculate_financial_metrics(
            tci_usd=tci_usd,
            annual_revenue=annual_revenue,
            annual_manufacturing_cost=annual_manufacturing_cost,
            project_lifetime=plant_lifetime
        )

        # Add financial metrics to layer4 results
        layer4_results["npv"] = financial_results["npv"]
        layer4_results["irr"] = financial_results["irr"]
        layer4_results["payback_period"] = financial_results["payback_period"]
        layer4_results["cash_flow_schedule"] = financial_results["cash_flow_schedule"]

        return {
            "layer1": layer1_results,
            "layer2": layer2_results,
            "layer3": layer3_results,
            "layer4": layer4_results
        }

    def compare_results(self, calc_results):
        """Compare calculated results with expected outputs - tests ALL parameters in output.json"""
        expected = self.scenario.expected_outputs
        tests = []

        # === PROCESS OUTPUTS SECTION ===
        feedstock_name = self.scenario.inputs["feedstock_data"]["name"]
        # Test feedstock consumption
        tests.append({
            "name": "Feedstock Consumption",
            "actual": calc_results["layer1"]["feedstock_consumption"],
            "expected": expected["process_outputs"]["feedstock_consumption"][feedstock_name]["value"],            
            "unit": "tons/year",
            "tolerance": 0.01
        })

        # Test each product production
        products = calc_results["layer1"].get("products", [])
        for product in products:
            product_name = product["name"]
            if product_name in expected["process_outputs"]["product_production"]:
                tests.append({
                    "name": f"Production - {product_name}",
                    "actual": product["amount_of_product"],
                    "expected": expected["process_outputs"]["product_production"][product_name]["value"],
                    "unit": "tons/year",
                    "tolerance": 0.01
                })

        # Test total production
        tests.append({
            "name": "Total Production",
            "actual": calc_results["layer1"]["production"],
            "expected": expected["process_outputs"]["total_production"]["value"],
            "unit": "tons/year",
            "tolerance": 0.01
        })

        # Test utility consumption
        tests.append({
            "name": "Hydrogen Consumption",
            "actual": calc_results["layer1"]["hydrogen_consumption"],
            "expected": expected["process_outputs"]["utility_consumption"]["hydrogen"]["value"],
            "unit": expected["process_outputs"]["utility_consumption"]["hydrogen"]["unit"],
            "tolerance": 0.01
        })

        # Handle electricity consumption - backend returns kWh/year, but we expect MWh/year
        electricity_actual = calc_results["layer1"]["electricity_consumption"]
        electricity_expected_value = expected["process_outputs"]["utility_consumption"]["electricity"]["value"]
        electricity_expected_unit = expected["process_outputs"]["utility_consumption"]["electricity"]["unit"]

        # If expected is in MWh, convert actual from kWh to MWh for comparison
        if "MWh" in electricity_expected_unit:
            electricity_actual = electricity_actual / 1000  # kWh to MWh

        tests.append({
            "name": "Electricity Consumption",
            "actual": electricity_actual,
            "expected": electricity_expected_value,
            "unit": electricity_expected_unit,
            "tolerance": 0.01
        })

        # === ECONOMIC OUTPUTS SECTION ===

        tests.append({
            "name": "Total Capital Investment (TCI)",
            "actual": calc_results["layer1"]["total_capital_investment"],
            "expected": expected["economic_outputs"]["total_capital_investment"]["value"],
            "unit": "MUSD",
            "tolerance": 0.01
        })

        tests.append({
            "name": "Total Direct OPEX",
            "actual": calc_results["layer3"]["total_direct_opex"],
            "expected": expected["economic_outputs"]["total_direct_opex"]["value"],
            "unit": "USD/year",
            "tolerance": 0.02
        })

        tests.append({
            "name": "Feedstock Cost",
            "actual": calc_results["layer2"]["feedstock_cost"],
            "expected": expected["economic_outputs"]["feedstock_cost"]["value"],
            "unit": "USD/year",
            "tolerance": 0.02
        })

        tests.append({
            "name": "Hydrogen Cost",
            "actual": calc_results["layer2"]["hydrogen_cost"],
            "expected": expected["economic_outputs"]["hydrogen_cost"]["value"],
            "unit": "USD/year",
            "tolerance": 0.02
        })

        tests.append({
            "name": "Electricity Cost",
            "actual": calc_results["layer2"]["electricity_cost"],
            "expected": expected["economic_outputs"]["electricity_cost"]["value"],
            "unit": "USD/year",
            "tolerance": 0.02
        })

        tests.append({
            "name": "Total Indirect OPEX",
            "actual": calc_results["layer2"]["total_indirect_opex"],
            "expected": expected["economic_outputs"]["total_indirect_opex"]["value"],
            "unit": "USD/year",
            "tolerance": 0.02
        })

        tests.append({
            "name": "Total OPEX",
            "actual": calc_results["layer4"]["total_opex"],
            "expected": expected["economic_outputs"]["total_opex"]["value"],
            "unit": "USD/year",
            "tolerance": 0.02
        })

        tests.append({
            "name": "LCOP",
            "actual": calc_results["layer4"]["lcop"],
            "expected": expected["economic_outputs"]["lcop"]["value"],
            "unit": "USD/ton",
            "tolerance": 0.02
        })

        # === CARBON METRICS SECTION ===

        # Test carbon intensity per product
        product_carbon_metrics = calc_results["layer2"].get("product_carbon_metrics", [])
        for metric in product_carbon_metrics:
            product_name = metric["name"]
            if product_name in expected["carbon_metrics"]["product_carbon_intensity"]:
                tests.append({
                    "name": f"Carbon Intensity - {product_name}",
                    "actual": metric["carbon_intensity_kgco2_ton"],
                    "expected": expected["carbon_metrics"]["product_carbon_intensity"][product_name]["value"],
                    "unit": "kg CO2e/ton",
                    "tolerance": 0.02
                })

        # Test carbon conversion efficiency per product
        for metric in product_carbon_metrics:
            product_name = metric["name"]
            if product_name in expected["carbon_metrics"]["product_carbon_conversion_efficiency"]:
                tests.append({
                    "name": f"CCE - {product_name}",
                    "actual": metric["carbon_conversion_efficiency_percent"],
                    "expected": expected["carbon_metrics"]["product_carbon_conversion_efficiency"][product_name]["value"],
                    "unit": "percent",
                    "tolerance": 0.02
                })

        # Test CO2 emissions per product
        for metric in product_carbon_metrics:
            product_name = metric["name"]
            if product_name in expected["carbon_metrics"]["product_co2_emissions"]:
                tests.append({
                    "name": f"CO2 Emissions - {product_name}",
                    "actual": metric["co2_emissions_ton_per_year"],
                    "expected": expected["carbon_metrics"]["product_co2_emissions"][product_name]["value"],
                    "unit": "tons/year",
                    "tolerance": 0.02
                })

        # === REVENUE OUTPUTS SECTION ===

        tests.append({
            "name": "Total Revenue",
            "actual": calc_results["layer2"]["revenue"],
            "expected": expected["revenue_outputs"]["total_revenue"]["value"],
            "unit": "USD/year",
            "tolerance": 0.02
        })

        # Test revenue per product
        product_revenues = calc_results["layer2"].get("product_revenues", [])
        for rev in product_revenues:
            product_name = rev["name"]
            if product_name in expected["revenue_outputs"]["product_revenues"]:
                tests.append({
                    "name": f"Revenue - {product_name}",
                    "actual": rev["revenue"],
                    "expected": expected["revenue_outputs"]["product_revenues"][product_name]["value"],
                    "unit": "USD/year",
                    "tolerance": 0.02
                })

        # === FINANCIAL OUTPUTS SECTION ===

        if "financial_outputs" in expected:
            tests.append({
                "name": "NPV",
                "actual": calc_results["layer4"]["npv"],
                "expected": expected["financial_outputs"]["npv"]["value"],
                "unit": "USD",
                "tolerance": 0.02
            })

            tests.append({
                "name": "IRR",
                "actual": calc_results["layer4"]["irr"],
                "expected": expected["financial_outputs"]["irr"]["value"],
                "unit": "ratio",
                "tolerance": 0.02
            })

            tests.append({
                "name": "Payback Period",
                "actual": calc_results["layer4"]["payback_period"],
                "expected": expected["financial_outputs"]["payback_period"]["value"],
                "unit": "years",
                "tolerance": 0.02
            })

        # === RUN ALL TESTS ===

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
                "revenue": calc_results["layer2"]["revenue"],
                "carbon_intensity": calc_results["layer4"]["carbon_intensity"],
                "total_co2_emissions": calc_results["layer4"]["total_co2_emissions"],
                "carbon_conversion_efficiency": calc_results["layer1"]["carbon_conversion_efficiency_percent"],
                "npv": calc_results["layer4"]["npv"],
                "irr": calc_results["layer4"]["irr"],
                "payback_period": calc_results["layer4"]["payback_period"]
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
            json.dump(self.results, f, indent=2, cls=NumpyEncoder)

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
        print(f"{'Metric':<50} {'Expected':<18} {'Actual':<18} {'Diff %':<10} {'Status':<10}")
        print("-" * 106)

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

            print(f"{test['test_name']:<50} {exp_str:<18} {act_str:<18} {diff_str:<10} {status}")

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
        print(f"  Carbon Intensity:   {calc['carbon_intensity']:.4f} gCO2e/MJ")
        print(f"  Total CO2 Emissions: {calc['total_co2_emissions']:,.0f} gCO2e/year")
        print(f"  Carbon Conv. Eff.:  {calc['carbon_conversion_efficiency']:.2f}%")
        print(f"  NPV:                ${calc['npv']:,.0f}")
        print(f"  IRR:                {calc['irr']:.2f} ({calc['irr']*100:.0f}%)")
        print(f"  Payback Period:     {calc['payback_period']:.0f} years")
