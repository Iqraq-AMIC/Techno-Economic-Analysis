# app/core/seeding.py

import csv
from datetime import datetime
from pathlib import Path
from sqlalchemy.orm import Session
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from typing import Dict, Any, List
import logging
from uuid import UUID
import bcrypt  # Add bcrypt for password hashing


# Import all necessary models - REMOVE UnitRatio import
from app.models.biofuel_model import (
    UnitConversion, UnitGroup, UnitOfMeasure,  # REMOVED: UnitRatio
    User, Utility, Country, UtilityCountryPriceDefaults, ProcessTechnology,
    Feedstock, ProcessFeedstockRef, ProcessUtilityConsumptionRef, ProductReferenceBreakdown,
    DefaultParameterSet, Product
)
from app.core.database import SessionLocal, create_tables

# Setup logging
logger = logging.getLogger(__name__)


# -----------------------------------------------------------------------------
# 1. SEED DATA DEFINITIONS (ALL Data Moved Here)
# -----------------------------------------------------------------------------

REFERENCE_DATA_SEED: Dict[str, Any] = {
    # --- Master Data ---
    "processes": ["HEFA", "FT-BtL", "ATJ", "CHJ"],
    "countries": ["USA", "Malaysia"],
    "products": [
        {"name": "Jet", "carbon_content_kg_c_per_kg": 0.847, "energy_content_mj_per_kg": 43.8, "density_ref": 0.81},
        {"name": "Diesel", "carbon_content_kg_c_per_kg": 0.850, "energy_content_mj_per_kg": 42.6, "density_ref": 0.83},
        {"name": "Gasoline", "carbon_content_kg_c_per_kg": 0.840, "energy_content_mj_per_kg": 43.4, "density_ref": 0.74},
        {"name": "Propane", "carbon_content_kg_c_per_kg": 0.818, "energy_content_mj_per_kg": 46.3, "density_ref": 0.51},
        {"name": "Naphtha", "carbon_content_kg_c_per_kg": 0.849, "energy_content_mj_per_kg": 43.1, "density_ref": 0.70},
    ],
    "feedstocks": [
        {"name": "UCO", "carbon_content_kg_c_per_kg": 0.77, "energy_content_mj_per_kg": 37.0, "ci_ref_gco2e_per_mj": 20.0, "price_ref_usd_per_unit": 930.0, "yield_ref": 1.2048},
        {"name": "Lignocellulosic Biomass", "carbon_content_kg_c_per_kg": 0.52, "energy_content_mj_per_kg": 18.0, "ci_ref_gco2e_per_mj": 5.0, "price_ref_usd_per_unit": 50.0, "yield_ref": 4.5},
        {"name": "Animal Manure", "carbon_content_kg_c_per_kg": 0.40, "energy_content_mj_per_kg": 15.0, "ci_ref_gco2e_per_mj": 15.0, "price_ref_usd_per_unit": 10.0, "yield_ref": 8.5},
    ],
    "utilities": [
        {"name": "Hydrogen", "carbon_content_kg_c_per_kg": 0.0, "energy_content_mj_per_kg": 120.0, "ci_ref_gco2e_per_mj": 10.0, "yield_ref": 0},
        {"name": "Electricity", "carbon_content_kg_c_per_kg": 0.0, "energy_content_mj_per_kg": 0.0, "ci_ref_gco2e_per_mj": 150.0, "yield_ref": 0},
    ],
    
    # --- Reference Data (P+F, P+F+C, U+C) ---
    "p_f_references": [
        # HEFA + UCO (P+F)
        {
            "process": "HEFA", "feedstock": "UCO", 
            "average_product_density_ref": 0.79, 
            "utilities": [
                {"utility": "Hydrogen", "consumption_ratio": 0.042},
                {"utility": "Electricity", "consumption_ratio": 0.12},
            ],
            "products": [
                {"name": "Jet", "yield": 69.0, "price": 1.2, "sensitivity": 0.05},
                {"name": "Diesel", "yield": 0.0, "price": 1.1, "sensitivity": 0.05},
                {"name": "Gasoline", "yield": 31.0, "price": 1.0, "sensitivity": 0.05},
            ],
            "default_params": {
                "general": {"annual_load_hours_ref": 8000, "ci_process_default_gco2_mj": 20.0, "tci_scaling_exponent": 0.6},
                "USA": {"plant_capacity_ktpa_ref": 500, "tci_ref_musd": 400, "discount_rate_percent": 10.0, "project_lifetime_years": 25, "p_steps": 3, "nnp_steps": 28},
                "Malaysia": {"plant_capacity_ktpa_ref": 500, "tci_ref_musd": 380, "discount_rate_percent": 8.5, "project_lifetime_years": 25, "p_steps": 3, "nnp_steps": 28},
            }
        },
        # FT-BtL + Lignocellulosic Biomass (P+F)
        {
            "process": "FT-BtL", "feedstock": "Lignocellulosic Biomass", 
            "average_product_density_ref": 0.78, 
            "utilities": [
                {"utility": "Hydrogen", "consumption_ratio": 0.08},
                {"utility": "Electricity", "consumption_ratio": 0.30},
            ],
            "products": [
                {"name": "Jet", "yield": 72.0, "price": 1.3, "sensitivity": 0.05},
                {"name": "Diesel", "yield": 0.0, "price": 1.2, "sensitivity": 0.05},
                {"name": "Naphtha", "yield": 28.0, "price": 1.1, "sensitivity": 0.05},
            ],
            "default_params": {
                "general": {"annual_load_hours_ref": 7884, "ci_process_default_gco2_mj": 18.0, "tci_scaling_exponent": 0.65},
                "USA": {"plant_capacity_ktpa_ref": 100, "tci_ref_musd": 900, "discount_rate_percent": 10.0, "project_lifetime_years": 30, "p_steps": 5, "nnp_steps": 35},
                "Malaysia": {"plant_capacity_ktpa_ref": 100, "tci_ref_musd": 850, "discount_rate_percent": 8.0, "project_lifetime_years": 30, "p_steps": 5, "nnp_steps": 35},
            }
        },
    ],
    
    # Utility Prices (U+C)
    "u_c_prices": [
        {"utility": "Hydrogen", "country": "USA", "price_ref_usd_per_unit": 5.0},
        {"utility": "Hydrogen", "country": "Malaysia", "price_ref_usd_per_unit": 6.5},
        {"utility": "Electricity", "country": "USA", "price_ref_usd_per_unit": 0.12},
        {"utility": "Electricity", "country": "Malaysia", "price_ref_usd_per_unit": 0.08},
    ]
}

