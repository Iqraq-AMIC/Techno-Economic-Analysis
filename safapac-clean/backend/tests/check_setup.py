"""
Quick setup verification script.

Run this before the main test to ensure all prerequisites are met.

Usage:
    python backend/tests/check_setup.py
"""

import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent.parent / "backend"
sys.path.insert(0, str(backend_path))


def check_database_connection():
    """Check if PostgreSQL is accessible"""
    print("Checking database connection...")
    try:
        from app.core.database import SessionLocal
        from sqlalchemy import text
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        print("  PASS Database connection successful")
        return True
    except Exception as e:
        print(f"  FAIL Database connection failed: {e}")
        return False


def check_hefa_data():
    """Check if HEFA reference data exists"""
    print("\nChecking HEFA reference data...")
    try:
        from app.core.database import SessionLocal
        from app.models.biofuel_model import (
            ProcessTechnology, Feedstock, Country,
            ProcessFeedstockRef, DefaultParameterSet
        )

        db = SessionLocal()

        # Check Process
        hefa = db.query(ProcessTechnology).filter_by(name="HEFA").first()
        if not hefa:
            print("  FAIL HEFA process not found")
            db.close()
            return False
        print(f"  PASS HEFA process found (ID: {hefa.id})")

        # Check Feedstock
        uco = db.query(Feedstock).filter_by(name="UCO").first()
        if not uco:
            print("  FAIL UCO feedstock not found")
            db.close()
            return False
        print(f"  PASS UCO feedstock found (ID: {uco.id})")

        # Check Country
        usa = db.query(Country).filter_by(name="USA").first()
        if not usa:
            print("  FAIL USA country not found")
            db.close()
            return False
        print(f"  PASS USA country found (ID: {usa.id})")

        # Check ProcessFeedstockRef
        ref = db.query(ProcessFeedstockRef).filter_by(
            process_id=hefa.id,
            feedstock_id=uco.id
        ).first()
        if not ref:
            print("  FAIL HEFA-UCO reference not found")
            db.close()
            return False
        print(f"  PASS HEFA-UCO reference found (ID: {ref.id})")

        # Check DefaultParameterSet
        defaults = db.query(DefaultParameterSet).filter_by(
            process_id=hefa.id,
            feedstock_id=uco.id,
            country_id=usa.id
        ).first()
        if not defaults:
            print("  FAIL HEFA-UCO-USA defaults not found")
            db.close()
            return False
        print(f"  PASS HEFA-UCO-USA defaults found (ID: {defaults.id})")
        print(f"    - TCI Ref: ${defaults.tci_ref_musd}M")
        print(f"    - Capacity Ref: {defaults.plant_capacity_ktpa_ref} KTPA")
        print(f"    - Indirect OPEX Ratio: {defaults.indirect_opex_tci_ratio}")

        db.close()
        return True

    except Exception as e:
        print(f"  FAIL Error checking HEFA data: {e}")
        import traceback
        traceback.print_exc()
        return False


def check_test_files():
    """Check if test fixture files exist"""
    print("\nChecking test fixture files...")
    test_dir = Path(__file__).parent
    scenarios_dir = test_dir / "scenarios"

    # Check if scenarios directory exists
    if not scenarios_dir.exists():
        print(f"  FAIL scenarios/ directory not found")
        return False

    # Check for at least one valid scenario
    valid_scenarios = []
    for scenario_folder in scenarios_dir.iterdir():
        if not scenario_folder.is_dir():
            continue
        # Skip template and hidden folders
        if scenario_folder.name.startswith("_") or scenario_folder.name.startswith("."):
            continue

        input_file = scenario_folder / "input.json"
        output_file = scenario_folder / "output.json"

        if input_file.exists() and output_file.exists():
            valid_scenarios.append(scenario_folder.name)
            print(f"  PASS {scenario_folder.name}/ scenario found")

    if len(valid_scenarios) == 0:
        print(f"  FAIL No valid test scenarios found in scenarios/")
        return False

    print(f"  PASS Found {len(valid_scenarios)} test scenario(s)")
    return True


def check_products():
    """Check if product data exists"""
    print("\nChecking product data...")
    try:
        from app.core.database import SessionLocal
        from app.models.biofuel_model import Product

        db = SessionLocal()

        products = ["Jet", "Diesel", "Naphtha"]
        all_found = True

        for product_name in products:
            product = db.query(Product).filter_by(name=product_name).first()
            if product:
                print(f"  PASS {product_name} product found (ID: {product.id})")
            else:
                print(f"  FAIL {product_name} product not found")
                all_found = False

        db.close()
        return all_found

    except Exception as e:
        print(f"  FAIL Error checking products: {e}")
        return False


def check_utilities():
    """Check if utility data exists"""
    print("\nChecking utility data...")
    try:
        from app.core.database import SessionLocal
        from app.models.biofuel_model import Utility

        db = SessionLocal()

        utilities = ["Hydrogen", "Electricity"]
        all_found = True

        for utility_name in utilities:
            utility = db.query(Utility).filter_by(name=utility_name).first()
            if utility:
                print(f"  PASS {utility_name} utility found (ID: {utility.id})")
            else:
                print(f"  FAIL {utility_name} utility not found")
                all_found = False

        db.close()
        return all_found

    except Exception as e:
        print(f"  FAIL Error checking utilities: {e}")
        return False


def main():
    print("="*80)
    print("HEFA TEST SETUP VERIFICATION")
    print("="*80)

    checks = [
        ("Database Connection", check_database_connection),
        ("Test Fixture Files", check_test_files),
        ("HEFA Reference Data", check_hefa_data),
        ("Product Data", check_products),
        ("Utility Data", check_utilities)
    ]

    results = []
    for name, check_func in checks:
        try:
            result = check_func()
            results.append((name, result))
        except Exception as e:
            print(f"\nUnexpected error in {name}: {e}")
            results.append((name, False))

    # Summary
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)

    all_passed = True
    for name, result in results:
        status = "PASS PASS" if result else "FAIL FAIL"
        print(f"{name:<30} {status}")
        if not result:
            all_passed = False

    print("\n" + "="*80)

    if all_passed:
        print("PASS ALL CHECKS PASSED!")
        print("\nYou can now run the main test:")
        print("  python backend/tests/test_hefa_calculations.py")
        return 0
    else:
        print("FAIL SOME CHECKS FAILED")
        print("\nPlease address the issues above before running the main test.")
        print("\nCommon fixes:")
        print("  1. Seed the database: python backend/app/core/seeding.py")
        print("  2. Check database configuration in backend/app/core/config.py")
        print("  3. Ensure PostgreSQL is running")
        return 1


if __name__ == "__main__":
    sys.exit(main())
