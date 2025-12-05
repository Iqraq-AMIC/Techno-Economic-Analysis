# app/services/feature_calculations.py
"""
Calculation layers implementing the exact flowchart structure.
Each layer corresponds to one flowchart layer with matching formulas.
"""

import logging
from functools import wraps

logger = logging.getLogger(__name__)


def _wrap_class_methods(cls):
    """Wrapper for debug logging"""
    def _wrap(func):
        @wraps(func)
        def wrapper(self, *args, **kwargs):
            logger.debug("%s.%s called with args=%s kwargs=%s", cls.__name__, func.__name__, args, kwargs)
            result = func(self, *args, **kwargs)
            logger.debug("%s.%s returned %r", cls.__name__, func.__name__, result)
            return result
        return wrapper

    for name, attr in list(vars(cls).items()):
        if callable(attr) and not name.startswith("_"):
            setattr(cls, name, _wrap(attr))
    return cls


class Layer1:
    """
    Layer 1 — Core Parameters
    -------------------------
    Flowchart Layer 1 implementation.

    INPUTS:
        - ref: reference data (TCI_ref, capacity_ref, yields)
        - inputs: user inputs (plant capacity, feedstock CI, products)

    CALCULATIONS:
        (1) Total Capital Investment = TCI_ref × (Capacity / Capacity_ref)^0.6
        (2) Feedstock Consumption = Plant_Capacity × Feedstock_Yield
        (3) Hydrogen Consumption = Plant_Capacity × Yield_H2
        (4) Electricity Consumption = Plant_Capacity × Yield_kWh

        FOR EACH PRODUCT:
        (5) Amount of Product = Plant_Capacity × Product_Yield
        (6) Carbon Conversion Efficiency (%) = (CC_product × Yield_product) / (CC_feedstock × Yield_feedstock) × 100
        (7) Weighted Fuel Energy Content = Σ(Energy_Content_i × Mass_Fraction_i)

    OUTPUTS:
        - Total capital investment (MUSD)
        - Production (tons/year)
        - Feedstock consumption (tons/year)
        - Hydrogen consumption (kg/year)
        - Electricity consumption (kWh/year)
        - Products array with amounts, yields, and carbon metrics
        - Fuel energy content (MJ/kg)
    """

    def compute(self, ref: dict, inputs: dict) -> dict:
        """Execute all Layer 1 calculations according to flowchart."""

        # === GET REFERENCE DATA ===
        tci_ref = ref["tci_ref"]
        capacity_ref = ref["capacity_ref"]
        feedstock_yield = ref["yield_biomass"]
        yield_h2 = ref["yield_h2"]
        yield_kwh = ref["yield_kwh"]

        # Allow user overrides
        if "feedstock_yield" in inputs and inputs["feedstock_yield"] is not None:
            feedstock_yield = inputs["feedstock_yield"]
        if "hydrogen_yield" in inputs and inputs["hydrogen_yield"] is not None:
            yield_h2 = inputs["hydrogen_yield"]
        if "electricity_yield" in inputs and inputs["electricity_yield"] is not None:
            yield_kwh = inputs["electricity_yield"]

        # === GET USER INPUTS ===
        plant_capacity = inputs["plant_total_liquid_fuel_capacity"]  # KTA
        feedstock_carbon_content = inputs["feedstock_carbon_content"]
        products_payload = inputs.get("products") or []

        if not products_payload:
            raise ValueError("At least one product must be provided")

        # Get default mass fractions from reference
        default_mass_fractions = {k.lower(): v / 100.0 for k, v in ref.get("mass_fractions", {}).items()}

        # === CALCULATION (1): Total Capital Investment ===
        # TCI = TCI_ref × (Capacity / Capacity_ref)^0.6
        tci = tci_ref * (plant_capacity / capacity_ref) ** 0.6

        # === CALCULATION (2): Feedstock Consumption ===
        # Feedstock Consumption = Plant_Capacity × Feedstock_Yield
        feedstock_consumption = plant_capacity * 1000 * feedstock_yield  # tons/year

        # === CALCULATION (3): Hydrogen Consumption ===
        # Hydrogen Consumption = Plant_Capacity × Yield_H2
        hydrogen_consumption = plant_capacity * 1000 * 1000 * yield_h2  # kg/year

        # === CALCULATION (4): Electricity Consumption ===
        # Electricity Consumption = Plant_Capacity × Yield_kWh
        electricity_consumption = plant_capacity * 1000 * 1000 * yield_kwh  # kWh/year

        # === PROCESS EACH PRODUCT ===
        product_results = []
        total_production = 0.0
        energy_contents = []
        mass_fractions = []

        for product in products_payload:
            name = (product.get("name") or "Product").strip()

            # Get mass fraction
            mass_fraction = product.get("mass_fraction")
            if mass_fraction is None:
                mass_fraction = default_mass_fractions.get(name.lower(), 0.0)
            mass_fraction = float(mass_fraction)
            if mass_fraction > 1.0:
                mass_fraction = mass_fraction / 100.0
            mass_fractions.append(mass_fraction)

            # Get product properties
            product_yield = float(product.get("product_yield", 0.0))
            energy_content = float(product.get("product_energy_content", 0.0))
            carbon_content = float(product.get("product_carbon_content", 0.0))

            energy_contents.append(energy_content)

            # === CALCULATION (5): Amount of Product ===
            # Amount of Product = Plant_Capacity × Product_Yield
            amount = plant_capacity * 1000 * product_yield  # tons/year
            total_production += amount

            # === CALCULATION (6): Carbon Conversion Efficiency ===
            # CCE (%) = (CC_product × Yield_product) / (CC_feedstock × Yield_feedstock) × 100
            denominator = feedstock_carbon_content * feedstock_yield
            if denominator > 1e-12:
                cce = (carbon_content * product_yield) / denominator * 100
            else:
                cce = 0.0

            product_results.append({
                "name": name,
                "mass_fraction": mass_fraction,
                "product_yield": product_yield,
                "amount_of_product": amount,
                "product_energy_content": energy_content,
                "product_carbon_content": carbon_content,
                "carbon_conversion_efficiency_percent": cce,
                "product_price": float(product.get("product_price", 0.0)),
                "product_price_sensitivity_ci": float(product.get("product_price_sensitivity_ci", 0.0)),
            })

        # === CALCULATION (7): Weighted Fuel Energy Content ===
        # Weighted Fuel Energy Content = Σ(Energy_Content_i × Mass_Fraction_i)
        fuel_energy_content = sum(ec * mf for ec, mf in zip(energy_contents, mass_fractions))
        if fuel_energy_content <= 0:
            fuel_energy_content = 1.0

        # Calculate average CCE across all products
        avg_cce = sum(p["carbon_conversion_efficiency_percent"] for p in product_results) / len(product_results)

        # === RETURN LAYER 1 OUTPUTS ===
        return {
            "total_capital_investment": tci,
            "production": total_production,
            "feedstock_consumption": feedstock_consumption,
            "fuel_energy_content": fuel_energy_content,
            "product_energy_content": fuel_energy_content,
            "carbon_conversion_efficiency_percent": avg_cce,
            "amount_of_product": total_production,
            "hydrogen_consumption": hydrogen_consumption,
            "electricity_consumption": electricity_consumption,
            "feedstock_yield": feedstock_yield,
            "product_yield": total_production / (plant_capacity * 1000) if plant_capacity > 0 else 0.0,
            "plant_capacity": plant_capacity,
            "yield_h2": yield_h2,
            "yield_kwh": yield_kwh,
            "products": product_results,
        }