# --- UNIT MASTER DATA DEFINITIONS ---
UNIT_GROUPS = [
    {"name": "Capacity (Mass/Time)", "base_unit_name": "t/yr"},
    {"name": "Density (Mass/Volume)", "base_unit_name": "kg/m3"},
    {"name": "Price/Mass", "base_unit_name": "USD/kg"},
    {"name": "Price/Power", "base_unit_name": "USD/kWh"},
    {"name": "CI/Mass", "base_unit_name": "gCO2/kg"},
    {"name": "CI/Power", "base_unit_name": "gCO2/kWh"},
    {"name": "Energy/Mass", "base_unit_name": "MJ/kg"},
    {"name": "Yield/Mass", "base_unit_name": "kg/kg"},
    {"name": "Yield/Power", "base_unit_name": "kWh/kg"},
    {"name": "Price/CI", "base_unit_name": "USD/gCO2"},
    {"name": "Currency", "base_unit_name": "USD"},
    {"name": "Unitless (Percent)", "base_unit_name": "%"},
]

UNITS_OF_MEASURE_AND_CONVERSIONS = [
    # Capacity (Base Unit: t/yr)
    {"group_name": "Capacity (Mass/Time)", "name": "t/yr", "display_name": "tonne per year", "factor": 1.0},
    {"group_name": "Capacity (Mass/Time)", "name": "kt/yr", "display_name": "kilotonne per year", "factor": 1000.0},
    {"group_name": "Capacity (Mass/Time)", "name": "kta", "display_name": "kilotonne per annum (KTA)", "factor": 1000.0},
    # Density (Base Unit: kg/m3)
    {"group_name": "Density (Mass/Volume)", "name": "kg/m3", "display_name": "kilogram per cubic meter", "factor": 1.0},
    {"group_name": "Density (Mass/Volume)", "name": "g/cm3", "display_name": "gram per cubic centimeter", "factor": 1000.0},
    # Price/Mass (Base Unit: USD/kg)
    {"group_name": "Price/Mass", "name": "usd/kg", "display_name": "USD per kilogram", "factor": 1.0},
    {"group_name": "Price/Mass", "name": "usd/t", "display_name": "USD per tonne", "factor": 0.001},
    {"group_name": "Price/Mass", "name": "usd/kt", "display_name": "USD per kilotonne", "factor": 1e-6},
    # Price/Power (Base Unit: USD/kWh)
    {"group_name": "Price/Power", "name": "usd/kwh", "display_name": "USD per kilowatt-hour", "factor": 1.0},
    {"group_name": "Price/Power", "name": "usd/mwh", "display_name": "USD per megawatt-hour", "factor": 0.001},
    # CI/Mass (Base Unit: gCO2/kg)
    {"group_name": "CI/Mass", "name": "gco2/kg", "display_name": "gCO2 per kilogram", "factor": 1.0},
    {"group_name": "CI/Mass", "name": "kgco2/t", "display_name": "kgCO2 per tonne", "factor": 1.0},
    # CI/Power (Base Unit: gCO2/kWh)
    {"group_name": "CI/Power", "name": "gco2/kwh", "display_name": "gCO2 per kilowatt-hour", "factor": 1.0},
    {"group_name": "CI/Power", "name": "kgco2/mwh", "display_name": "kgCO2 per megawatt-hour", "factor": 1.0},
    # Energy/Mass (Base Unit: MJ/kg)
    {"group_name": "Energy/Mass", "name": "mj/kg", "display_name": "Megajoule per kilogram", "factor": 1.0},
    # Yield/Mass (Base Unit: kg/kg)
    {"group_name": "Yield/Mass", "name": "kg/kg", "display_name": "kilogram per kilogram", "factor": 1.0},
    {"group_name": "Yield/Mass", "name": "t/t", "display_name": "tonne per tonne", "factor": 1.0},
    # Yield/Power (Base Unit: kWh/kg)
    {"group_name": "Yield/Power", "name": "kwh/kg", "display_name": "kilowatt-hour per kilogram", "factor": 1.0},
    {"group_name": "Yield/Power", "name": "mwh/kg", "display_name": "megawatt-hour per kilogram", "factor": 1000.0},
    # Price/CI (Base Unit: USD/gCO2)
    {"group_name": "Price/CI", "name": "usd/gco2", "display_name": "USD per gCO2", "factor": 1.0},
    {"group_name": "Price/CI", "name": "usd/kgco2", "display_name": "USD per kgCO2", "factor": 0.001},
    # Currency (Base Unit: USD)
    {"group_name": "Currency", "name": "usd", "display_name": "US Dollar", "factor": 1.0},
    {"group_name": "Currency", "name": "musd", "display_name": "Million US Dollar (MUS D)", "factor": 1_000_000.0},
    # Unitless (Percent)
    {"group_name": "Unitless (Percent)", "name": "%", "display_name": "Percent", "factor": 1.0},
]

