# app/traceable/layer3.py

"""
Layer 3 Traceable Calculations

Handles aggregation calculations for Direct OPEX and Weighted Carbon Intensity.
Based on the implementation plan Phase 2.4 (Layer 3).

Calculations:
- Total Direct OPEX (sum of feedstock, hydrogen, electricity costs)
- Weighted Carbon Intensity (per product or total)
"""

from typing import Dict
from app.traceable.models import TraceableValue, ComponentValue, CalculationStep
from app.models.calculation_data import UserInputs


class TraceableLayer3:
    """
    Layer 3 traceable calculations for aggregation metrics.

    This class creates traceable outputs for:
    - Total Direct OPEX (sum of feedstock, hydrogen, electricity costs)
    - Weighted Carbon Intensity (per product or total)
    """

    def __init__(self, inputs: UserInputs):
        """
        Initialize Layer 3 traceable calculator.

        Args:
            inputs: User input parameters containing economic and utility data
        """
        self.inputs = inputs

    def create_direct_opex_traceable(self, techno: dict) -> TraceableValue:
        """
        Create traceable Total Direct OPEX with inputs and calculation steps.

        Formula: Total_Direct_OPEX = Feedstock_Cost + Hydrogen_Cost + Electricity_Cost

        Args:
            techno: Technical economics results dictionary

        Returns:
            TraceableValue with complete calculation breakdown
        """
        opex_breakdown = techno.get("opex_breakdown", {})

        feedstock_cost = opex_breakdown.get("feedstock", 0)
        hydrogen_cost = opex_breakdown.get("hydrogen", 0)
        electricity_cost = opex_breakdown.get("electricity", 0)

        # Calculate total direct OPEX
        total_direct_opex = feedstock_cost + hydrogen_cost + electricity_cost

        inputs = {
            "feedstock_cost": {"value": feedstock_cost, "unit": "USD/year"},
            "hydrogen_cost": {"value": hydrogen_cost, "unit": "USD/year"},
            "electricity_cost": {"value": electricity_cost, "unit": "USD/year"}
        }

        components = [
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
            )
        ]

        calculation_steps = [
            CalculationStep(
                step=1,
                description="Sum all direct operating costs",
                formula="direct_opex = feedstock_cost + hydrogen_cost + electricity_cost",
                calculation=f"{feedstock_cost:,.0f} + {hydrogen_cost:,.0f} + {electricity_cost:,.0f} = {total_direct_opex:,.0f}",
                result={"value": total_direct_opex, "unit": "USD/year"}
            )
        ]

        formula = "Total_Direct_OPEX = Feedstock_Cost + Hydrogen_Cost + Electricity_Cost"

        metadata = {
            "feedstock_cost_usd_year": feedstock_cost,
            "hydrogen_cost_usd_year": hydrogen_cost,
            "electricity_cost_usd_year": electricity_cost,
            "note": "Direct OPEX represents variable costs that scale with production"
        }

        return TraceableValue(
            name="Total Direct OPEX",
            value=total_direct_opex,
            unit="USD/year",
            formula=formula,
            inputs=inputs,
            calculation_steps=calculation_steps,
            components=components,
            metadata=metadata
        )

    def create_weighted_carbon_intensity_traceable(self, techno: dict) -> TraceableValue:
        """
        Create traceable Weighted Carbon Intensity with inputs and calculation steps.

        For single feedstock: Weighted_CI = Σ(CI_i × Product_Yield_i)
        For multi-feedstock: Uses total carbon intensity directly

        Args:
            techno: Technical economics results dictionary

        Returns:
            TraceableValue with per-product CI contribution breakdown
        """
        total_ci = techno.get("carbon_intensity", 0)
        ci_breakdown = techno.get("carbon_intensity_breakdown", {})
        product_breakdown = techno.get("product_breakdown", {})
        total_production = techno.get("production", 0)
        fuel_energy_content = techno.get("fuel_energy_content", 0)

        # Get individual CI components
        ci_feedstock = ci_breakdown.get("feedstock", 0)
        ci_hydrogen = ci_breakdown.get("hydrogen", 0)
        ci_electricity = ci_breakdown.get("electricity", 0)
        ci_process = ci_breakdown.get("process", 0)

        components = []
        calculation_steps = []
        step_num = 1

        # Check if multi-feedstock scenario
        is_multi_feedstock = len(self.inputs.feedstock_data) > 1

        if is_multi_feedstock:
            # Multi-feedstock: use total CI directly
            inputs = {
                "ci_feedstock": {"value": ci_feedstock, "unit": "gCO2e/MJ"},
                "ci_hydrogen": {"value": ci_hydrogen, "unit": "gCO2e/MJ"},
                "ci_electricity": {"value": ci_electricity, "unit": "gCO2e/MJ"},
                "ci_process": {"value": ci_process, "unit": "gCO2e/MJ"},
                "scenario": {"value": "multi-feedstock", "unit": "text"}
            }

            components = [
                ComponentValue(
                    name="Feedstock CI",
                    value=ci_feedstock,
                    unit="gCO2e/MJ",
                    description="Carbon intensity from feedstock"
                ),
                ComponentValue(
                    name="Hydrogen CI",
                    value=ci_hydrogen,
                    unit="gCO2e/MJ",
                    description="Carbon intensity from hydrogen"
                ),
                ComponentValue(
                    name="Electricity CI",
                    value=ci_electricity,
                    unit="gCO2e/MJ",
                    description="Carbon intensity from electricity"
                ),
                ComponentValue(
                    name="Process CI",
                    value=ci_process,
                    unit="gCO2e/MJ",
                    description="Carbon intensity from process"
                )
            ]

            calculation_steps = [
                CalculationStep(
                    step=1,
                    description="Sum all CI components (multi-feedstock scenario)",
                    formula="weighted_ci = ci_feedstock + ci_hydrogen + ci_electricity + ci_process",
                    calculation=f"{ci_feedstock:.4f} + {ci_hydrogen:.4f} + {ci_electricity:.4f} + {ci_process:.4f} = {total_ci:.4f}",
                    result={"value": total_ci, "unit": "gCO2e/MJ"}
                )
            ]

            formula = "Weighted_CI = CI_feedstock + CI_hydrogen + CI_electricity + CI_process (multi-feedstock)"

        else:
            # Single feedstock: calculate per-product weighted contribution
            product_ci_data = []
            weighted_ci_sum = 0

            # Build per-product CI inputs
            inputs = {
                "total_ci": {"value": total_ci, "unit": "gCO2e/MJ"},
                "products": []
            }

            for product_name, production_value in product_breakdown.items():
                product_yield = production_value / total_production if total_production > 0 else 0

                # Each product contributes to weighted CI based on its yield
                product_ci_contribution = total_ci * product_yield
                weighted_ci_sum += product_ci_contribution

                product_ci_data.append({
                    "name": product_name.upper(),
                    "yield": product_yield,
                    "ci_contribution": product_ci_contribution
                })

                inputs["products"].append({
                    "name": product_name,
                    "yield": {"value": product_yield, "unit": "dimensionless"},
                    "ci_contribution": {"value": product_ci_contribution, "unit": "gCO2e/MJ"}
                })

                components.append(
                    ComponentValue(
                        name=f"{product_name.upper()} CI Contribution",
                        value=product_ci_contribution,
                        unit="gCO2e/MJ",
                        description=f"CI contribution from {product_name} ({product_yield*100:.1f}% yield)"
                    )
                )

                calculation_steps.append(
                    CalculationStep(
                        step=step_num,
                        description=f"Calculate {product_name.upper()} CI contribution",
                        formula=f"ci_contribution_{product_name} = total_ci × yield_{product_name}",
                        calculation=f"{total_ci:.4f} × {product_yield:.4f} = {product_ci_contribution:.4f}",
                        result={"value": product_ci_contribution, "unit": "gCO2e/MJ"}
                    )
                )
                step_num += 1

            # Add final sum step
            calculation_steps.append(
                CalculationStep(
                    step=step_num,
                    description="Sum all product CI contributions",
                    formula="weighted_ci = Σ(ci_contribution_i)",
                    calculation=f"Sum of all products = {weighted_ci_sum:.4f}",
                    result={"value": total_ci, "unit": "gCO2e/MJ"}
                )
            )

            formula = "Weighted_CI = Σ(CI_total × Product_Yield_i)"

        metadata = {
            "total_carbon_intensity_gco2e_mj": total_ci,
            "fuel_energy_content_mj_kg": fuel_energy_content,
            "is_multi_feedstock": is_multi_feedstock,
            "product_count": len(product_breakdown),
            "products": list(product_breakdown.keys())
        }

        return TraceableValue(
            name="Weighted Carbon Intensity",
            value=total_ci,
            unit="gCO2e/MJ",
            formula=formula,
            inputs=inputs,
            calculation_steps=calculation_steps,
            components=components,
            metadata=metadata
        )