class Layer2:
    """
    Layer 2 — OPEX, Revenue & Carbon Metrics
    -----------------------------------------
    Flowchart Layer 2 implementation.

    INPUTS:
        - Layer 1 results
        - Reference data (process ratios, conversion CI)
        - User inputs (prices, carbon intensities)

    CALCULATIONS:
        (1) Total Indirect OPEX = Indirect_OPEX_Ratio × TCI
        (2) Feedstock Cost = Feedstock_Consumption × Feedstock_Price
        (3) Hydrogen Cost = Hydrogen_Consumption × Hydrogen_Price
        (4) Electricity Cost = Electricity_Consumption × Electricity_Rate
        (5) Carbon Intensity Components (kg/ton):
            • CI_feedstock = Feedstock_CI × Feedstock_Yield / Fuel_Energy_Content
            • CI_electricity = Elec_CI × Elec_Yield / Fuel_Energy_Content
            • CI_process = CI_Conversion_Process
            • CI_hydrogen = H2_CI × H2_Yield / Fuel_Energy_Content
        (6) Total Carbon Intensity = (CI_feedstock + CI_hydrogen + CI_electricity + CI_process) × EC_product

        FOR EACH PRODUCT:
        (1) Carbon Intensity = CI_total × Product_Yield
        (2) Total CO2 Emissions = CI_product × Production_product / 1000
        (3) Revenue = Amount_of_Product × Product_Price

    OUTPUTS:
        - Total indirect OPEX (USD/year)
        - Feedstock/Hydrogen/Electricity costs (USD/year)
        - Total revenue (USD/year)
        - Carbon intensity breakdown by input type
        - Product carbon metrics array (CI, CCE, emissions)
        - Product revenues array
    """

    def compute(self, layer1_results: dict, ref: dict, inputs: dict) -> dict:
        """Execute all Layer 2 calculations according to flowchart."""

        # === GET INPUTS ===
        process_type = (inputs.get("process_type") or "").upper()
        feedstock_price = inputs.get("feedstock_price", 0.0)
        hydrogen_price = inputs.get("hydrogen_price", 0.0)
        electricity_rate = inputs.get("electricity_rate", 0.0)
        products_input = inputs.get("products") or []

        # Get reference data
        conversion_ci_map = ref.get("conversion_process_ci", {})
        conversion_process_ci = conversion_ci_map.get(process_type, 0.0)

        # Get Layer 1 results
        tci = layer1_results["total_capital_investment"]
        feedstock_consumption = layer1_results["feedstock_consumption"]
        hydrogen_consumption = layer1_results["hydrogen_consumption"]
        electricity_consumption = layer1_results["electricity_consumption"]
        fuel_energy_content = layer1_results["fuel_energy_content"]
        product_outputs = layer1_results.get("products", [])

        # Get carbon intensities
        feedstock_ci = inputs.get("feedstock_carbon_intensity", 0.0)  # gCO2/kg
        hydrogen_ci = inputs.get("hydrogen_carbon_intensity", 0.0)  # gCO2/kg
        electricity_ci = inputs.get("electricity_carbon_intensity", 0.0)  # gCO2/kWh

        # Get yields
        feedstock_yield = layer1_results.get("feedstock_yield", 0.0)
        hydrogen_yield = layer1_results.get("yield_h2", 0.0)
        electricity_yield = layer1_results.get("yield_kwh", 0.0)
        feedstock_carbon_content = inputs.get("feedstock_carbon_content", 0.0)

        # === CALCULATION (1): Total Indirect OPEX ===
        # Total Indirect OPEX = Indirect_OPEX_Ratio × TCI
        indirect_opex_ratio = inputs.get("indirect_opex_tci_ratio", 0.077)
        total_indirect_opex = indirect_opex_ratio * tci * 1e6  # Convert TCI from MUSD to USD

        # === CALCULATION (2): Feedstock Cost ===
        # Feedstock Cost = Feedstock_Consumption × Feedstock_Price
        feedstock_cost = feedstock_consumption * feedstock_price

        # === CALCULATION (3): Hydrogen Cost ===
        # Hydrogen Cost = Hydrogen_Consumption × Hydrogen_Price
        hydrogen_cost = hydrogen_consumption * hydrogen_price

        # === CALCULATION (4): Electricity Cost ===
        # Electricity Cost = Electricity_Consumption × Electricity_Rate
        electricity_cost = electricity_consumption * electricity_rate

        # === CALCULATION (5): Carbon Intensity Components ===
        # All components calculated to result in gCO2e/MJ at the end

        # CI_feedstock = Feedstock_CI × Feedstock_Yield / Fuel_Energy_Content (gCO2e/MJ)
        ci_feedstock_gco2_mj = (feedstock_ci * feedstock_yield) / (fuel_energy_content + 1e-12)

        # CI_hydrogen = H2_CI × H2_Yield / Fuel_Energy_Content (gCO2e/MJ)
        ci_hydrogen_gco2_mj = (hydrogen_ci * hydrogen_yield) / (fuel_energy_content + 1e-12)

        # CI_electricity = Elec_CI × Elec_Yield / Fuel_Energy_Content (gCO2e/MJ)
        ci_electricity_gco2_mj = (electricity_ci * electricity_yield) / (fuel_energy_content + 1e-12)

        # CI_process = CI_Conversion_Process (already in gCO2/MJ)
        ci_process_gco2_mj = conversion_process_ci

        # === CALCULATION (6): Total Carbon Intensity ===
        # EC_product = sum of mass fractions (emission coefficient)
        ec_product = sum(prod.get("mass_fraction", 0.0) for prod in product_outputs)

        # Total Carbon Intensity (gCO2e/MJ) = (CI_feedstock + CI_hydrogen + CI_electricity + CI_process) × EC_product
        total_carbon_intensity_gco2_mj = (ci_feedstock_gco2_mj + ci_hydrogen_gco2_mj +
                                          ci_electricity_gco2_mj + ci_process_gco2_mj) * ec_product

        # Also calculate in kg CO2e/ton for per-product calculations
        ci_total_kgco2_ton = total_carbon_intensity_gco2_mj * fuel_energy_content

        # === PER-PRODUCT CALCULATIONS ===
        product_output_lookup = {
            (entry.get("name") or "").strip().lower(): entry for entry in product_outputs
        }

        product_revenues = []
        product_carbon_metrics = []
        total_revenue = 0.0
        total_cce = 0.0
        product_count = 0

        for idx, product_input in enumerate(products_input):
            name = (product_input.get("name") or "").strip()
            lookup_key = name.lower()
            output_entry = product_output_lookup.get(lookup_key)
            if output_entry is None and idx < len(product_outputs):
                output_entry = product_outputs[idx]

            if not output_entry:
                continue

            amount = output_entry.get("amount_of_product", 0.0)
            price = product_input.get("product_price", 0.0)
            product_yield = output_entry.get("product_yield", 0.0)
            product_carbon_content = output_entry.get("product_carbon_content", 0.0)

            # FOR EACH PRODUCT (1): Carbon Intensity = CI_total × Product_Yield
            ci_product = ci_total_kgco2_ton * product_yield

            # FOR EACH PRODUCT (2): Total CO2 Emissions = CI_product × Production_product / 1000
            co2_emissions = ci_product * amount / 1000.0  # ton CO2/year

            # FOR EACH PRODUCT (3): Revenue = Amount_of_Product × Product_Price
            revenue = amount * price
            total_revenue += revenue

            # Calculate CCE for this product
            denominator = feedstock_carbon_content * feedstock_yield
            if denominator > 0:
                cce_product = (product_carbon_content * product_yield / denominator) * 100.0
            else:
                cce_product = 0.0

            total_cce += cce_product
            product_count += 1

            product_revenues.append({
                "name": name,
                "amount_of_product": amount,
                "price": price,
                "revenue": revenue,
                "mass_fraction": output_entry.get("mass_fraction"),
            })

            product_carbon_metrics.append({
                "name": name,
                "carbon_intensity_kgco2_ton": ci_product,
                "carbon_conversion_efficiency_percent": cce_product,
                "co2_emissions_ton_per_year": co2_emissions,
            })

        avg_cce = total_cce / product_count if product_count > 0 else 0.0

        # === RETURN LAYER 2 OUTPUTS ===
        return {
            "process_type": process_type,
            "total_indirect_opex": total_indirect_opex,
            "feedstock_cost": feedstock_cost,
            "hydrogen_cost": hydrogen_cost,
            "electricity_cost": electricity_cost,
            "total_carbon_intensity": total_carbon_intensity_gco2_mj,  # gCO2/MJ
            "revenue": total_revenue,
            "conversion_process_ci": conversion_process_ci,
            "product_revenues": product_revenues,
            "product_yield": layer1_results.get("product_yield", 0.0),
            "products": product_outputs,
            # Carbon metrics breakdown (gCO2/MJ)
            "carbon_intensity_feedstock_kgco2_ton": ci_feedstock_gco2_mj,
            "carbon_intensity_hydrogen_kgco2_ton": ci_hydrogen_gco2_mj,
            "carbon_intensity_electricity_kgco2_ton": ci_electricity_gco2_mj,
            "carbon_intensity_process_kgco2_ton": ci_process_gco2_mj,
            "carbon_intensity_total_kgco2_ton": ci_total_kgco2_ton,
            "product_carbon_metrics": product_carbon_metrics,
            "total_carbon_conversion_efficiency_percent": avg_cce,
        }