# NOTE: Using a placeholder UUID for seeding
SEED_USER_UUID = "00000000-0000-0000-0000-000000000001"
USERS = [{"id": SEED_USER_UUID, "email": "admin@example.com", "password_hash": "placeholder_hash"}]


# -----------------------------------------------------------------------------
# 2. CORE SEEDING LOGIC (All Functions Moved Here)
# -----------------------------------------------------------------------------

def get_id_map(db: Session, model, name_field: str = 'name') -> Dict[str, int]:
    """Utility function to create a name-to-ID map for foreign key lookups."""
    return {getattr(obj, name_field): obj.id for obj in db.execute(select(model)).scalars().all()}


def seed_units(db: Session) -> None:
    """Seeds the Unit Group, Unit of Measure, and Unit Conversion tables."""
    logger.info("Starting unit data seeding...")
    
    # Check if UnitGroup table is already populated
    if db.execute(select(UnitGroup)).first() is not None:
        logger.info("Unit tables already populated. Skipping unit seeding.")
        return

    # --- Step 1: Seed Unit Groups ---
    for data in UNIT_GROUPS:
        group = UnitGroup(**data)
        db.add(group)
    
    # Force flush to generate primary keys (IDs) for UnitGroup objects
    db.flush()
    logger.debug("Unit groups seeded.")

    # --- Step 2: Seed Units of Measure and Conversions ---
    # Retrieve the generated IDs for lookup
    group_id_map = {group.name: group.id for group in db.query(UnitGroup).all()}
    
    for data in UNITS_OF_MEASURE_AND_CONVERSIONS:
        group_id = group_id_map.get(data['group_name'])
        if not group_id:
            logger.error(f"Unit Group not found for {data['group_name']}. Skipping unit {data['name']}.")
            continue
            
        # Create UnitOfMeasure
        unit = UnitOfMeasure(
            unit_group_id=group_id,
            name=data['name'],
            display_name=data.get('display_name')
        )
        db.add(unit)
        db.flush() # Flush to get the ID for the UnitConversion foreign key
        
        # Create UnitConversion
        conversion = UnitConversion(
            unit_id=unit.id,
            conversion_factor=data['factor']
        )
        db.add(conversion)

    db.commit()
    logger.info("UnitOfMeasure and UnitConversion tables seeded successfully.")


