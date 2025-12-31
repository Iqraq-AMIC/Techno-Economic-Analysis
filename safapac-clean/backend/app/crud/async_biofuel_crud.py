# app/crud/async_biofuel_crud.py

import datetime
import logging
from datetime import timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from sqlalchemy import select, and_, desc
from typing import List, Dict, Any, Optional
from uuid import UUID

# --- ORM MODEL IMPORTS ---
from app.models.master_data import (
    ProcessFeedstockRef, ProcessTechnology, Feedstock, ProcessUtilityConsumptionRef, ProductReferenceBreakdown,
    Utility, Country, DefaultParameterSet, Product, UtilityCountryPriceDefaults
)
from app.models.unit_mgmt import (
    UnitConversion, UnitGroup, UnitOfMeasure
)
from app.models.user_project import User, UserProject, Scenario

logger = logging.getLogger(__name__)

# -----------------------------------------------------------------------------
# Master Data Cache (P4 Optimization)
# -----------------------------------------------------------------------------
# Simple in-memory cache for master data that rarely changes.
# This reduces database queries by ~80% for frequently accessed data.

_master_data_cache: Dict[str, Any] = {}
_cache_timestamp: Optional[datetime.datetime] = None
CACHE_DURATION = timedelta(hours=1)  # Cache TTL


def invalidate_master_data_cache():
    """Invalidate the master data cache. Call this when master data is updated."""
    global _master_data_cache, _cache_timestamp
    _master_data_cache = {}
    _cache_timestamp = None
    logger.info("Master data cache invalidated")


def get_cache_status() -> Dict[str, Any]:
    """Get current cache status for monitoring."""
    global _cache_timestamp
    now = datetime.datetime.utcnow()
    is_valid = _cache_timestamp and (now - _cache_timestamp) < CACHE_DURATION

    return {
        "is_cached": bool(_master_data_cache),
        "is_valid": is_valid,
        "cached_at": _cache_timestamp.isoformat() if _cache_timestamp else None,
        "expires_at": (_cache_timestamp + CACHE_DURATION).isoformat() if _cache_timestamp else None,
        "ttl_seconds": (CACHE_DURATION - (now - _cache_timestamp)).total_seconds() if is_valid else 0,
    }