class Layer3:
    """
    Layer 3 — Direct OPEX & Weighted Carbon Intensity
    --------------------------------------------------
    Flowchart Layer 3 implementation.

    INPUTS:
        - Layer 2 results (supports multiple feedstocks)

    CALCULATIONS:
        (1) Total Direct OPEX = Σ(Feedstock_Costs) + Σ(H2_Costs) + Σ(Elec_Costs)
        (2) Weighted Carbon Intensity = Σ(CI_i × Product_Yield_i)

    OUTPUTS:
        - Total direct OPEX (USD/year)
        - Weighted carbon intensity (gCO2/MJ)
    """

    def compute(self, layer2_results: list[dict]) -> dict:
        """Execute all Layer 3 calculations according to flowchart."""

        # === CALCULATION (1): Total Direct OPEX ===
        # Total Direct OPEX = Σ(Feedstock_Costs) + Σ(H2_Costs) + Σ(Elec_Costs)
        feedstock_costs = [r["feedstock_cost"] for r in layer2_results]
        hydrogen_costs = [r["hydrogen_cost"] for r in layer2_results]
        electricity_costs = [r["electricity_cost"] for r in layer2_results]

        total_direct_opex = sum(feedstock_costs) + sum(hydrogen_costs) + sum(electricity_costs)

        # === CALCULATION (2): Weighted Carbon Intensity ===
        # Weighted Carbon Intensity = Σ(CI_i × Product_Yield_i)
        carbon_intensities = [r["total_carbon_intensity"] for r in layer2_results]
        product_yields = [r.get("product_yield", 1.0) for r in layer2_results]

        weighted_ci = sum(ci * y for ci, y in zip(carbon_intensities, product_yields))

        # === RETURN LAYER 3 OUTPUTS ===
        return {
            "total_direct_opex": total_direct_opex,
            "weighted_carbon_intensity": weighted_ci,
        }


