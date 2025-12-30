# app/services/traceable_layer2.py

"""
Layer 2 Traceable Calculations

Handles OPEX cost calculations (indirect, feedstock, hydrogen, electricity).
Based on the implementation plan Phase 2.3 (Layer 2).
"""

from typing import Dict
from app.models.traceable_value import TraceableValue, ComponentValue, CalculationStep
from app.models.calculation_data import UserInputs


class TraceableLayer2:
    """
    Layer 2 traceable calculations for OPEX cost components.

    This class creates traceable outputs for:
    - Total Indirect OPEX
    - Feedstock Cost
    - Hydrogen Cost
    - Electricity Cost
    """

    def __init__(self, inputs: UserInputs):
        """
        Initialize Layer 2 traceable calculator.

        Args:
            inputs: User input parameters containing economic and utility data
        """
        self.inputs = inputs

    def create_indirect_opex_traceable(self, techno: dict) -> TraceableValue:
        """
        Create traceable Total Indirect OPEX with inputs and calculation steps.

        Formula: Total_Indirect_OPEX = Indirect_OPEX_Ratio × TCI × 1,000,000

        Args:
            techno: Technical economics results dictionary

        Returns:
            TraceableValue with complete calculation breakdown
        """
        opex_breakdown = techno.get("opex_breakdown", {})
        indirect_opex = opex_breakdown.get("indirect_opex", 0)

        tci = techno.get("total_capital_investment", 0)
        indirect_opex_ratio = self.inputs.economic_parameters.indirect_opex_tci_ratio

        # Calculation steps
        tci_usd = tci * 1_000_000
        indirect_opex_calculated = indirect_opex_ratio * tci_usd

        inputs = {
            "indirect_opex_ratio": {"value": indirect_opex_ratio, "unit": "dimensionless"},
            "tci": {"value": tci, "unit": "MUSD"}
        }

        calculation_steps = [
            CalculationStep(
                step=1,
                description="Convert TCI to USD",
                formula="tci_usd = tci × 1,000,000",
                calculation=f"{tci} × 1,000,000 = {tci_usd:,.0f}",
                result={"value": tci_usd, "unit": "USD"}
            ),
            CalculationStep(
                step=2,
                description="Calculate indirect OPEX",
                formula="indirect_opex = ratio × tci_usd",
                calculation=f"{indirect_opex_ratio} × {tci_usd:,.0f} = {indirect_opex_calculated:,.0f}",
                result={"value": indirect_opex, "unit": "USD/year"}
            )
        ]

        formula = "Total_Indirect_OPEX = Indirect_OPEX_Ratio × TCI × 1,000,000"

        metadata = {
            "indirect_opex_ratio": indirect_opex_ratio,
            "tci_musd": tci,
            "note": "Indirect OPEX includes maintenance, labor, overhead, and other fixed costs"
        }

        return TraceableValue(
            name="Total Indirect OPEX",
            value=indirect_opex,
            unit="USD/year",
            formula=formula,
            inputs=inputs,
            calculation_steps=calculation_steps,
            components=[],
            metadata=metadata
        )

    def create_feedstock_cost_traceable(self, techno: dict) -> TraceableValue:
        """
        Create traceable Feedstock Cost with inputs and calculation steps.

        Formula: Feedstock_Cost = Feedstock_Consumption × Feedstock_Price

        Args:
            techno: Technical economics results dictionary

        Returns:
            TraceableValue with complete calculation breakdown
        """
        opex_breakdown = techno.get("opex_breakdown", {})
        feedstock_cost = opex_breakdown.get("feedstock", 0)

        feedstock_consumption = techno.get("feedstock_consumption", 0)

        # Get feedstock price from feedstock_data (first feedstock)
        feedstock_price = 0.0
        feedstock_name = "Unknown"
        if self.inputs.feedstock_data and len(self.inputs.feedstock_data) > 0:
            feedstock_price = self.inputs.feedstock_data[0].price.value
            feedstock_name = self.inputs.feedstock_data[0].name

        inputs = {
            "feedstock_consumption": {"value": feedstock_consumption, "unit": "tons/year"},
            "feedstock_price": {"value": feedstock_price, "unit": "USD/t"}
        }

        calculation_steps = [
            CalculationStep(
                step=1,
                description="Calculate feedstock cost",
                formula="cost = consumption × price",
                calculation=f"{feedstock_consumption:,.0f} × {feedstock_price} = {feedstock_cost:,.0f}",
                result={"value": feedstock_cost, "unit": "USD/year"}
            )
        ]

        formula = "Feedstock_Cost = Feedstock_Consumption × Feedstock_Price"

        metadata = {
            "feedstock_name": feedstock_name,
            "feedstock_consumption_tons_year": feedstock_consumption,
            "feedstock_price_usd_t": feedstock_price
        }

        return TraceableValue(
            name="Feedstock Cost",
            value=feedstock_cost,
            unit="USD/year",
            formula=formula,
            inputs=inputs,
            calculation_steps=calculation_steps,
            components=[],
            metadata=metadata
        )

    def create_hydrogen_cost_traceable(self, techno: dict) -> TraceableValue:
        """
        Create traceable Hydrogen Cost with inputs and calculation steps.

        Formula: Hydrogen_Cost = Hydrogen_Consumption × Hydrogen_Price

        Args:
            techno: Technical economics results dictionary

        Returns:
            TraceableValue with complete calculation breakdown
        """
        opex_breakdown = techno.get("opex_breakdown", {})
        hydrogen_cost = opex_breakdown.get("hydrogen", 0)

        hydrogen_consumption = techno.get("utility_consumption", {}).get("hydrogen", 0)

        # Get hydrogen price from utility_data
        hydrogen_price = 0.0
        hydrogen_price_note = ""
        for util in self.inputs.utility_data:
            if util.name.lower() == "hydrogen":
                hydrogen_price = util.price.value
                # Check if price might be in USD/kg and needs conversion
                if hydrogen_price < 100:  # Likely USD/kg
                    hydrogen_price_note = f"Original price {hydrogen_price} USD/kg converted to {hydrogen_price * 1000} USD/t (× 1000)"
                    hydrogen_price = hydrogen_price * 1000
                break

        inputs = {
            "hydrogen_consumption": {"value": hydrogen_consumption, "unit": "tons/year"},
            "hydrogen_price": {
                "value": hydrogen_price,
                "unit": "USD/t",
                "note": hydrogen_price_note if hydrogen_price_note else "Price in USD/t"
            }
        }

        calculation_steps = [
            CalculationStep(
                step=1,
                description="Calculate hydrogen cost",
                formula="cost = consumption × price",
                calculation=f"{hydrogen_consumption:,.0f} × {hydrogen_price} = {hydrogen_cost:,.0f}",
                result={"value": hydrogen_cost, "unit": "USD/year"}
            )
        ]

        formula = "Hydrogen_Cost = Hydrogen_Consumption × Hydrogen_Price"

        metadata = {
            "hydrogen_consumption_tons_year": hydrogen_consumption,
            "hydrogen_price_usd_t": hydrogen_price
        }

        if hydrogen_price_note:
            metadata["price_conversion"] = hydrogen_price_note

        return TraceableValue(
            name="Hydrogen Cost",
            value=hydrogen_cost,
            unit="USD/year",
            formula=formula,
            inputs=inputs,
            calculation_steps=calculation_steps,
            components=[],
            metadata=metadata
        )

    def create_electricity_cost_traceable(self, techno: dict) -> TraceableValue:
        """
        Create traceable Electricity Cost with inputs and calculation steps.

        Formula: Electricity_Cost = Electricity_Consumption × Electricity_Rate

        Args:
            techno: Technical economics results dictionary

        Returns:
            TraceableValue with complete calculation breakdown
        """
        opex_breakdown = techno.get("opex_breakdown", {})
        electricity_cost = opex_breakdown.get("electricity", 0)

        electricity_consumption_kwh = techno.get("utility_consumption", {}).get("electricity", 0)
        electricity_consumption_mwh = electricity_consumption_kwh / 1000

        # Get electricity price/rate from utility_data
        electricity_rate = 0.0
        for util in self.inputs.utility_data:
            if util.name.lower() == "electricity":
                electricity_rate = util.price.value
                # Assume price is in USD/MWh if > 1, otherwise convert from USD/kWh
                if electricity_rate < 1:
                    electricity_rate = electricity_rate * 1000  # Convert USD/kWh to USD/MWh
                break

        inputs = {
            "electricity_consumption": {"value": electricity_consumption_mwh, "unit": "MWh/year"},
            "electricity_rate": {"value": electricity_rate, "unit": "USD/MWh"}
        }

        calculation_steps = [
            CalculationStep(
                step=1,
                description="Calculate electricity cost",
                formula="cost = consumption × rate",
                calculation=f"{electricity_consumption_mwh:,.0f} × {electricity_rate} = {electricity_cost:,.0f}",
                result={"value": electricity_cost, "unit": "USD/year"}
            )
        ]

        formula = "Electricity_Cost = Electricity_Consumption × Electricity_Rate"

        metadata = {
            "electricity_consumption_mwh_year": electricity_consumption_mwh,
            "electricity_consumption_kwh_year": electricity_consumption_kwh,
            "electricity_rate_usd_mwh": electricity_rate
        }

        return TraceableValue(
            name="Electricity Cost",
            value=electricity_cost,
            unit="USD/year",
            formula=formula,
            inputs=inputs,
            calculation_steps=calculation_steps,
            components=[],
            metadata=metadata
        )