class AsyncBiofuelCRUD:
    """Async version of BiofuelCRUD for non-blocking database operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ------------------------------------------------------------
    # Master Data Read Operations (Async)
    # ------------------------------------------------------------
    async def get_process_technologies(self) -> List[ProcessTechnology]:
        result = await self.db.execute(select(ProcessTechnology))
        return list(result.scalars().all())

    async def get_feedstocks(self) -> List[Feedstock]:
        result = await self.db.execute(select(Feedstock))
        return list(result.scalars().all())

    async def get_countries(self) -> List[Country]:
        result = await self.db.execute(select(Country))
        return list(result.scalars().all())

    async def get_utilities(self) -> List[Utility]:
        result = await self.db.execute(select(Utility))
        return list(result.scalars().all())

    async def get_products(self) -> List[Product]:
        result = await self.db.execute(select(Product))
        return list(result.scalars().all())

    async def get_all_master_data(self, use_cache: bool = True) -> Dict[str, List]:
        """
        Get all master data in one call for frontend initialization.

        Uses in-memory caching (P4 optimization) to reduce database queries.
        Cache TTL is 1 hour.

        Args:
            use_cache: If True, return cached data if available. Default True.
        """
        global _master_data_cache, _cache_timestamp

        # Check cache validity
        now = datetime.datetime.utcnow()
        if use_cache and _cache_timestamp and (now - _cache_timestamp) < CACHE_DURATION:
            logger.debug("Returning cached master data")
            return _master_data_cache

        # Fetch fresh data from database
        logger.info("Fetching fresh master data from database")
        processes = await self.get_process_technologies()
        feedstocks = await self.get_feedstocks()
        countries = await self.get_countries()
        utilities = await self.get_utilities()
        products = await self.get_products()
        units = await self.get_all_units_for_conversion()

        # Build response data
        data = {
            "processes": processes,
            "feedstocks": feedstocks,
            "countries": countries,
            "utilities": utilities,
            "products": products,
            "units": units,
        }

        # Update cache
        _master_data_cache = data
        _cache_timestamp = now
        logger.info("Master data cache updated")

        return data

    # ------------------------------------------------------------
    # Core Reference Data Read Operations (Async)
    # ------------------------------------------------------------

    async def get_project_reference_data(self, process_id: int, feedstock_id: int, country_id: int) -> Optional[Dict[str, Any]]:
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
                    ProcessTechnology.id == process_id,
                    Feedstock.id == feedstock_id,
                    Country.id == country_id
                )
            )
            .options(
                joinedload(DefaultParameterSet.process),
                joinedload(DefaultParameterSet.country),
                joinedload(DefaultParameterSet.feedstock),
            )
        )
        result = await self.db.execute(stmt)
        default_params_record = result.scalar_one_or_none()

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
        pfr_result = await self.db.execute(pfr_stmt)
        pfr_record = pfr_result.unique().scalar_one_or_none()

        # 3. Get Country-specific Utility Prices
        price_stmt = (
            select(UtilityCountryPriceDefaults)
            .where(UtilityCountryPriceDefaults.country_id == default_params_record.country_id)
            .options(joinedload(UtilityCountryPriceDefaults.utility))
        )
        price_result = await self.db.execute(price_stmt)
        price_records = list(price_result.scalars().all())

        # 4. Consolidate into a flat dictionary
        data: Dict[str, Any] = {
            # Default Parameters
            "process_technology": default_params_record.process.name,
            "feedstock_name": default_params_record.feedstock.name,
            "country_name": default_params_record.country.name,
            "tci_ref": default_params_record.tci_ref_musd,
            "capacity_ref": default_params_record.plant_capacity_ktpa_ref,
            "ci_process_default_gco2_mj": default_params_record.ci_process_default_gco2_mj,
            "project_lifetime_years": default_params_record.project_lifetime_years,
            "discount_rate_percent": default_params_record.discount_rate_percent,
            "tci_scaling_exponent": default_params_record.tci_scaling_exponent,
            "working_capital_tci_ratio": default_params_record.working_capital_tci_ratio,
            "indirect_opex_tci_ratio": default_params_record.indirect_opex_tci_ratio,
            "annual_load_hours_ref": default_params_record.annual_load_hours_ref,
            "p_steps": default_params_record.p_steps,
            "nnp_steps": default_params_record.nnp_steps,

            "process_type": process_id,
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
        data["yield_biomass"] = default_params_record.feedstock.yield_ref
        data["yield_h2"] = utility_ref_data.get("Hydrogen", {}).get("consumption_ratio_ref", 0.0)
        data["yield_kwh"] = utility_ref_data.get("electricity", {}).get("consumption_ratio_ref", 0.0)

        data["mass_fractions"] = [
            p["mass_fraction_percent"] / 100.0
            for p in data["products"]
        ]

        # Final cleanup on backward compatibility keys
        data["process_type"] = process_id
        data["process_ratio"] = {process_id: default_params_record.indirect_opex_tci_ratio * 100}

        return data

    # ------------------------------------------------------------
    # Project CRUD Operations (Async)
    # ------------------------------------------------------------

    async def create_project(
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
        await self.db.commit()
        await self.db.refresh(db_project)
        return db_project

    async def get_projects_by_user(self, user_id: UUID) -> List[UserProject]:
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
        result = await self.db.execute(stmt)
        return list(result.unique().scalars().all())

    async def get_project_by_id(self, project_id: UUID) -> Optional[UserProject]:
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

        result = await self.db.execute(stmt)
        return result.unique().scalar_one_or_none()

    async def update_project(self, project_id: UUID, update_data: Dict[str, Any]) -> Optional[UserProject]:
        """Update project fields."""
        result = await self.db.execute(
            select(UserProject).where(UserProject.id == project_id)
        )
        project = result.scalar_one_or_none()
        if not project:
            return None

        for field, value in update_data.items():
            if hasattr(project, field):
                setattr(project, field, value)

        project.updated_at = datetime.datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(project)
        return project

    async def delete_project(self, project_id: UUID) -> bool:
        """Delete a project and all its scenarios."""
        result = await self.db.execute(
            select(UserProject).where(UserProject.id == project_id)
        )
        project = result.scalar_one_or_none()
        if not project:
            return False

        await self.db.delete(project)
        await self.db.commit()
        return True

    # ------------------------------------------------------------
    # Scenario CRUD Operations (Async)
    # ------------------------------------------------------------

    async def create_scenario(self, scenario_data: Dict[str, Any]) -> Scenario:
        """Create a new scenario."""

        # Determine scenario order if not provided
        if scenario_data.get('scenario_order') is None:
            result = await self.db.execute(
                select(Scenario)
                .where(Scenario.project_id == scenario_data['project_id'])
                .order_by(desc(Scenario.scenario_order))
            )
            existing_scenarios = result.scalars().first()
            scenario_data['scenario_order'] = (existing_scenarios.scenario_order + 1) if existing_scenarios else 1

        db_scenario = Scenario(**scenario_data)
        self.db.add(db_scenario)

        # Update parent project timestamp
        result = await self.db.execute(
            select(UserProject).where(UserProject.id == scenario_data['project_id'])
        )
        parent_project = result.scalar_one_or_none()
        if parent_project:
            parent_project.updated_at = datetime.datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(db_scenario)
        return db_scenario

    async def get_scenario_by_id(self, scenario_id: UUID) -> Optional[Scenario]:
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
        result = await self.db.execute(stmt)
        return result.unique().scalar_one_or_none()

    async def get_scenarios_by_project(self, project_id: UUID) -> List[Scenario]:
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
        result = await self.db.execute(stmt)
        return list(result.unique().scalars().all())

    async def update_scenario(self, scenario_id: UUID, update_data: Dict[str, Any]) -> Optional[Scenario]:
        """Update scenario fields."""
        stmt = (
            select(Scenario)
            .where(Scenario.id == scenario_id)
            .options(joinedload(Scenario.project))
        )
        result = await self.db.execute(stmt)
        scenario = result.unique().scalar_one_or_none()
        if not scenario:
            return None

        for field, value in update_data.items():
            if hasattr(scenario, field):
                setattr(scenario, field, value)

        scenario.updated_at = datetime.datetime.utcnow()

        # Update parent project timestamp
        if scenario.project:
            scenario.project.updated_at = datetime.datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(scenario)
        return scenario

    async def delete_scenario(self, scenario_id: UUID) -> bool:
        """Delete a scenario."""
        stmt = (
            select(Scenario)
            .where(Scenario.id == scenario_id)
            .options(joinedload(Scenario.project))
        )
        result = await self.db.execute(stmt)
        scenario = result.unique().scalar_one_or_none()
        if not scenario:
            return False

        # Update parent project timestamp before deletion
        if scenario.project:
            scenario.project.updated_at = datetime.datetime.utcnow()

        await self.db.delete(scenario)
        await self.db.commit()
        return True

    async def run_scenario_calculation(self, scenario_id: UUID, calculation_results: Dict[str, Any]) -> Optional[Scenario]:
        """Update scenario with calculation results."""
        result = await self.db.execute(
            select(Scenario).where(Scenario.id == scenario_id)
        )
        scenario = result.scalar_one_or_none()
        if not scenario:
            return None

        scenario.techno_economics = calculation_results.get('techno_economics', {})
        scenario.financial_analysis = calculation_results.get('financials', {})
        scenario.updated_at = datetime.datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(scenario)
        return scenario

    # ------------------------------------------------------------
    # Unit Conversion Operations (Async)
    # ------------------------------------------------------------

    async def get_unit_conversion_factor(self, unit_name: str) -> Optional[dict]:
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

        result = await self.db.execute(stmt_explicit_factor)
        row = result.one_or_none()

        if row:
            return {
                'conversion_factor': row[0],
                'unit_group_id': row[1],
                'base_unit_name': row[2]
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
        base_result = await self.db.execute(stmt_base_unit_check)
        base_check_result = base_result.one_or_none()

        if base_check_result:
            return {
                'conversion_factor': 1.0,
                'unit_group_id': base_check_result[0],
                'base_unit_name': base_check_result[1]
            }

        return None

    async def get_all_units_for_conversion(self) -> List[UnitOfMeasure]:
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
        result = await self.db.execute(stmt)
        return list(result.unique().scalars().all())

    async def update_scenario_core_parameters(self, scenario_id: UUID,
                                              process_name: str,
                                              feedstock_name: str,
                                              country_name: str) -> bool:
        """
        Look up IDs for the given names and update the scenario's foreign keys.
        This ensures the SQL columns match the JSON payload.
        """
        # 1. Resolve Process ID
        process_result = await self.db.execute(
            select(ProcessTechnology).where(ProcessTechnology.name == process_name)
        )
        process = process_result.scalar_one_or_none()

        # 2. Resolve Feedstock ID
        feedstock_result = await self.db.execute(
            select(Feedstock).where(Feedstock.name == feedstock_name)
        )
        feedstock = feedstock_result.scalar_one_or_none()

        # 3. Resolve Country ID
        country_result = await self.db.execute(
            select(Country).where(Country.name == country_name)
        )
        country = country_result.scalar_one_or_none()

        if not process or not feedstock or not country:
            return False

        # 4. Update the Scenario Record
        scenario_result = await self.db.execute(
            select(Scenario).where(Scenario.id == scenario_id)
        )
        scenario = scenario_result.scalar_one_or_none()
        if scenario:
            scenario.process_id = process.id
            scenario.feedstock_id = feedstock.id
            scenario.country_id = country.id
            scenario.updated_at = datetime.datetime.utcnow()

            await self.db.commit()
            await self.db.refresh(scenario)
            return True

        return False
