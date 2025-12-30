# app/services/traceable_layer1.py

"""
Layer 1 Traceable Calculations

Handles core parameter calculations for consumption, production, and conversion metrics.
Based on the implementation plan Phase 2.2 (Layer 1).
"""

from typing import Dict
from app.models.traceable_value import TraceableValue, ComponentValue, CalculationStep
from app.models.calculation_data import UserInputs


class TraceableLayer1:
    """
    Layer 1 traceable calculations for consumption and production metrics.

    This class creates traceable outputs for:
    - Feedstock Consumption
    - Hydrogen Consumption
    - Electricity Consumption
    - Carbon Conversion Efficiency (per product)
    - Weighted Fuel Energy Content
    """

    def __init__(self, inputs: UserInputs):
        """
        Initialize Layer 1 traceable calculator.

        Args:
            inputs: User input parameters containing conversion plant and feedstock data
        """
        self.inputs = inputs

    def create_feedstock_consumption_traceable(self, techno: dict) -> TraceableValue:
        """
        Create traceable Feedstock Consumption with inputs and calculation steps.

        Formula: Feedstock_Consumption = Plant_Capacity × Feedstock_Yield

        Args:
            techno: Technical economics results dictionary

        Returns:
            TraceableValue with complete calculation breakdown
        """
        feedstock_consumption = techno.get("feedstock_consumption", 0)
        plant_capacity = techno.get("production", 0)

        # Get feedstock yield from techno results (already calculated in feature_calculations)
        feedstock_yield = techno.get("feedstock_yield", 1.21)  # Default to 1.21 kg/kg if not present

        inputs = {
            "plant_capacity": {"value": plant_capacity, "unit": "tons/year"},
            "feedstock_yield": {"value": feedstock_yield, "unit": "kg feedstock/kg fuel"}
        }

        calculation_steps = [
            CalculationStep(
                step=1,
                description="Calculate feedstock consumption",
                formula="consumption = plant_capacity × feedstock_yield",
                calculation=f"{plant_capacity:,.0f} × {feedstock_yield} = {feedstock_consumption:,.0f}",
                result={"value": feedstock_consumption, "unit": "tons/year"}
            )
        ]

        formula = "Feedstock_Consumption = Plant_Capacity × Feedstock_Yield"

        metadata = {
            "feedstock_yield_kg_per_kg": feedstock_yield,
            "plant_capacity_tons_year": plant_capacity
        }

        return TraceableValue(
            name="Feedstock Consumption",
            value=feedstock_consumption,
            unit="tons/year",
            formula=formula,
            inputs=inputs,
            calculation_steps=calculation_steps,
            components=[],
            metadata=metadata
        )

    def create_hydrogen_consumption_traceable(self, techno: dict) -> TraceableValue:
        """
        Create traceable Hydrogen Consumption with inputs and calculation steps.

        Formula: Hydrogen_Consumption = Plant_Capacity × Yield_H2

        Args:
            techno: Technical economics results dictionary

        Returns:
            TraceableValue with complete calculation breakdown
        """
        hydrogen_consumption = techno.get("utility_consumption", {}).get("hydrogen", 0)
        plant_capacity = techno.get("production", 0)

        # Get hydrogen yield from utility data
        # Find hydrogen in utility_data list
        yield_h2 = 0.042  # Default value
        for util in self.inputs.utility_data:
            if util.name.lower() == "hydrogen":
                yield_h2 = util.yield_percent if util.yield_percent <= 1.0 else util.yield_percent / 100.0
                break

        inputs = {
            "plant_capacity": {"value": plant_capacity, "unit": "tons/year"},
            "yield_h2": {"value": yield_h2, "unit": "t H2/t fuel"}
        }

        calculation_steps = [
            CalculationStep(
                step=1,
                description="Calculate hydrogen consumption",
                formula="consumption = plant_capacity × yield_h2",
                calculation=f"{plant_capacity:,.0f} × {yield_h2} = {hydrogen_consumption:,.0f}",
                result={"value": hydrogen_consumption, "unit": "tons/year"}
            )
        ]

        formula = "Hydrogen_Consumption = Plant_Capacity × Yield_H2"

        metadata = {
            "yield_h2_t_per_t": yield_h2,
            "plant_capacity_tons_year": plant_capacity
        }

        return TraceableValue(
            name="Hydrogen Consumption",
            value=hydrogen_consumption,
            unit="tons/year",
            formula=formula,
            inputs=inputs,
            calculation_steps=calculation_steps,
            components=[],
            metadata=metadata
        )

    def create_electricity_consumption_traceable(self, techno: dict) -> TraceableValue:
        """
        Create traceable Electricity Consumption with inputs and calculation steps.

        Formula: Electricity_Consumption = Plant_Capacity × Yield_MWh

        Note: Backend internally calculates in kWh but converts to MWh for user-facing output.

        Args:
            techno: Technical economics results dictionary

        Returns:
            TraceableValue with complete calculation breakdown
        """
        electricity_consumption_kwh = techno.get("utility_consumption", {}).get("electricity", 0)
        plant_capacity = techno.get("production", 0)

        # Convert kWh to MWh for user-facing output
        electricity_consumption_mwh = electricity_consumption_kwh / 1000

        # Get electricity yield from utility data
        # Find electricity in utility_data list
        yield_kwh = 120.0  # Default value in kWh/t
        for util in self.inputs.utility_data:
            if util.name.lower() == "electricity":
                yield_kwh = util.yield_percent if util.yield_percent <= 1.0 else util.yield_percent / 100.0
                # Note: The yield_percent for electricity is actually stored in different units
                # We might need to calculate it from consumption / capacity
                break

        # If we have actual consumption and capacity, calculate yield from that
        if plant_capacity > 0:
            yield_kwh = electricity_consumption_kwh / plant_capacity

        yield_mwh = yield_kwh / 1000

        inputs = {
            "plant_capacity": {"value": plant_capacity, "unit": "tons/year"},
            "yield_mwh": {"value": yield_mwh, "unit": "MWh/t fuel"}
        }

        calculation_steps = [
            CalculationStep(
                step=1,
                description="Calculate electricity consumption",
                formula="consumption = plant_capacity × yield_mwh",
                calculation=f"{plant_capacity:,.0f} × {yield_mwh} = {electricity_consumption_mwh:,.0f}",
                result={"value": electricity_consumption_mwh, "unit": "MWh/year"}
            )
        ]

        formula = "Electricity_Consumption = Plant_Capacity × Yield_MWh"

        metadata = {
            "yield_kwh_per_t": yield_kwh,
            "yield_mwh_per_t": yield_mwh,
            "plant_capacity_tons_year": plant_capacity,
            "note": "Backend internally calculates in kWh but converts to MWh for user-facing output"
        }

        return TraceableValue(
            name="Electricity Consumption",
            value=electricity_consumption_mwh,
            unit="MWh/year",
            formula=formula,
            inputs=inputs,
            calculation_steps=calculation_steps,
            components=[],
            metadata=metadata
        )

    def create_carbon_conversion_efficiency_traceable(self, techno: dict) -> TraceableValue:
        """
        Create traceable Carbon Conversion Efficiency (per product) with calculation steps.

        Formula: CCE (%) = (CC_product × Yield_product) / (CC_feedstock × Yield_feedstock) × 100

        Args:
            techno: Technical economics results dictionary

        Returns:
            TraceableValue with per-product CCE calculation breakdown
        """
        product_cce = techno.get("product_carbon_conversion_efficiency", {})
        product_breakdown = techno.get("product_breakdown", {})

        # Get feedstock data from techno results
        feedstock_yield = techno.get("feedstock_yield", 1.21)

        # Get feedstock carbon content from feedstock_data (first feedstock)
        feedstock_carbon_content = 0.78  # Default value
        if self.inputs.feedstock_data and len(self.inputs.feedstock_data) > 0:
            feedstock_carbon_content = self.inputs.feedstock_data[0].carbon_content

        components = []
        calculation_steps = []
        step_num = 1

        # Typical carbon content values for products (kg C/kg)
        # These should ideally come from product database
        product_carbon_content_map = {
            "jet": 0.847,
            "diesel": 0.857,
            "naphtha": 0.837,
            "gasoline": 0.847
        }

        # Calculate CCE for each product
        for product_name, cce_value in product_cce.items():
            production = product_breakdown.get(product_name, 0)
            total_production = techno.get("production", 0)
            product_yield = production / total_production if total_production > 0 else 0

            # Get product carbon content
            product_carbon_content = product_carbon_content_map.get(product_name.lower(), 0.847)

            # Calculate numerator and denominator
            numerator = product_carbon_content * product_yield
            denominator = feedstock_carbon_content * feedstock_yield
            cce_calculated = (numerator / denominator * 100) if denominator > 0 else 0

            components.append(
                ComponentValue(
                    name=f"{product_name.upper()} CCE",
                    value=cce_value,
                    unit="percent",
                    description=f"Carbon conversion efficiency for {product_name}"
                )
            )

            calculation_steps.append(
                CalculationStep(
                    step=step_num,
                    description=f"Calculate numerator (carbon in {product_name})",
                    formula="numerator = CC_product × Yield_product",
                    calculation=f"{product_carbon_content} × {product_yield:.4f} = {numerator:.5f}",
                    result={"value": numerator, "unit": "kg C"}
                )
            )
            step_num += 1

            calculation_steps.append(
                CalculationStep(
                    step=step_num,
                    description="Calculate denominator (carbon in feedstock)",
                    formula="denominator = CC_feedstock × Yield_feedstock",
                    calculation=f"{feedstock_carbon_content} × {feedstock_yield} = {denominator:.4f}",
                    result={"value": denominator, "unit": "kg C"}
                )
            )
            step_num += 1

            calculation_steps.append(
                CalculationStep(
                    step=step_num,
                    description=f"Calculate {product_name.upper()} CCE percentage",
                    formula="CCE = (numerator / denominator) × 100",
                    calculation=f"({numerator:.5f} / {denominator:.4f}) × 100 = {cce_calculated:.3f}",
                    result={"value": cce_value, "unit": "percent"}
                )
            )
            step_num += 1

        # Get average CCE
        avg_cce = sum(product_cce.values()) / len(product_cce) if product_cce else 0

        inputs = {
            "carbon_content_feedstock": {"value": feedstock_carbon_content, "unit": "kg C/kg"},
            "yield_feedstock": {"value": feedstock_yield, "unit": "kg feedstock/kg fuel"}
        }

        formula = "CCE (%) = (CC_product × Yield_product) / (CC_feedstock × Yield_feedstock) × 100"

        metadata = {
            "products": list(product_cce.keys()),
            "average_cce_percent": avg_cce,
            "product_carbon_content_map": product_carbon_content_map
        }

        return TraceableValue(
            name="Carbon Conversion Efficiency",
            value=avg_cce,
            unit="percent",
            formula=formula,
            inputs=inputs,
            calculation_steps=calculation_steps,
            components=components,
            metadata=metadata
        )

    def create_fuel_energy_content_traceable(self, techno: dict) -> TraceableValue:
        """
        Create traceable Weighted Fuel Energy Content with calculation steps.

        Formula: Fuel_Energy_Content = Σ(Energy_Content_i × Mass_Fraction_i)

        Args:
            techno: Technical economics results dictionary

        Returns:
            TraceableValue with product-by-product energy contribution breakdown
        """
        fuel_energy_content = techno.get("fuel_energy_content", 0)
        product_breakdown = techno.get("product_breakdown", {})
        total_production = techno.get("production", 0)

        components = []
        calculation_steps = []
        step_num = 1
        cumulative_energy = 0

        # Energy content values (MJ/kg) - typical values for products
        energy_content_map = {
            "jet": 43.8,
            "diesel": 42.6,
            "naphtha": 43.4,
            "gasoline": 43.5
        }

        products_data = []

        for product_name, production_value in product_breakdown.items():
            mass_fraction = production_value / total_production if total_production > 0 else 0
            energy_content = energy_content_map.get(product_name.lower(), 43.0)

            contribution = energy_content * mass_fraction
            cumulative_energy += contribution

            products_data.append({
                "name": product_name.upper(),
                "energy_content": {"value": energy_content, "unit": "MJ/kg"},
                "mass_fraction": {"value": mass_fraction, "unit": "dimensionless"}
            })

            components.append(
                ComponentValue(
                    name=f"{product_name.upper()} Contribution",
                    value=contribution,
                    unit="MJ/kg",
                    description=f"Energy contribution from {product_name} ({mass_fraction*100:.1f}% by mass)"
                )
            )

            calculation_steps.append(
                CalculationStep(
                    step=step_num,
                    description=f"Calculate contribution from {product_name.upper()}",
                    formula=f"contribution_{product_name} = EC_{product_name} × MF_{product_name}",
                    calculation=f"{energy_content} × {mass_fraction:.4f} = {contribution:.3f}",
                    result={"value": contribution, "unit": "MJ/kg"}
                )
            )
            step_num += 1

        # Add final sum step
        calculation_steps.append(
            CalculationStep(
                step=step_num,
                description="Sum all contributions",
                formula="fuel_energy_content = Σ(contributions)",
                calculation=f"Sum of all products = {cumulative_energy:.3f}",
                result={"value": fuel_energy_content, "unit": "MJ/kg"}
            )
        )

        inputs = {
            "products": products_data
        }

        formula = "Fuel_Energy_Content = Σ(Energy_Content_i × Mass_Fraction_i)"

        metadata = {
            "product_count": len(product_breakdown),
            "products": list(product_breakdown.keys()),
            "energy_content_map": energy_content_map
        }

        return TraceableValue(
            name="Weighted Fuel Energy Content",
            value=fuel_energy_content,
            unit="MJ/kg",
            formula=formula,
            inputs=inputs,
            calculation_steps=calculation_steps,
            components=components,
            metadata=metadata
        )
