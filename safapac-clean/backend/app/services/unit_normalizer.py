# app/services/unit_normalizer.py

"""
Unit Normalization Service

Converts all user inputs from their specified units to base units before processing.
This ensures all calculations use consistent units internally.
"""

import logging
from typing import Dict, List
from app.crud.biofuel_crud import BiofuelCRUD
from app.models.calculation_data import (
    UserInputs, Quantity, ProductData, FeedstockData, UtilityData
)

logger = logging.getLogger(__name__)


class UnitNormalizer:
    """
    Normalizes user inputs to base units using conversion factors from the database.

    Base units are defined per unit group:
    - Mass: kg
    - Energy: MJ
    - Volume: L
    - etc.
    """

    def __init__(self, crud: BiofuelCRUD):
        self.crud = crud
        self._conversion_cache: Dict[int, float] = {}
        self._load_conversion_factors()

    def _load_conversion_factors(self):
        """Load all conversion factors from database into cache."""
        try:
            units = self.crud.get_all_units_for_conversion()
            for unit in units:
                if unit.conversion and unit.conversion.conversion_factor:
                    self._conversion_cache[unit.id] = unit.conversion.conversion_factor
            logger.info(f"Loaded {len(self._conversion_cache)} unit conversion factors")
        except Exception as e:
            logger.error(f"Failed to load conversion factors: {e}", exc_info=True)
            raise

    def get_conversion_factor(self, unit_id: int) -> float:
        """Get conversion factor for a unit ID."""
        if unit_id not in self._conversion_cache:
            logger.warning(f"Unit ID {unit_id} not found in conversion cache. Using 1.0")
            return 1.0
        return self._conversion_cache[unit_id]

    def normalize_quantity(self, quantity: Quantity) -> float:
        """
        Convert a Quantity to its base unit value.

        Args:
            quantity: Quantity with value and unit_id

        Returns:
            float: Value in base units
        """
        conversion_factor = self.get_conversion_factor(quantity.unit_id)
        normalized_value = quantity.value * conversion_factor

        logger.debug(
            f"Normalized: {quantity.value} (unit {quantity.unit_id}) "
            f"→ {normalized_value} (base unit) [factor: {conversion_factor}]"
        )

        return normalized_value

    def normalize_user_inputs(self, user_inputs: UserInputs) -> UserInputs:
        """
        Normalize all Quantity fields in UserInputs to base units.

        This creates a new UserInputs object with all values converted to base units.
        Original unit_ids are preserved for reference but values are normalized.

        Args:
            user_inputs: Original user inputs with mixed units

        Returns:
            UserInputs: Normalized inputs with all values in base units
        """
        logger.info("Starting unit normalization for user inputs")

        # Normalize conversion plant
        normalized_plant_capacity = Quantity(
            value=self.normalize_quantity(user_inputs.conversion_plant.plant_capacity),
            unit_id=user_inputs.conversion_plant.plant_capacity.unit_id
        )

        from app.models.calculation_data import ConversionPlant
        normalized_conversion_plant = ConversionPlant(
            plant_capacity=normalized_plant_capacity,
            annual_load_hours=user_inputs.conversion_plant.annual_load_hours,
            ci_process_default=user_inputs.conversion_plant.ci_process_default
        )

        # Normalize feedstock data
        normalized_feedstock_data = []
        for feedstock in user_inputs.feedstock_data:
            normalized_feedstock = FeedstockData(
                name=feedstock.name,
                price=Quantity(
                    value=self.normalize_quantity(feedstock.price),
                    unit_id=feedstock.price.unit_id
                ),
                carbon_content=feedstock.carbon_content,
                carbon_intensity=Quantity(
                    value=self.normalize_quantity(feedstock.carbon_intensity),
                    unit_id=feedstock.carbon_intensity.unit_id
                ),
                energy_content=feedstock.energy_content,
                yield_percent=feedstock.yield_percent
            )
            normalized_feedstock_data.append(normalized_feedstock)

        # Normalize utility data
        normalized_utility_data = []
        for utility in user_inputs.utility_data:
            normalized_utility = UtilityData(
                name=utility.name,
                price=Quantity(
                    value=self.normalize_quantity(utility.price),
                    unit_id=utility.price.unit_id
                ),
                carbon_content=utility.carbon_content,
                carbon_intensity=Quantity(
                    value=self.normalize_quantity(utility.carbon_intensity),
                    unit_id=utility.carbon_intensity.unit_id
                ),
                energy_content=utility.energy_content,
                yield_percent=utility.yield_percent
            )
            normalized_utility_data.append(normalized_utility)

        # Normalize product data
        normalized_product_data = []
        for product in user_inputs.product_data:
            normalized_product = ProductData(
                name=product.name,
                price=Quantity(
                    value=self.normalize_quantity(product.price),
                    unit_id=product.price.unit_id
                ),
                price_sensitivity_to_ci=product.price_sensitivity_to_ci,
                carbon_content=product.carbon_content,
                energy_content=product.energy_content,
                yield_percent=product.yield_percent,
                product_density=product.product_density
            )
            normalized_product_data.append(normalized_product)

        # Create normalized UserInputs
        normalized_inputs = UserInputs(
            process_id=user_inputs.process_id,
            feedstock_id=user_inputs.feedstock_id,
            country_id=user_inputs.country_id,
            conversion_plant=normalized_conversion_plant,
            economic_parameters=user_inputs.economic_parameters,  # No quantities to normalize
            feedstock_data=normalized_feedstock_data,
            utility_data=normalized_utility_data,
            product_data=normalized_product_data
        )

        logger.info("Unit normalization completed successfully")
        return normalized_inputs