def seed_master_data(db: Session, seed_data: Dict[str, Any]) -> Dict[str, Dict[str, int]]:
    """Seeds ProcessTechnology, Country, Product, Feedstock, and Utility tables."""
    
    id_maps = {}

    # Seed Process Technologies
    if db.execute(select(ProcessTechnology)).first() is None:
        for name in seed_data["processes"]:
            db.add(ProcessTechnology(name=name))
        db.commit()
        logger.info(f"{len(seed_data['processes'])} Process Technologies seeded.")
    id_maps['process'] = get_id_map(db, ProcessTechnology)

    # Seed Countries
    if db.execute(select(Country)).first() is None:
        for name in seed_data["countries"]:
            db.add(Country(name=name))
        db.commit()
        logger.info(f"{len(seed_data['countries'])} Countries seeded.")
    id_maps['country'] = get_id_map(db, Country)

    # Seed Products (Name only)
    if db.execute(select(Product)).first() is None:
        for data in seed_data["products"]:
            db.add(Product(name=data["name"])) 
        db.commit()
        logger.info(f"{len(seed_data['products'])} Products seeded.")
    id_maps['product'] = get_id_map(db, Product)

    # Seed Feedstocks
    if db.execute(select(Feedstock)).first() is None:
        for data in seed_data["feedstocks"]:
            db.add(Feedstock(
                name=data["name"],
                carbon_content_kg_c_per_kg=data["carbon_content_kg_c_per_kg"],
                energy_content_mj_per_kg=data["energy_content_mj_per_kg"],
                ci_ref_gco2e_per_mj=data["ci_ref_gco2e_per_mj"],
                price_ref_usd_per_unit=data["price_ref_usd_per_unit"],
                yield_ref=data["yield_ref"]
            ))
        db.commit()
        logger.info(f"{len(seed_data['feedstocks'])} Feedstocks seeded.")
    id_maps['feedstock'] = get_id_map(db, Feedstock)

    # Seed Utilities
    if db.execute(select(Utility)).first() is None:
        for data in seed_data["utilities"]:
            db.add(Utility(
                name=data["name"],
                carbon_content_kg_c_per_kg=data["carbon_content_kg_c_per_kg"],
                energy_content_mj_per_kg=data["energy_content_mj_per_kg"],
                ci_ref_gco2e_per_mj=data["ci_ref_gco2e_per_mj"],
                yield_ref=data["yield_ref"]
            ))
        db.commit()
        logger.info(f"{len(seed_data['utilities'])} Utilities seeded.")
    id_maps['utility'] = get_id_map(db, Utility)
    
    return id_maps


