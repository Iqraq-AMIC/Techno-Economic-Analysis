# app/crud/biofuel_crud.py

import datetime
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, and_, desc
from typing import List, Dict, Any, Optional
from uuid import UUID

# Import ORM models
from app.models.biofuel_model import (
    ProcessTechnology, Feedstock, UnitConversion, UnitGroup, UnitOfMeasure, 
    Utility, Country, ProcessFeedstockRef, ProcessUtilityConsumptionRef,
    Product, ProductReferenceBreakdown, UtilityCountryPriceDefaults,
    DefaultParameterSet, User, UserProject, Scenario
)

# Pydantic Schemas
from app.schemas.biofuel_schema import ProjectCreate, ProjectUpdate, ScenarioCreate

class BiofuelCRUD:
    def __init__(self, db: Session):
        self.db = db

    # ------------------------------------------------------------
    # Master Data Read Operations
    # ------------------------------------------------------------
    def get_process_technologies(self) -> List[ProcessTechnology]:
        return self.db.execute(select(ProcessTechnology)).scalars().all()

    def get_feedstocks(self) -> List[Feedstock]:
        return self.db.execute(select(Feedstock)).scalars().all()

    def get_countries(self) -> List[Country]:
        return self.db.execute(select(Country)).scalars().all()

    def get_utilities(self) -> List[Utility]:
        return self.db.execute(select(Utility)).scalars().all()

    def get_products(self) -> List[Product]:
        return self.db.execute(select(Product)).scalars().all()

    def get_all_master_data(self) -> Dict[str, List]:
        """Get all master data in one call for frontend initialization"""
        return {
            "processes": self.get_process_technologies(),
            "feedstocks": self.get_feedstocks(),
            "countries": self.get_countries(),
            "utilities": self.get_utilities(),
            "products": self.get_products(),
            "units": self.get_all_units_for_conversion(),
        }

    # ------------------------------------------------------------
    # Core Reference Data Read Operations
    # ------------------------------------------------------------

    def get_project_reference_data(self, process_name: str, feedstock_name: str, country_name: str) -> Optional[Dict[str, Any]]:
        """
        Fetches all static reference data (technical, economic, utility, product)
        required to run the techno-economic calculation for a P-F-C combination.
        Returns a single, flattened dictionary for the calculation service layer.
        """
        
        # 1. Base query for P-F-C linkage and defaults
        stmt = (
            select(DefaultParameterSet)
            .join(ProcessTechnology)
            .join(Feedstock)
            .join(Country)
            .where(
                and_(
                    ProcessTechnology.name == process_name,
                    Feedstock.name == feedstock_name,
                    Country.name == country_name
                )
            )
            .options(
                joinedload(DefaultParameterSet.process),
                joinedload(DefaultParameterSet.country),
                joinedload(DefaultParameterSet.feedstock),
            )
        )
        default_params_record = self.db.execute(stmt).scalar_one_or_none()

        if not default_params_record:
            return None

        # 2. Get ProcessFeedstockRef and associated data (density, product breakdown)
        pfr_stmt = (
            select(ProcessFeedstockRef)
            .where(
                and_(
                    ProcessFeedstockRef.process_id == default_params_record.process_id,
                    ProcessFeedstockRef.feedstock_id == default_params_record.feedstock_id
                )
            )
            .options(
                joinedload(ProcessFeedstockRef.utility_consumptions).joinedload(ProcessUtilityConsumptionRef.utility),
                joinedload(ProcessFeedstockRef.product_breakdowns).joinedload(ProductReferenceBreakdown.product)            
            )
        )
        pfr_record = self.db.execute(pfr_stmt).unique().scalar_one_or_none()

        # 3. Get Country-specific Utility Prices
        price_stmt = (
            select(UtilityCountryPriceDefaults)
            .where(UtilityCountryPriceDefaults.country_id == default_params_record.country_id)
            .options(joinedload(UtilityCountryPriceDefaults.utility))
        )
        price_records = self.db.execute(price_stmt).scalars().all()
        
        # 4. Consolidate into a flat dictionary
        data: Dict[str, Any] = {
            # Default Parameters
            "process_technology": default_params_record.process.name, # Changed from "Process Technology"
            "feedstock_name": default_params_record.feedstock.name, # Changed from "Feedstock"
            "country_name": default_params_record.country.name, # Changed from "Country"
            "tci_ref": default_params_record.tci_ref_musd, # Changed from "TCI_ref"
            "capacity_ref": default_params_record.plant_capacity_ktpa_ref, # Changed from "Capacity_ref"
            "ci_process_default_gco2_mj": default_params_record.ci_process_default_gco2_mj,
            "project_lifetime_years": default_params_record.project_lifetime_years,
            "discount_rate_percent": default_params_record.discount_rate_percent,
            "tci_scaling_exponent": default_params_record.tci_scaling_exponent,
            "working_capital_tci_ratio": default_params_record.working_capital_tci_ratio,
            "indirect_opex_tci_ratio": default_params_record.indirect_opex_tci_ratio,
            "annual_load_hours_ref": default_params_record.annual_load_hours_ref,
            "p_steps": default_params_record.p_steps, # Changed from "P_steps"
            "nnp_steps": default_params_record.nnp_steps, # Changed from "Nnp_steps"
            
            "process_type": process_name.upper(),
            "conversion_process_ci": default_params_record.ci_process_default_gco2_mj,
            "process_ratio": default_params_record.indirect_opex_tci_ratio,
            
            # For Layer2 calculations
            "feedstock_ci": default_params_record.feedstock.ci_ref_gco2e_per_mj,
            "feedstock_carbon_content": default_params_record.feedstock.carbon_content_kg_c_per_kg,
            "feedstock_price": default_params_record.feedstock.price_ref_usd_per_unit,
            # Process/Feedstock Ref Data
            "average_product_density_ref": pfr_record.average_product_density_ref,
            
            # Products (List of Dicts)
            "products": [
                {
                    "name": p.product.name,
                    "mass_fraction_percent": p.product_yield_ref * 100,
                    "energy_content_mj_per_kg": p.energy_content_mj_per_kg,
                    "carbon_content_kg_c_per_kg": p.carbon_content_kg_c_per_kg,
                    "price_ref_usd_per_unit": p.price_ref_usd_per_unit,
                    "price_sensitivity_ref": p.price_sensitivity_ref,
                    "product_density": p.product_density,
                }
                for p in pfr_record.product_breakdowns
            ],
            
            # Utilities (Consolidated Dict for consumption and price)
            "utilities": {}, 
        }

        # Consolidate Utility Data (Consumption + Price)
        utility_prices = {up.utility.name: up.price_ref_usd_per_unit for up in price_records}
        
        # Dictionary to hold all utility reference data
        utility_ref_data: Dict[str, Any] = {}

        for uc in pfr_record.utility_consumptions:
            u_name = uc.utility.name
            utility_ref_data[u_name] = {
                "consumption_ratio_ref": uc.consumption_ratio_ref_unit_per_kg_fuel,
                "ci_ref_gco2e_per_mj": uc.utility.ci_ref_gco2e_per_mj,
                "energy_content_mj_per_kg": uc.utility.energy_content_mj_per_kg,
                "carbon_content_kg_c_per_kg": uc.utility.carbon_content_kg_c_per_kg,
                "price_ref_usd_per_unit": utility_prices.get(u_name, 0.0),
            }
        
        # Add the consolidated utility data
        data["utilities"] = utility_ref_data
        
        # Add keys expected by economics.py for backward compatibility
        data["yield_biomass"] = default_params_record.feedstock.yield_ref # Changed from "Yield_biomass"
        data["yield_h2"] = utility_ref_data.get("Hydrogen", {}).get("consumption_ratio_ref", 0.0) # Changed from "Yield_H2"
        data["yield_kwh"] = utility_ref_data.get("electricity", {}).get("consumption_ratio_ref", 0.0)

        data["mass_fractions"] = [ # Changed from "MassFractions"
            p["mass_fraction_percent"] / 100.0 
            for p in data["products"]
        ]

        # Final cleanup on backward compatibility keys (Should be removed later)
        data["process_type"] = process_name.upper()
        data["conversion_process_ci"] = {process_name.upper(): default_params_record.ci_process_default_gco2_mj}
        data["process_ratio"] = {process_name.upper(): default_params_record.indirect_opex_tci_ratio * 100}

        return data

    # ------------------------------------------------------------
    # Project CRUD Operations
    # ------------------------------------------------------------

    def create_project(
        self, 
        project_name: str, 
        user_id: UUID,
        initial_process_id: Optional[int] = None,
        initial_feedstock_id: Optional[int] = None, 
        initial_country_id: Optional[int] = None
    ) -> UserProject:
        
        db_project = UserProject(
            project_name=project_name,
            user_id=user_id,
            initial_process_id=initial_process_id,
            initial_feedstock_id=initial_feedstock_id,
            initial_country_id=initial_country_id,
        )
        self.db.add(db_project)
        self.db.commit()
        self.db.refresh(db_project)
        return db_project

    def get_projects_by_user(self, user_id: UUID) -> List[UserProject]:
        """Returns all projects for a given user with related data."""
        stmt = (
            select(UserProject)
            .where(UserProject.user_id == user_id)
            .options(
                joinedload(UserProject.initial_process),
                joinedload(UserProject.initial_feedstock),
                joinedload(UserProject.initial_country),
                joinedload(UserProject.scenarios),
            )
            .order_by(desc(UserProject.updated_at))
        )
        return self.db.execute(stmt).unique().scalars().all()

    def get_project_by_id(self, project_id: UUID) -> Optional[UserProject]:
        """Returns a single project by ID with all related data."""
        stmt = (
            select(UserProject)
            .where(UserProject.id == project_id)
            .options(
                joinedload(UserProject.initial_process),
                joinedload(UserProject.initial_feedstock),
                joinedload(UserProject.initial_country),
                joinedload(UserProject.scenarios).joinedload(Scenario.process),
                joinedload(UserProject.scenarios).joinedload(Scenario.feedstock),
                joinedload(UserProject.scenarios).joinedload(Scenario.country),
            )
        )
        
        return self.db.execute(stmt).unique().scalar_one_or_none()

    def update_project(self, project_id: UUID, update_data: Dict[str, Any]) -> Optional[UserProject]:
        """Update project fields."""
        project = self.db.get(UserProject, project_id)
        if not project:
            return None
            
        for field, value in update_data.items():
            if hasattr(project, field):
                setattr(project, field, value)
        
        project.updated_at = datetime.datetime.utcnow()
        self.db.commit()
        self.db.refresh(project)
        return project

    def delete_project(self, project_id: UUID) -> bool:
        """Delete a project and all its scenarios."""
        project = self.db.get(UserProject, project_id)
        if not project:
            return False
            
        self.db.delete(project)
        self.db.commit()
        return True

    # ------------------------------------------------------------
    # Scenario CRUD Operations
    # ------------------------------------------------------------

    def create_scenario(self, scenario_data: Dict[str, Any]) -> Scenario:
        """Create a new scenario."""
        
        # Determine scenario order if not provided
        if scenario_data.get('scenario_order') is None:
            existing_scenarios = self.db.execute(
                select(Scenario)
                .where(Scenario.project_id == scenario_data['project_id'])
                .order_by(desc(Scenario.scenario_order))
            ).scalars().first()
            
            scenario_data['scenario_order'] = (existing_scenarios.scenario_order + 1) if existing_scenarios else 1
        
        db_scenario = Scenario(**scenario_data)
        self.db.add(db_scenario)
        
        # Update parent project timestamp
        parent_project = self.db.get(UserProject, scenario_data['project_id'])
        if parent_project:
            parent_project.updated_at = datetime.datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(db_scenario)
        return db_scenario

    def get_scenario_by_id(self, scenario_id: UUID) -> Optional[Scenario]:
        """Get scenario by ID with all related data."""
        stmt = (
            select(Scenario)
            .where(Scenario.id == scenario_id)
            .options(
                joinedload(Scenario.project),
                joinedload(Scenario.process),
                joinedload(Scenario.feedstock),
                joinedload(Scenario.country),
            )
        )
        return self.db.execute(stmt).unique().scalar_one_or_none()

    def get_scenarios_by_project(self, project_id: UUID) -> List[Scenario]:
        """Get all scenarios for a project."""
        stmt = (
            select(Scenario)
            .where(Scenario.project_id == project_id)
            .options(
                joinedload(Scenario.process),
                joinedload(Scenario.feedstock),
                joinedload(Scenario.country),
            )
            .order_by(Scenario.scenario_order)
        )
        return self.db.execute(stmt).unique().scalars().all()

    def update_scenario(self, scenario_id: UUID, update_data: Dict[str, Any]) -> Optional[Scenario]:
        """Update scenario fields."""
        scenario = self.db.get(Scenario, scenario_id)
        if not scenario:
            return None
            
        for field, value in update_data.items():
            if hasattr(scenario, field):
                setattr(scenario, field, value)
        
        scenario.updated_at = datetime.datetime.utcnow()
        
        # Update parent project timestamp
        if scenario.project:
            scenario.project.updated_at = datetime.datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(scenario)
        return scenario

    def delete_scenario(self, scenario_id: UUID) -> bool:
        """Delete a scenario."""
        scenario = self.db.get(Scenario, scenario_id)
        if not scenario:
            return False
            
        # Update parent project timestamp before deletion
        if scenario.project:
            scenario.project.updated_at = datetime.datetime.utcnow()
            
        self.db.delete(scenario)
        self.db.commit()
        return True

    def run_scenario_calculation(self, scenario_id: UUID, calculation_results: Dict[str, Any]) -> Optional[Scenario]:
        """Update scenario with calculation results."""
        scenario = self.db.get(Scenario, scenario_id)
        if not scenario:
            return None
            
        scenario.techno_economics = calculation_results.get('techno_economics', {})
        scenario.financial_analysis = calculation_results.get('financials', {})
        scenario.updated_at = datetime.datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(scenario)
        return scenario

    # ------------------------------------------------------------
    # Unit Conversion Operations
    # ------------------------------------------------------------

    def get_unit_conversion_factor(self, unit_name: str) -> Optional[dict]:
        """
        Fetches the conversion factor and unit group info based on the unit name.
        """
        stmt_explicit_factor = (
            select(
                UnitConversion.conversion_factor,
                UnitOfMeasure.unit_group_id,
                UnitGroup.base_unit_name,
            )
            .join(UnitOfMeasure, UnitConversion.unit_id == UnitOfMeasure.id)
            .join(UnitGroup, UnitOfMeasure.unit_group_id == UnitGroup.id)
            .where(UnitOfMeasure.name == unit_name)
        )
        
        result = self.db.execute(stmt_explicit_factor).one_or_none()
        
        if result:
            return {
                'conversion_factor': result[0],
                'unit_group_id': result[1],
                'base_unit_name': result[2]
            }
        
        # Check if unit exists as base unit
        stmt_base_unit_check = (
            select(
                UnitOfMeasure.unit_group_id,
                UnitGroup.base_unit_name,
            )
            .join(UnitGroup, UnitOfMeasure.unit_group_id == UnitGroup.id)
            .where(UnitOfMeasure.name == unit_name)
        )
        base_check_result = self.db.execute(stmt_base_unit_check).one_or_none()
        
        if base_check_result:
            return {
                'conversion_factor': 1.0, 
                'unit_group_id': base_check_result[0],
                'base_unit_name': base_check_result[1]
            }
        
        return None
    
    def get_all_units_for_conversion(self) -> List[UnitOfMeasure]:
        """
        Returns all units of measure with group and conversion data.
        """
        stmt = (
            select(UnitOfMeasure)
            .options(
                joinedload(UnitOfMeasure.group),
                joinedload(UnitOfMeasure.conversion)
            )
            .order_by(UnitOfMeasure.unit_group_id, UnitOfMeasure.name)
        )
        return self.db.execute(stmt).unique().scalars().all()