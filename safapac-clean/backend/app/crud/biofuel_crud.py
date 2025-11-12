# app/crud/biofuel_crud.py (UPDATED)

import datetime
from sqlalchemy.orm import Session, joinedload, aliased
from sqlalchemy import select, func, and_
from typing import List, Dict, Any, Optional
from uuid import UUID

# Import ORM models
from app.models.biofuel_model import (
    ProcessTechnology, Feedstock, UnitConversion, UnitGroup, UnitOfMeasure, Utility, Country,
    ProcessFeedstockRef, ProcessUtilityConsumptionRef,
    Product, ProductReferenceBreakdown, UtilityCountryPriceDefaults,
    DefaultParameterSet, User, UserProject, ProjectAnalysisRun
)

# Pydantic Schemas for data transfer (assuming you have them)
from app.schemas.biofuel_schema import ProjectCreate, ProjectUpdate, RunCreate

class BiofuelCRUD:
    def __init__(self, db: Session):
        self.db = db

    # ------------------------------------------------------------
    # Master Data Read Operations
    # ------------------------------------------------------------
    def get_process_technologies(self) -> List[ProcessTechnology]:
        return self.db.execute(select(ProcessTechnology)).scalars().all()

    def get_countries(self) -> List[Country]:
        return self.db.execute(select(Country)).scalars().all()
    
    # ... (other master data getters)

    # ------------------------------------------------------------
    # Core Reference Data Read Operations (COMPREHENSIVE FETCHER)
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
                joinedload(ProcessFeedstockRef.product_breakdown)
            )
        )
        pfr_record = self.db.execute(pfr_stmt).scalar_one_or_none()

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
            "Process Technology": default_params_record.process.name,
            "Feedstock": Feedstock.name, # Feedstock name must be fetched explicitly
            "Country": default_params_record.country.name,
            "TCI_ref": default_params_record.tci_ref_musd,
            "Capacity_ref": default_params_record.plant_capacity_ktpa_ref,
            "ci_process_default_gco2_mj": default_params_record.ci_process_default_gco2_mj,
            "project_lifetime_years": default_params_record.project_lifetime_years,
            "discount_rate_percent": default_params_record.discount_rate_percent,
            "tci_scaling_exponent": default_params_record.tci_scaling_exponent,
            "working_capital_tci_ratio": default_params_record.working_capital_tci_ratio,
            "indirect_opex_tci_ratio": default_params_record.indirect_opex_tci_ratio,
            "annual_load_hours_ref": default_params_record.annual_load_hours_ref,
            "P_steps": default_params_record.p_steps,
            "Nnp_steps": default_params_record.nnp_steps,
            
            # Process/Feedstock Ref Data
            "average_product_density_ref": pfr_record.average_product_density_ref,
            
            # Products (List of Dicts)
            "products": [
                {
                    "name": p.name,
                    "mass_fraction_percent": p.product_yield_ref * 100, # Use product_yield_ref as mass fraction
                    "energy_content_mj_per_kg": p.energy_content_mj_per_kg,
                    "carbon_content_kg_c_per_kg": p.carbon_content_kg_c_per_kg,
                    "price_ref_usd_per_unit": p.price_ref_usd_per_unit,
                    "price_sensitivity_ref": p.price_sensitivity_ref,
                    "product_density": p.product_density,
                }
                for p in pfr_record.product_breakdown
            ],
            
            # Utilities (Consolidated Dict for consumption and price)
            "utilities": {}, 
        }

        # Consolidate Utility Data (Consumption + Price)
        utility_prices = {up.utility.name: up.price_ref_usd_per_unit for up in price_records}
        
        for uc in pfr_record.utility_consumptions:
            u_name = uc.utility.name
            data["utilities"][u_name] = {
                "consumption_ratio_ref": uc.consumption_ratio_ref_unit_per_kg_fuel,
                "ci_ref_gco2e_per_mj": uc.utility.ci_ref_gco2e_per_mj,
                "energy_content_mj_per_kg": uc.utility.energy_content_mj_per_kg,
                "carbon_content_kg_c_per_kg": uc.utility.carbon_content_kg_c_per_kg,
                "price_ref_usd_per_unit": utility_prices.get(u_name, 0.0), # Fallback price
            }
        
        return data

    # ------------------------------------------------------------
    # Project CRUD Operations (NEW)
    # ------------------------------------------------------------

    def create_project(
        self, 
        project_name: str, 
        user_id: UUID, 
        # CHANGE: Accept IDs directly
        process_id: int, 
        feedstock_id: int, 
        country_id: int
    ) -> UserProject:
        
        db_project = UserProject(
            project_name=project_name,
            user_id=user_id,
            process_id=process_id, # Use ID directly
            feedstock_id=feedstock_id, # Use ID directly
            country_id=country_id, # Use ID directly
        )
        self.db.add(db_project)
        self.db.commit()
        self.db.refresh(db_project)
        return db_project

    def get_projects_by_user(self, user_id: UUID) -> List[UserProject]:
        """Returns all projects for a given user, including process, feedstock, and country."""
        stmt = (
            select(UserProject)
            .where(UserProject.user_id == user_id)
            .options(
                joinedload(UserProject.process),
                joinedload(UserProject.feedstock),
                joinedload(UserProject.country),
            )
            .order_by(UserProject.updated_at.desc())
        )
        return self.db.execute(stmt).scalars().all()

    def get_project_by_id(self, project_id: UUID) -> Optional[UserProject]:
        """Returns a single project by ID, including its analysis runs."""
        stmt = (
            select(UserProject)
            .where(UserProject.id == project_id)
            .options(
                joinedload(UserProject.process),
                joinedload(UserProject.feedstock),
                joinedload(UserProject.country),
                # Load runs and eager load nested data for efficiency
                joinedload(UserProject.analysis_runs)
            )
        )
        
        return self.db.execute(stmt).unique().scalar_one_or_none()
    
    def create_analysis_run(self, db_run: ProjectAnalysisRun) -> ProjectAnalysisRun:
        """Creates a new ProjectAnalysisRun and updates the parent project's timestamp."""
        # 1. Create the run
        self.db.add(db_run)
        
        # 2. Update parent project's timestamp
        parent_project = self.db.query(UserProject).filter(UserProject.id == db_run.project_id).first()
        if parent_project:
            parent_project.updated_at = datetime.datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(db_run)
        return db_run

    # Note: CRUD for Update/Delete are omitted for brevity but should be added later.

    def get_unit_conversion_factor(self, unit_name: str) -> Optional[dict]:
        """
        Fetches the conversion factor and unit group info based on the unit name.

        Handles two cases:
        1. Unit is in unit_conversion table (factor is retrieved).
        2. Unit is a Base Unit (factor is assumed to be 1.0).
        """
        
        # 1. Attempt to find the unit and its explicit conversion factor
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
        
        # 2. If no explicit factor, check if the unit exists and assume a factor of 1.0
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
            # It's a valid unit found in the unit_of_measure table, so it must be a Base Unit.
            return {
                'conversion_factor': 1.0, 
                'unit_group_id': base_check_result[0],
                'base_unit_name': base_check_result[1]
            }
        
        return None # Unit not found in the system
    
    def get_all_units_for_conversion(self) -> List[UnitOfMeasure]:
        """
        Returns all units of measure, eagerly loading their group and conversion factor.
        This provides all data needed for client-side dropdowns and server-side conversion logic.
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