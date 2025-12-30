# app/services/traceable_layer4.py

"""
Layer 4 Traceable Calculations

Handles final KPI calculations (Total OPEX, LCOP, Total Emissions).
Based on the implementation plan Phase 2.5 (Layer 4).

Note: These are enhanced versions that build upon Layer 1-3 calculations.
"""

from typing import Dict
from app.models.traceable_value import TraceableValue, ComponentValue, CalculationStep
from app.models.calculation_data import UserInputs


class TraceableLayer4:
    """
    Layer 4 traceable calculations for final KPIs.

    This class creates traceable outputs for:
    - Total OPEX (Direct + Indirect OPEX)
    - LCOP (Levelized Cost of Production)
    - Total CO2 Emissions
    """

    def __init__(self, inputs: UserInputs):
        """
        Initialize Layer 4 traceable calculator.

        Args:
            inputs: User input parameters containing economic data
        """
        self.inputs = inputs

    def create_total_opex_traceable(self, techno: dict) -> TraceableValue:
        """
        Create traceable Total OPEX with inputs and calculation steps.

        Formula: Total_OPEX = Direct_OPEX + Indirect_OPEX

        Args:
            techno: Technical economics results dictionary

        Returns:
            TraceableValue with complete calculation breakdown
        """
        total_opex = techno.get("total_opex", 0)
        opex_breakdown = techno.get("opex_breakdown", {})

        feedstock_cost = opex_breakdown.get("feedstock", 0)
        hydrogen_cost = opex_breakdown.get("hydrogen", 0)
        electricity_cost = opex_breakdown.get("electricity", 0)
        indirect_opex = opex_breakdown.get("indirect_opex", 0)

        # Calculate direct OPEX
        direct_opex = feedstock_cost + hydrogen_cost + electricity_cost

        components = [
            ComponentValue(
                name="Direct OPEX",
                value=direct_opex,
                unit="USD/year",
                description="Sum of feedstock, hydrogen, and electricity costs"
            ),
            ComponentValue(
                name="Feedstock Cost",
                value=feedstock_cost,
                unit="USD/year",
                description="Annual feedstock procurement cost"
            ),
            ComponentValue(
                name="Hydrogen Cost",
                value=hydrogen_cost,
                unit="USD/year",
                description="Annual hydrogen utility cost"
            ),
            ComponentValue(
                name="Electricity Cost",
                value=electricity_cost,
                unit="USD/year",
                description="Annual electricity utility cost"
            ),
            ComponentValue(
                name="Indirect OPEX",
                value=indirect_opex,
                unit="USD/year",
                description="Indirect operating expenses (maintenance, labor, overhead)"
            )
        ]

        inputs = {
            "direct_opex": {"value": direct_opex, "unit": "USD/year"},
            "feedstock_cost": {"value": feedstock_cost, "unit": "USD/year"},
            "hydrogen_cost": {"value": hydrogen_cost, "unit": "USD/year"},
            "electricity_cost": {"value": electricity_cost, "unit": "USD/year"},
            "indirect_opex": {"value": indirect_opex, "unit": "USD/year"}
        }

        calculation_steps = [
            CalculationStep(
                step=1,
                description="Calculate Direct OPEX (sum of variable costs)",
                formula="direct_opex = feedstock_cost + hydrogen_cost + electricity_cost",
                calculation=f"{feedstock_cost:,.0f} + {hydrogen_cost:,.0f} + {electricity_cost:,.0f} = {direct_opex:,.0f}",
                result={"value": direct_opex, "unit": "USD/year"}
            ),
            CalculationStep(
                step=2,
                description="Add Indirect OPEX (fixed costs)",
                formula="total_opex = direct_opex + indirect_opex",
                calculation=f"{direct_opex:,.0f} + {indirect_opex:,.0f} = {total_opex:,.0f}",
                result={"value": total_opex, "unit": "USD/year"}
            )
        ]

        formula = "Total_OPEX = Direct_OPEX + Indirect_OPEX = (Feedstock + H2 + Electricity) + Indirect"

        metadata = {
            "direct_opex_usd_year": direct_opex,
            "indirect_opex_usd_year": indirect_opex,
            "indirect_opex_ratio": self.inputs.economic_parameters.indirect_opex_tci_ratio,
            "annual_load_hours": self.inputs.conversion_plant.annual_load_hours,
            "note": "Direct OPEX represents variable costs, Indirect OPEX represents fixed costs"
        }

        return TraceableValue(
            name="Total Operating Expenses",
            value=total_opex,
            unit="USD/year",
            formula=formula,
            inputs=inputs,
            calculation_steps=calculation_steps,
            components=components,
            metadata=metadata
        )

    def create_lcop_traceable(self, techno: dict, financials: dict) -> TraceableValue:
        """
        Create traceable LCOP with comprehensive inputs and 5-step calculation breakdown.

        Formula: LCOP = (TCI_annual + OPEX_total - Revenue_byproducts) / SAF_production

        Args:
            techno: Technical economics results dictionary
            financials: Financial analysis results dictionary

        Returns:
            TraceableValue with complete calculation breakdown
        """
        lcop = techno.get("LCOP", 0)
        tci = techno.get("total_capital_investment", 0)
        total_opex = techno.get("total_opex", 0)
        total_revenue = techno.get("total_revenue", 0)
        production = techno.get("production", 0)

        # Calculate annualized TCI
        discount_rate = self.inputs.economic_parameters.discount_rate_percent / 100
        lifetime = self.inputs.economic_parameters.project_lifetime_years

        # Step-by-step calculations
        tci_usd = tci * 1_000_000  # Convert MUSD to USD

        # Capital Recovery Factor
        if discount_rate > 0:
            one_plus_r_n = (1 + discount_rate) ** lifetime
            crf = (discount_rate * one_plus_r_n) / (one_plus_r_n - 1)
        else:
            crf = 1 / lifetime

        tci_annual = tci_usd * crf
        numerator = tci_annual + total_opex - total_revenue
        lcop_calculated = numerator / production if production > 0 else 0

        components = [
            ComponentValue(
                name="Annualized TCI",
                value=tci_annual,
                unit="USD/year",
                description="Total capital investment annualized using capital recovery factor"
            ),
            ComponentValue(
                name="Total Operating Expenses",
                value=total_opex,
                unit="USD/year",
                description="Total annual operating expenses (direct + indirect)"
            ),
            ComponentValue(
                name="Byproduct Revenue",
                value=total_revenue,
                unit="USD/year",
                description="Revenue from byproducts (diesel, naphtha, etc.)"
            ),
            ComponentValue(
                name="SAF Production",
                value=production,
                unit="t/year",
                description="Annual production of sustainable aviation fuel"
            )
        ]

        inputs = {
            "tci": {"value": tci, "unit": "MUSD"},
            "total_opex": {"value": total_opex, "unit": "USD/year"},
            "total_revenue": {"value": total_revenue, "unit": "USD/year"},
            "production": {"value": production, "unit": "t/year"},
            "discount_rate": {"value": discount_rate, "unit": "ratio"},
            "project_lifetime": {"value": lifetime, "unit": "years"}
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
                description="Calculate Capital Recovery Factor",
                formula="CRF = r(1+r)^n / ((1+r)^n - 1)",
                calculation=f"{discount_rate}(1+{discount_rate})^{lifetime} / ((1+{discount_rate})^{lifetime} - 1) = {crf:.6f}",
                result={"value": crf, "unit": "dimensionless"},
                details={
                    "(1+r)^n": f"{one_plus_r_n:.4f}" if discount_rate > 0 else "N/A",
                    "numerator": f"{discount_rate * one_plus_r_n:.6f}" if discount_rate > 0 else "N/A",
                    "denominator": f"{one_plus_r_n - 1:.4f}" if discount_rate > 0 else "N/A",
                    "crf": f"{crf:.6f}"
                }
            ),
            CalculationStep(
                step=3,
                description="Calculate annualized TCI",
                formula="tci_annual = tci_usd × CRF",
                calculation=f"{tci_usd:,.0f} × {crf:.6f} = {tci_annual:,.2f}",
                result={"value": tci_annual, "unit": "USD/year"}
            ),
            CalculationStep(
                step=4,
                description="Calculate numerator (total annual cost)",
                formula="numerator = tci_annual + opex - revenue",
                calculation=f"{tci_annual:,.2f} + {total_opex:,.0f} - {total_revenue:,.0f} = {numerator:,.2f}",
                result={"value": numerator, "unit": "USD/year"}
            ),
            CalculationStep(
                step=5,
                description="Calculate LCOP",
                formula="lcop = numerator / production",
                calculation=f"{numerator:,.2f} / {production:,.0f} = {lcop_calculated:.2f}",
                result={"value": lcop, "unit": "USD/t"}
            )
        ]

        metadata = {
            "discount_rate_percent": self.inputs.economic_parameters.discount_rate_percent,
            "project_lifetime_years": lifetime,
            "capital_recovery_factor": crf,
            "npv_usd": financials.get("npv", 0),
            "irr_percent": financials.get("irr", 0),
            "payback_period_years": financials.get("payback_period", 0)
        }

        formula = "LCOP = (TCI_annual + OPEX_total - Revenue_byproducts) / SAF_production"

        return TraceableValue(
            name="Levelized Cost of Production",
            value=lcop,
            unit="USD/t",
            formula=formula,
            inputs=inputs,
            calculation_steps=calculation_steps,
            components=components,
            metadata=metadata
        )

    def create_total_emissions_traceable(self, techno: dict) -> TraceableValue:
        """
        Create traceable Total CO2 Emissions with inputs and calculation steps.

        Formula: Total_CO2 = Carbon_Intensity × Fuel_Energy_Content × Production

        Args:
            techno: Technical economics results dictionary

        Returns:
            TraceableValue with complete calculation breakdown
        """
        total_emissions = techno.get("total_co2_emissions", 0)
        product_emissions = techno.get("product_co2_emissions", {})
        production = techno.get("production", 0)
        carbon_intensity = techno.get("carbon_intensity", 0)
        fuel_energy_content = techno.get("fuel_energy_content", 0)

        components = []
        for product_name, emissions_value in product_emissions.items():
            components.append(
                ComponentValue(
                    name=f"{product_name.upper()} Emissions",
                    value=emissions_value,
                    unit="tons CO2e/year",
                    description=f"Annual CO2 emissions from {product_name} production"
                )
            )

        inputs = {
            "carbon_intensity": {"value": carbon_intensity, "unit": "gCO2e/MJ"},
            "fuel_energy_content": {"value": fuel_energy_content, "unit": "MJ/kg"},
            "production": {"value": production, "unit": "tons/year"}
        }

        # Calculation steps
        production_kg = production * 1000  # Convert tons to kg
        total_co2_g = carbon_intensity * fuel_energy_content * production_kg
        total_co2_tons = total_co2_g / 1_000_000

        calculation_steps = [
            CalculationStep(
                step=1,
                description="Convert production to kg",
                formula="production_kg = production × 1000",
                calculation=f"{production:,.0f} × 1000 = {production_kg:,.0f}",
                result={"value": production_kg, "unit": "kg/year"}
            ),
            CalculationStep(
                step=2,
                description="Calculate total CO2 emissions in grams",
                formula="total_co2_g = carbon_intensity × fuel_energy_content × production_kg",
                calculation=f"{carbon_intensity:.4f} × {fuel_energy_content:.3f} × {production_kg:,.0f} = {total_co2_g:,.0f}",
                result={"value": total_co2_g, "unit": "gCO2e/year"}
            ),
            CalculationStep(
                step=3,
                description="Convert to tons CO2e/year",
                formula="total_co2_tons = total_co2_g / 1,000,000",
                calculation=f"{total_co2_g:,.0f} / 1,000,000 = {total_co2_tons:,.2f}",
                result={"value": total_co2_tons, "unit": "tons CO2e/year"}
            )
        ]

        formula = "Total_CO2 = Carbon_Intensity × Fuel_Energy_Content × Production"

        metadata = {
            "carbon_intensity_gco2_mj": carbon_intensity,
            "fuel_energy_content_mj_kg": fuel_energy_content,
            "total_production_tons_year": production,
            "total_emissions_gco2e_year": total_emissions,
            "total_emissions_tons_year": total_co2_tons,
            "calculation_detail": f"{carbon_intensity:.4f} gCO2e/MJ × {fuel_energy_content:.3f} MJ/kg × {production_kg:,.0f} kg/year"
        }

        return TraceableValue(
            name="Total CO2 Emissions",
            value=total_emissions,
            unit="gCO2e/year",
            formula=formula,
            inputs=inputs,
            calculation_steps=calculation_steps,
            components=components,
            metadata=metadata
        )