def seed_utility_prices(db: Session, seed_data: Dict[str, Any], id_maps: Dict[str, Dict[str, int]]) -> None:
    """Seeds UtilityCountryPriceDefaults (U+C) data."""
    if db.execute(select(UtilityCountryPriceDefaults)).first() is not None:
        logger.info("UtilityCountryPriceDefaults already populated. Skipping.")
        return

    utility_map = id_maps['utility']
    country_map = id_maps['country']

    count = 0
    for data in seed_data["u_c_prices"]:
        utility_id = utility_map.get(data['utility'])
        country_id = country_map.get(data['country'])
        
        if utility_id and country_id:
            db.add(UtilityCountryPriceDefaults(
                utility_id=utility_id,
                country_id=country_id,
                price_ref_usd_per_unit=data['price_ref_usd_per_unit']
            ))
            count += 1
        else:
            logger.error(f"Missing ID for utility price: {data}")
            
    db.commit()
    logger.info(f"{count} UtilityCountryPriceDefaults records seeded.")


def seed_p_f_references(db: Session, seed_data: Dict[str, Any], id_maps: Dict[str, Dict[str, int]]) -> None:
    """Seeds ProcessFeedstockRef, its children (UtilityConsumption, ProductBreakdown) and DefaultParameterSet."""
    if db.execute(select(ProcessFeedstockRef)).first() is not None:
        logger.info("ProcessFeedstockRef and associated tables already populated. Skipping.")
        return

    process_map = id_maps['process']
    feedstock_map = id_maps['feedstock']
    utility_map = id_maps['utility']
    product_map = id_maps['product']
    country_map = id_maps['country']
    
    products_master_data = {p['name']: p for p in seed_data["products"]}
    p_f_ref_count = 0
    
    for p_f_ref_data in seed_data["p_f_references"]:
        process_name = p_f_ref_data['process']
        feedstock_name = p_f_ref_data['feedstock']
        
        process_id = process_map.get(process_name)
        feedstock_id = feedstock_map.get(feedstock_name)
        
        if not process_id or not feedstock_id:
            logger.error(f"Missing ID for P-F Reference: {process_name}/{feedstock_name}. Skipping.")
            continue

        # 1. Seed ProcessFeedstockRef (P+F)
        p_f_ref = ProcessFeedstockRef(
            process_id=process_id,
            feedstock_id=feedstock_id,
            average_product_density_ref=p_f_ref_data['average_product_density_ref']
        )
        db.add(p_f_ref)
        db.flush() # Flush to get p_f_ref.id
        p_f_ref_count += 1

        # 2. Seed ProcessUtilityConsumptionRef (P+F + U)
        for util_data in p_f_ref_data['utilities']:
            utility_id = utility_map.get(util_data['utility'])
            if utility_id:
                db.add(ProcessUtilityConsumptionRef(
                    ref_id=p_f_ref.id,
                    utility_id=utility_id,
                    consumption_ratio_ref_unit_per_kg_fuel=util_data['consumption_ratio']
                ))

        # 3. Seed ProductReferenceBreakdown (P+F + Product)
        for prod_data in p_f_ref_data['products']:
            product_name = prod_data['name']
            product_id = product_map.get(product_name)
            full_prod_data = products_master_data.get(product_name)

            if product_id and full_prod_data:
                db.add(ProductReferenceBreakdown(
                    ref_id=p_f_ref.id,
                    product_id=product_id,
                    # Technical properties from master data
                    carbon_content_kg_c_per_kg=full_prod_data['carbon_content_kg_c_per_kg'],
                    energy_content_mj_per_kg=full_prod_data['energy_content_mj_per_kg'],
                    product_density=full_prod_data['density_ref'],
                    # Default Economic properties from P+F ref data
                    price_ref_usd_per_unit=prod_data['price'],
                    price_sensitivity_ref=prod_data['sensitivity'],
                    product_yield_ref=prod_data['yield'] / 100.0, # Convert % yield to fraction
                ))
            else:
                logger.error(f"Missing ID or data for Product Breakdown: {product_name}")

        # 4. Seed DefaultParameterSet (P+F + Country)
        general_defaults = p_f_ref_data['default_params']['general']
        country_defaults = {k: v for k, v in p_f_ref_data['default_params'].items() if k != 'general'}

        for country_name, defaults in country_defaults.items():
            country_id = country_map.get(country_name)
            if country_id:
                db.add(DefaultParameterSet(
                    process_id=process_id,
                    feedstock_id=feedstock_id,
                    country_id=country_id,
                    
                    # Conversion Plant Defaults
                    plant_capacity_ktpa_ref=defaults['plant_capacity_ktpa_ref'],
                    annual_load_hours_ref=general_defaults['annual_load_hours_ref'],
                    ci_process_default_gco2_mj=general_defaults['ci_process_default_gco2_mj'],
                    
                    # Economic Parameter Defaults
                    project_lifetime_years=defaults['project_lifetime_years'],
                    discount_rate_percent=defaults['discount_rate_percent'],
                    tci_ref_musd=defaults['tci_ref_musd'],
                    tci_scaling_exponent=general_defaults['tci_scaling_exponent'],
                    working_capital_tci_ratio=0.10, 
                    indirect_opex_tci_ratio=0.03,
                    
                    # Additional Parameters
                    p_steps=defaults['p_steps'],
                    nnp_steps=defaults['nnp_steps']
                ))
            else:
                logger.error(f"Missing Country ID for Default Parameter Set: {country_name}")
                
    db.commit()
    logger.info(f"{p_f_ref_count} Process-Feedstock references and associated default data seeded successfully.")


