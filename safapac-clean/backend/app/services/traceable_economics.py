# app/services/traceable_economics.py

"""
Traceable Economics Wrapper

Wraps the BiofuelEconomics class to add calculation transparency for key KPIs.
This module converts raw calculation results into TraceableValue objects with
formulas, components, and metadata.
"""

from app.models.traceable_value import TraceableValue, ComponentValue, CalculationStep, create_traceable_value
from app.services.economics import BiofuelEconomics
from app.services.traceable_layer1 import TraceableLayer1
from app.services.traceable_layer2 import TraceableLayer2
from app.services.traceable_layer3 import TraceableLayer3
from app.models.calculation_data import UserInputs
from app.crud.biofuel_crud import BiofuelCRUD


class TraceableEconomics:
    """
    Enhanced economics calculator that provides traceable results.

    This wrapper adds transparency by converting key KPIs (TCI, OPEX, LCOP)
    into TraceableValue objects with formulas and component breakdowns.
    """

    def __init__(self, inputs: UserInputs, crud: BiofuelCRUD):
        self.economics = BiofuelEconomics(inputs, crud)
        self.inputs = inputs
        self.layer1 = TraceableLayer1(inputs)
        self.layer2 = TraceableLayer2(inputs)
        self.layer3 = TraceableLayer3(inputs)

    def run(self, process_id: int, feedstock_id: int, country_id: int, product_key: str = "jet") -> dict:
        """
        Run calculation and return results with traceable key KPIs.

        Returns:
            dict: Results with enhanced techno_economics containing TraceableValue objects
        """
        # Run the standard calculation
        results = self.economics.run(process_id, feedstock_id, country_id, product_key)

        # Extract values for traceability
        techno = results["techno_economics"]

        # Create traceable TCI
        tci_traceable = self._create_tci_traceable(techno)

        # Create traceable OPEX
        opex_traceable = self._create_opex_traceable(techno)

        # Create traceable LCOP
        lcop_traceable = self._create_lcop_traceable(techno, results["financials"])

        # Create traceable Revenue
        revenue_traceable = self._create_revenue_traceable(techno)

        # Create traceable Production
        production_traceable = self._create_production_traceable(techno)

        # Create traceable Carbon Intensity
        carbon_intensity_traceable = self._create_carbon_intensity_traceable(techno)

        # Create traceable Emissions
        emissions_traceable = self._create_emissions_traceable(techno)

        # Create Layer 1 traceable calculations
        feedstock_consumption_traceable = self.layer1.create_feedstock_consumption_traceable(techno)
        hydrogen_consumption_traceable = self.layer1.create_hydrogen_consumption_traceable(techno)
        electricity_consumption_traceable = self.layer1.create_electricity_consumption_traceable(techno)
        carbon_conversion_efficiency_traceable = self.layer1.create_carbon_conversion_efficiency_traceable(techno)
        fuel_energy_content_traceable = self.layer1.create_fuel_energy_content_traceable(techno)

        # Create Layer 2 traceable calculations
        indirect_opex_traceable = self.layer2.create_indirect_opex_traceable(techno)
        feedstock_cost_traceable = self.layer2.create_feedstock_cost_traceable(techno)
        hydrogen_cost_traceable = self.layer2.create_hydrogen_cost_traceable(techno)
        electricity_cost_traceable = self.layer2.create_electricity_cost_traceable(techno)

        # Create Layer 3 traceable calculations
        direct_opex_traceable = self.layer3.create_direct_opex_traceable(techno)
        weighted_carbon_intensity_traceable = self.layer3.create_weighted_carbon_intensity_traceable(techno)

        # Update results with traceable values
        results["techno_economics"]["total_capital_investment_traceable"] = tci_traceable.to_dict()
        results["techno_economics"]["total_opex_traceable"] = opex_traceable.to_dict()
        results["techno_economics"]["LCOP_traceable"] = lcop_traceable.to_dict()
        results["techno_economics"]["total_revenue_traceable"] = revenue_traceable.to_dict()
        results["techno_economics"]["production_traceable"] = production_traceable.to_dict()
        results["techno_economics"]["carbon_intensity_traceable"] = carbon_intensity_traceable.to_dict()
        results["techno_economics"]["total_emissions_traceable"] = emissions_traceable.to_dict()

        # Add Layer 1 traceable outputs
        results["techno_economics"]["feedstock_consumption_traceable"] = feedstock_consumption_traceable.to_dict()
        results["techno_economics"]["hydrogen_consumption_traceable"] = hydrogen_consumption_traceable.to_dict()
        results["techno_economics"]["electricity_consumption_traceable"] = electricity_consumption_traceable.to_dict()
        results["techno_economics"]["carbon_conversion_efficiency_traceable"] = carbon_conversion_efficiency_traceable.to_dict()
        results["techno_economics"]["fuel_energy_content_traceable"] = fuel_energy_content_traceable.to_dict()

        # Add Layer 2 traceable outputs
        results["techno_economics"]["indirect_opex_traceable"] = indirect_opex_traceable.to_dict()
        results["techno_economics"]["feedstock_cost_traceable"] = feedstock_cost_traceable.to_dict()
        results["techno_economics"]["hydrogen_cost_traceable"] = hydrogen_cost_traceable.to_dict()
        results["techno_economics"]["electricity_cost_traceable"] = electricity_cost_traceable.to_dict()

        # Add Layer 3 traceable outputs
        results["techno_economics"]["direct_opex_traceable"] = direct_opex_traceable.to_dict()
        results["techno_economics"]["weighted_carbon_intensity_traceable"] = weighted_carbon_intensity_traceable.to_dict()

        return results

    def _create_tci_traceable(self, techno: dict) -> TraceableValue:
        """Create traceable TCI with comprehensive inputs and calculation steps."""
        tci = techno.get("total_capital_investment", 0)

        # Get economic parameters
        eco_params = self.inputs.economic_parameters
        tci_ref = eco_params.tci_ref_musd
        capacity_ref_ktpa = eco_params.reference_capacity_ktpa
        scaling_exponent = eco_params.tci_scaling_exponent
        working_capital_ratio = eco_params.working_capital_tci_ratio

        # Get capacity from production
        production = techno.get("production", 0)  # tons/year

        # Calculation steps
        capacity_ref_tons = capacity_ref_ktpa * 1000 if capacity_ref_ktpa else production
        ratio = production / capacity_ref_tons if capacity_ref_tons > 0 else 1.0
        scale_factor = ratio ** scaling_exponent
        tci_base = tci_ref * scale_factor if tci_ref else tci
        tci_with_wc = tci_base * (1 + working_capital_ratio)

        components = [
            ComponentValue(
                name="Base TCI",
                value=tci_base,
                unit="MUSD",
                description="Capital investment before working capital"
            ),
            ComponentValue(
                name="Working Capital",
                value=tci_base * working_capital_ratio,
                unit="MUSD",
                description=f"Working capital ({working_capital_ratio*100:.1f}% of base TCI)"
            ),
            ComponentValue(
                name="Total Capital Investment",
                value=tci,
                unit="MUSD",
                description="Total capital investment including working capital"
            )
        ]

        inputs = {
            "tci_ref": {"value": tci_ref, "unit": "MUSD"},
            "capacity": {"value": production, "unit": "tons/year"},
            "capacity_ref": {"value": capacity_ref_tons, "unit": "tons/year"},
            "scaling_exponent": {"value": scaling_exponent, "unit": "dimensionless"},
            "working_capital_ratio": {"value": working_capital_ratio, "unit": "dimensionless"}
        }

        calculation_steps = [
            CalculationStep(
                step=1,
                description="Convert capacity_ref from KTPA to tons/year",
                formula="capacity_ref_tons = capacity_ref × 1000",
                calculation=f"{capacity_ref_ktpa} × 1000 = {capacity_ref_tons:,.0f}",
                result={"value": capacity_ref_tons, "unit": "tons/year"}
            ),
            CalculationStep(
                step=2,
                description="Calculate capacity ratio",
                formula="ratio = capacity / capacity_ref_tons",
                calculation=f"{production:,.0f} / {capacity_ref_tons:,.0f} = {ratio:.4f}",
                result={"value": ratio, "unit": "dimensionless"}
            ),
            CalculationStep(
                step=3,
                description="Apply economy of scale",
                formula="scale_factor = ratio^scaling_exponent",
                calculation=f"{ratio:.4f}^{scaling_exponent} = {scale_factor:.4f}",
                result={"value": scale_factor, "unit": "dimensionless"}
            ),
            CalculationStep(
                step=4,
                description="Calculate base TCI",
                formula="TCI_base = tci_ref × scale_factor",
                calculation=f"{tci_ref} × {scale_factor:.4f} = {tci_base:.2f}",
                result={"value": tci_base, "unit": "MUSD"}
            ),
            CalculationStep(
                step=5,
                description="Add working capital",
                formula="TCI = TCI_base × (1 + working_capital_ratio)",
                calculation=f"{tci_base:.2f} × (1 + {working_capital_ratio}) = {tci_with_wc:.2f}",
                result={"value": tci, "unit": "MUSD"}
            )
        ]

        metadata = {
            "tci_ref_musd": tci_ref,
            "reference_capacity_ktpa": capacity_ref_ktpa,
            "scaling_exponent": scaling_exponent,
            "working_capital_ratio": working_capital_ratio
        }

        formula = "TCI = TCI_ref × (Capacity / Capacity_ref)^scaling_exponent × (1 + working_capital_ratio)"

        return TraceableValue(
            name="Total Capital Investment",
            value=tci,
            unit="MUSD",
            formula=formula,
            inputs=inputs,
            calculation_steps=calculation_steps,
            components=components,
            metadata=metadata
        )

    def _create_opex_traceable(self, techno: dict) -> TraceableValue:
        """Create traceable OPEX with comprehensive inputs and calculation steps."""
        total_opex = techno.get("total_opex", 0)
        opex_breakdown = techno.get("opex_breakdown", {})

        feedstock_cost = opex_breakdown.get("feedstock", 0)
        hydrogen_cost = opex_breakdown.get("hydrogen", 0)
        electricity_cost = opex_breakdown.get("electricity", 0)
        indirect_opex = opex_breakdown.get("indirect_opex", 0)

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
            ),
            ComponentValue(
                name="Indirect OPEX",
                value=indirect_opex,
                unit="USD/year",
                description="Indirect operating expenses (maintenance, labor, overhead)"
            )
        ]

        inputs = {
            "feedstock_cost": {"value": feedstock_cost, "unit": "USD/year"},
            "hydrogen_cost": {"value": hydrogen_cost, "unit": "USD/year"},
            "electricity_cost": {"value": electricity_cost, "unit": "USD/year"},
            "indirect_opex": {"value": indirect_opex, "unit": "USD/year"}
        }

        calculation_steps = [
            CalculationStep(
                step=1,
                description="Sum all direct operating costs",
                formula="direct_opex = feedstock + hydrogen + electricity",
                calculation=f"{feedstock_cost:,.0f} + {hydrogen_cost:,.0f} + {electricity_cost:,.0f} = {feedstock_cost + hydrogen_cost + electricity_cost:,.0f}",
                result={"value": feedstock_cost + hydrogen_cost + electricity_cost, "unit": "USD/year"}
            ),
            CalculationStep(
                step=2,
                description="Add indirect operating expenses",
                formula="total_opex = direct_opex + indirect_opex",
                calculation=f"{feedstock_cost + hydrogen_cost + electricity_cost:,.0f} + {indirect_opex:,.0f} = {total_opex:,.0f}",
                result={"value": total_opex, "unit": "USD/year"}
            )
        ]

        metadata = {
            "indirect_opex_ratio": self.inputs.economic_parameters.indirect_opex_tci_ratio,
            "annual_load_hours": self.inputs.conversion_plant.annual_load_hours
        }

        formula = "Total OPEX = Feedstock_cost + Hydrogen_cost + Electricity_cost + Indirect_OPEX"

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

    def _create_lcop_traceable(self, techno: dict, financials: dict) -> TraceableValue:
        """Create traceable LCOP with comprehensive inputs and 5-step calculation breakdown."""
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
                description="Total annual operating expenses"
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

    def _create_revenue_traceable(self, techno: dict) -> TraceableValue:
        """Create traceable Revenue with comprehensive inputs and calculation steps."""
        total_revenue = techno.get("total_revenue", 0)
        product_revenue_breakdown = techno.get("product_revenue_breakdown", {})
        product_breakdown = techno.get("product_breakdown", {})

        components = []
        inputs = {}
        calculation_steps = []

        step_num = 1
        cumulative_revenue = 0

        for product_name, revenue_value in product_revenue_breakdown.items():
            production = product_breakdown.get(product_name, 0)
            price = revenue_value / production if production > 0 else 0

            components.append(
                ComponentValue(
                    name=f"{product_name.upper()} Revenue",
                    value=revenue_value,
                    unit="USD/year",
                    description=f"Annual revenue from {product_name} sales"
                )
            )

            inputs[f"{product_name}_production"] = {"value": production, "unit": "tons/year"}
            inputs[f"{product_name}_price"] = {"value": price, "unit": "USD/t"}

            cumulative_revenue += revenue_value
            calculation_steps.append(
                CalculationStep(
                    step=step_num,
                    description=f"Calculate {product_name.upper()} revenue",
                    formula=f"revenue_{product_name} = production × price",
                    calculation=f"{production:,.0f} × {price:,.2f} = {revenue_value:,.0f}",
                    result={"value": revenue_value, "unit": "USD/year"}
                )
            )
            step_num += 1

        # Add final sum step
        calculation_steps.append(
            CalculationStep(
                step=step_num,
                description="Sum all product revenues",
                formula="total_revenue = Σ(product_revenues)",
                calculation=f"Sum of all products = {total_revenue:,.0f}",
                result={"value": total_revenue, "unit": "USD/year"}
            )
        )

        formula = "Total_Revenue = Σ(Product_i_Production × Product_i_Price)"

        metadata = {
            "product_count": len(product_revenue_breakdown),
            "products": list(product_revenue_breakdown.keys())
        }

        return TraceableValue(
            name="Total Revenue",
            value=total_revenue,
            unit="USD/year",
            formula=formula,
            inputs=inputs,
            calculation_steps=calculation_steps,
            components=components,
            metadata=metadata
        )

    def _create_production_traceable(self, techno: dict) -> TraceableValue:
        """Create traceable Production with comprehensive inputs and calculation steps."""
        total_production = techno.get("production", 0)
        product_breakdown = techno.get("product_breakdown", {})
        product_cce = techno.get("product_carbon_conversion_efficiency", {})

        components = []
        inputs = {"plant_capacity": {"value": total_production, "unit": "tons/year"}}
        calculation_steps = []

        step_num = 1

        for product_name, production_value in product_breakdown.items():
            cce_value = product_cce.get(product_name, 0)
            product_yield = production_value / total_production if total_production > 0 else 0

            components.append(
                ComponentValue(
                    name=f"{product_name.upper()} Production",
                    value=production_value,
                    unit="tons/year",
                    description=f"Annual {product_name} production (CCE: {cce_value:.2f}%)"
                )
            )

            inputs[f"{product_name}_yield"] = {"value": product_yield, "unit": "dimensionless"}

            calculation_steps.append(
                CalculationStep(
                    step=step_num,
                    description=f"Calculate {product_name.upper()} production",
                    formula=f"production_{product_name} = plant_capacity × yield",
                    calculation=f"{total_production:,.0f} × {product_yield:.4f} = {production_value:,.0f}",
                    result={"value": production_value, "unit": "tons/year"}
                )
            )
            step_num += 1

        formula = "Product_Production = Plant_Capacity × Product_Yield"

        metadata = {
            "total_production_tons_year": total_production,
            "product_count": len(product_breakdown),
            "products": list(product_breakdown.keys())
        }

        return TraceableValue(
            name="Total Production",
            value=total_production,
            unit="tons/year",
            formula=formula,
            inputs=inputs,
            calculation_steps=calculation_steps,
            components=components,
            metadata=metadata
        )

    def _create_carbon_intensity_traceable(self, techno: dict) -> TraceableValue:
        """Create traceable Carbon Intensity with comprehensive inputs and calculation steps."""
        total_ci = techno.get("carbon_intensity", 0)
        ci_breakdown = techno.get("carbon_intensity_breakdown", {})
        fuel_energy_content = techno.get("fuel_energy_content", 0)

        ci_feedstock = ci_breakdown.get("feedstock", 0)
        ci_hydrogen = ci_breakdown.get("hydrogen", 0)
        ci_electricity = ci_breakdown.get("electricity", 0)
        ci_process = ci_breakdown.get("process", 0)

        components = [
            ComponentValue(
                name="Feedstock Carbon Intensity",
                value=ci_feedstock,
                unit="gCO2e/MJ",
                description="Carbon intensity contribution from feedstock"
            ),
            ComponentValue(
                name="Hydrogen Carbon Intensity",
                value=ci_hydrogen,
                unit="gCO2e/MJ",
                description="Carbon intensity contribution from hydrogen utility"
            ),
            ComponentValue(
                name="Electricity Carbon Intensity",
                value=ci_electricity,
                unit="gCO2e/MJ",
                description="Carbon intensity contribution from electricity utility"
            ),
            ComponentValue(
                name="Process Carbon Intensity",
                value=ci_process,
                unit="gCO2e/MJ",
                description="Carbon intensity from conversion process"
            )
        ]

        inputs = {
            "ci_feedstock": {"value": ci_feedstock, "unit": "gCO2e/MJ"},
            "ci_hydrogen": {"value": ci_hydrogen, "unit": "gCO2e/MJ"},
            "ci_electricity": {"value": ci_electricity, "unit": "gCO2e/MJ"},
            "ci_process": {"value": ci_process, "unit": "gCO2e/MJ"},
            "fuel_energy_content": {"value": fuel_energy_content, "unit": "MJ/kg"}
        }

        ci_sum = ci_feedstock + ci_hydrogen + ci_electricity + ci_process

        calculation_steps = [
            CalculationStep(
                step=1,
                description="Sum all CI components",
                formula="ci_total = ci_feedstock + ci_hydrogen + ci_electricity + ci_process",
                calculation=f"{ci_feedstock:.4f} + {ci_hydrogen:.4f} + {ci_electricity:.4f} + {ci_process:.4f} = {ci_sum:.4f}",
                result={"value": total_ci, "unit": "gCO2e/MJ"}
            )
        ]

        formula = "CI_total = (CI_feedstock + CI_hydrogen + CI_electricity + CI_process)"

        metadata = {
            "fuel_energy_content_mj_kg": fuel_energy_content,
            "total_ci_kgco2_ton": ci_breakdown.get("total", 0),
            "conversion_formula": "CI_component = (Component_CI × Component_Yield) / Fuel_Energy_Content"
        }

        return TraceableValue(
            name="Total Carbon Intensity",
            value=total_ci,
            unit="gCO2e/MJ",
            formula=formula,
            inputs=inputs,
            calculation_steps=calculation_steps,
            components=components,
            metadata=metadata
        )

    def _create_emissions_traceable(self, techno: dict) -> TraceableValue:
        """Create traceable Total Emissions with comprehensive inputs and calculation steps."""
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
        total_co2_calculated = carbon_intensity * fuel_energy_content * production_kg

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
                description="Calculate total CO2 emissions",
                formula="total_co2 = carbon_intensity × fuel_energy_content × production_kg",
                calculation=f"{carbon_intensity:.4f} × {fuel_energy_content:.3f} × {production_kg:,.0f} = {total_co2_calculated:,.0f}",
                result={"value": total_emissions, "unit": "gCO2e/year"}
            ),
            CalculationStep(
                step=3,
                description="Convert to tons CO2e/year (optional)",
                formula="total_co2_tons = total_co2_g / 1,000,000",
                calculation=f"{total_emissions:,.0f} / 1,000,000 = {total_emissions / 1_000_000:,.2f}",
                result={"value": total_emissions / 1_000_000, "unit": "tons CO2e/year"}
            )
        ]

        formula = "Total_CO2 = Carbon_Intensity × Fuel_Energy_Content × Production"

        metadata = {
            "carbon_intensity_gco2_mj": carbon_intensity,
            "fuel_energy_content_mj_kg": fuel_energy_content,
            "total_production_tons_year": production,
            "calculation_detail": f"{carbon_intensity:.4f} gCO2e/MJ × {fuel_energy_content:.3f} MJ/kg × {production:.0f} kg/year"
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