class Layer4:
    """
    Layer 4 — Total OPEX, Emissions & LCOP
    ---------------------------------------
    Flowchart Layer 4 implementation.

    INPUTS:
        - Layer 1, 2, and 3 results
        - Discount rate and plant lifetime

    CALCULATIONS:
        (1) Total OPEX = Total_Direct_OPEX + Total_Indirect_OPEX
        (2) Levelized Cost of Production (LCOP):
            • CRF = r(1+r)^n / ((1+r)^n - 1)
            • Annualized Capital = TCI_USD × CRF
            • LCOP = (Feedstock_Cost + H2_Cost + Elec_Cost + Indirect_OPEX + Annualized_Capital) / Plant_Capacity_Tons

    OUTPUTS:
        - Total OPEX (USD/year)
        - Total CO2 emissions (gCO2e/year)
        - LCOP (USD/ton)
    """

    def compute(self, layer2_results: dict, layer3_results: dict, layer1_results: dict,
                discount_rate: float = 0.07, plant_lifetime: int = 20) -> dict:
        """Execute all Layer 4 calculations according to flowchart."""

        # Get values from previous layers
        total_direct_opex = layer3_results["total_direct_opex"]
        total_indirect_opex = layer2_results["total_indirect_opex"]
        weighted_ci = layer3_results["weighted_carbon_intensity"]

        feedstock_cost = layer2_results["feedstock_cost"]
        hydrogen_cost = layer2_results["hydrogen_cost"]
        electricity_cost = layer2_results["electricity_cost"]

        tci = layer1_results["total_capital_investment"]  # MUSD
        plant_capacity = layer1_results["plant_capacity"]  # KTA
        fuel_energy_content = layer1_results["fuel_energy_content"]  # MJ/kg
        production = layer1_results["production"]  # tons/year

        # === CALCULATION (1): Total OPEX ===
        # Total OPEX = Total_Direct_OPEX + Total_Indirect_OPEX
        total_opex = total_direct_opex + total_indirect_opex

        # === CALCULATION (2): LCOP ===
        # Convert units
        tci_usd = tci * 1_000_000  # MUSD to USD
        plant_capacity_tons = plant_capacity * 1000  # KTA to tons/year

        # Calculate Capital Recovery Factor
        # CRF = r(1+r)^n / ((1+r)^n - 1)
        if discount_rate > 0:
            crf = (discount_rate * (1 + discount_rate) ** plant_lifetime) / \
                  ((1 + discount_rate) ** plant_lifetime - 1)
        else:
            crf = 1 / plant_lifetime

        # Annualized Capital = TCI_USD × CRF
        annualized_capital = tci_usd * crf

        # LCOP = (Feedstock_Cost + H2_Cost + Elec_Cost + Indirect_OPEX + Annualized_Capital) / Plant_Capacity_Tons
        lcop = (feedstock_cost + hydrogen_cost + electricity_cost + total_indirect_opex + annualized_capital) / \
               (plant_capacity_tons + 1e-12)

        # === Calculate Total CO2 Emissions ===
        # Total CO2 = Carbon Intensity (gCO2/MJ) × Fuel Energy Content (MJ/kg) × Production (kg/year)
        # Result in gCO2/year
        total_co2 = weighted_ci * fuel_energy_content * production * 1000  # tons to kg

        # === RETURN LAYER 4 OUTPUTS ===
        return {
            "total_opex": total_opex,
            "total_co2_emissions": total_co2,
            "carbon_intensity": weighted_ci,
            "product_energy_content": fuel_energy_content,
            "production": production,
            "lcop": lcop,
        }


# Wrap all classes with debug logging
for _layer_cls in (Layer1, Layer2, Layer3, Layer4):
    _wrap_class_methods(_layer_cls)