# Add this function to handle password hashing
def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

# Replace the USERS section with CSV reading logic
def load_users_from_csv() -> List[Dict[str, str]]:
    """Load users from CSV file"""
    csv_path = Path(__file__).parent / "pw.csv"
    
    if not csv_path.exists():
        logger.warning(f"CSV file not found at {csv_path}. Using default admin user.")
        return [{
            "id": SEED_USER_UUID,
            "name": "Admin User",
            "email": "admin@example.com", 
            "password": "adminsaf1234"
        }]
    
    users = []
    try:
        with open(csv_path, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file, delimiter='\t')  # Tab-delimited
            for row in reader:
                users.append({
                    "name": row["Staff Name"],
                    "email": row["Email Address"],
                    "password": row["Suggested Password"]
                })
        logger.info(f"Loaded {len(users)} users from CSV")
    except Exception as e:
        logger.error(f"Error reading CSV file: {e}")
        # Fallback to default user
        users = [{
            "id": SEED_USER_UUID,
            "name": "Admin User",
            "email": "admin@example.com",
            "password": "adminsaf1234"
        }]
    
    return users


def seed_database(db: Session):
    """
    Core function to seed all necessary static reference data into the database.
    """
    try:
        # --- 1. SEED UNIT TABLES FIRST ---
        seed_units(db)
        
        # --- 2. Seed Users (Must run before projects for foreign key refs) ---
        if db.execute(select(User)).first() is None:
            users_data = load_users_from_csv()
            
            for i, data in enumerate(users_data):
                user_id = UUID(data["id"]) if "id" in data else UUID(int=i+1)
                db.add(User(
                    id=user_id,
                    name=data["name"],
                    email=data["email"],
                    password_hash=hash_password(data["password"]),
                    created_at=datetime.utcnow()
                ))
            db.commit()
            logger.info(f"{len(users_data)} Users seeded.")

        # --- 3. SEED MASTER DATA (Processes, Countries, Products, Feedstocks, Utilities) ---
        # Get ID maps for foreign key lookups in later steps
        id_maps = seed_master_data(db, REFERENCE_DATA_SEED)
        
        # --- 4. SEED UTILITY PRICES (U+C) ---
        seed_utility_prices(db, REFERENCE_DATA_SEED, id_maps)

        # --- 5. SEED P+F REFERENCES AND DEFAULTS (P+F, P+F+U, P+F+Product, P+F+C) ---
        seed_p_f_references(db, REFERENCE_DATA_SEED, id_maps)
        
        logger.info("Reference data seeding successful.")
            
    except IntegrityError:
        db.rollback()
        logger.warning("Data already exists or integrity constraint violated. Rolling back and skipping insertions.")
    except Exception as e:
        db.rollback()
        logger.error(f"FATAL ERROR during seeding: {e}", exc_info=True)
        raise

# ----------------------------------------------------------------------------
# 3. CONVENIENCE INITIALIZATION HOOK
# ----------------------------------------------------------------------------

def initialize_database():
    """Wrapper that calls create_tables and then seed_database."""
    logger.info("Initializing database (creating tables and seeding data)...")
    create_tables()

    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()