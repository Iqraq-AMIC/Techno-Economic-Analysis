import logging
from functools import wraps


logger = logging.getLogger(__name__)


def _wrap_class_methods(cls):
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
    Layer 1 — Modular Formulation
    -----------------------------
    All equations directly correspond to your provided formulations.

    Equations:
        (1) Total Capital Investment = TCI_ref × (PlantCapacity / Capacity_ref)^0.6
        (2) Production = PlantCapacity × ProductYield
        (3) Feedstock Consumption = PlantCapacity × FeedstockYield
        (4) Fuel Energy Content = ProductEnergyContent × MassFraction
        (5) Carbon Intensity (Feedstock) = (FeedstockCarbonIntensity × FeedstockYield) / FuelEnergyContent
        (6) Carbon Conversion Efficiency = (ProductCarbonContent / FeedstockCarbonContent) × 100
        (7) Amount of Product = PlantCapacity × MassFraction
    """

    # --- (1) Total Capital Investment ---
    def total_capital_investment(self, tci_ref, plant_capacity, capacity_ref):
        """Economy-of-scale capital scaling."""
        return tci_ref * (plant_capacity / capacity_ref) ** 0.6

    # --- (2) Production ---
    def production(self, plant_capacity, product_yield):
        return plant_capacity * product_yield

    # --- (3) Feedstock Consumption ---
    def feedstock_consumption(self, plant_capacity, feedstock_yield):
        return plant_capacity * feedstock_yield

    # --- (4) Fuel Energy Content ---
    def fuel_energy_content(self, product_energy_content, mass_fraction):
        return product_energy_content * mass_fraction

    # --- (5) Carbon Intensity of Feedstock ---
    def carbon_intensity_feedstock(self, feedstock_ci, feedstock_yield, fuel_energy_content):
        return (feedstock_ci * feedstock_yield) / (fuel_energy_content + 1e-12)

    # --- (6) Carbon Conversion Efficiency ---
    def carbon_conversion_efficiency(self, product_carbon_content, feedstock_carbon_content):
        return (product_carbon_content / (feedstock_carbon_content + 1e-12)) * 100

    # --- (7) Amount of Product ---
    def amount_of_product(self, plant_capacity, mass_fraction):
        return plant_capacity * mass_fraction

    # --- (8) Hydrogen Consumption ---
    def hydrogen_consumption(self, plant_capacity, yield_h2):
        """Calculate hydrogen consumption: PlantCapacity × Yield_H2
        Plant capacity in tonnes/year, yield in kg/kg -> result in kg/year
        """
        return plant_capacity * 1000 * yield_h2  # Convert tonnes to kg

    # --- (9) Electricity Consumption ---
    def electricity_consumption(self, plant_capacity, yield_kwh):
        """Calculate electricity consumption: PlantCapacity × Yield_kWh
        Plant capacity in tonnes/year, yield in kWh/kg -> result in kWh/year
        """
        return plant_capacity * 1000 * yield_kwh  # Convert tonnes to kg

    # --- Orchestrator (runs full layer) ---
    def compute(self, ref: dict, inputs: dict) -> dict:
        # from database
        tci_ref = ref["tci_ref"]
        capacity_ref = ref["capacity_ref"]
        feedstock_yield = ref["yield_biomass"]
        yield_h2 = ref["yield_h2"]
        yield_kwh = ref["yield_kwh"]

        # Allow user overrides for yields when provided
        if "feedstock_yield" in inputs and inputs["feedstock_yield"] is not None:
            feedstock_yield = inputs["feedstock_yield"]
        if "hydrogen_yield" in inputs and inputs["hydrogen_yield"] is not None:
            yield_h2 = inputs["hydrogen_yield"]
        if "electricity_yield" in inputs and inputs["electricity_yield"] is not None:
            yield_kwh = inputs["electricity_yield"]

        products_payload = inputs.get("products") or []
        if not products_payload:
            raise ValueError("At least one product must be provided")

        default_mass_fractions = {k.lower(): v / 100.0 for k, v in ref.get("mass_fractions", {}).items()}

        # from inputs
        plant_capacity = inputs["plant_total_liquid_fuel_capacity"]
        feedstock_ci = inputs["feedstock_carbon_intensity"]
        feedstock_carbon_content = inputs["feedstock_carbon_content"]

        product_results = []
        total_mass_fraction = 0.0
        total_weighted_energy = 0.0
        total_production = 0.0
        product_carbon_conversion_ratios = []

        for product in products_payload:
            name = (product.get("name") or "Product").strip()
            mass_fraction = product.get("mass_fraction")
            if mass_fraction is None:
                mass_fraction = default_mass_fractions.get(name.lower(), 0.0)
            mass_fraction = float(mass_fraction)
            if mass_fraction > 1.0:
                mass_fraction = mass_fraction / 100.0
            if mass_fraction < 0:
                mass_fraction = 0.0
            total_mass_fraction += mass_fraction

            product_yield = float(product.get("product_yield", 0.0))
            amount = plant_capacity * product_yield
            total_production += amount

            energy_content = float(product.get("product_energy_content", 0.0))
            total_weighted_energy += energy_content * mass_fraction

            carbon_content = float(product.get("product_carbon_content", 0.0))
            denominator = feedstock_carbon_content * feedstock_yield
            if denominator > 1e-12:
                carbon_ratio = (carbon_content * product_yield) / denominator * 100
            else:
                carbon_ratio = 0.0
            product_carbon_conversion_ratios.append(carbon_ratio)

            product_results.append({
                "name": name,
                "mass_fraction": mass_fraction,
                "product_yield": product_yield,
                "amount_of_product": amount,
                "product_energy_content": energy_content,
                "product_carbon_content": carbon_content,
                "carbon_conversion_efficiency_percent": carbon_ratio,
                "product_price": float(product.get("product_price", 0.0)),
                "product_price_sensitivity_ci": float(product.get("product_price_sensitivity_ci", 0.0)),
            })

        if total_mass_fraction > 1.0 + 1e-6:
            raise ValueError("Total product mass fraction exceeds 100%")

        if total_weighted_energy <= 0:
            total_weighted_energy = sum(p.get("product_energy_content", 0.0) for p in products_payload)

        if total_weighted_energy <= 0:
            total_weighted_energy = 1.0

        carbon_eff = (
            sum(product_carbon_conversion_ratios) / len(product_carbon_conversion_ratios)
            if product_carbon_conversion_ratios
            else 0.0
        )


        # compute formulas step-by-step
        tci = self.total_capital_investment(tci_ref, plant_capacity, capacity_ref)
        feedstock_cons = self.feedstock_consumption(plant_capacity, feedstock_yield)
        carbon_intensity = self.carbon_intensity_feedstock(feedstock_ci, feedstock_yield, total_weighted_energy)
        h2_cons = self.hydrogen_consumption(plant_capacity, yield_h2)
        elec_cons = self.electricity_consumption(plant_capacity, yield_kwh)

        avg_carbon_content = (
            sum(p["product_carbon_content"] * p["mass_fraction"] for p in product_results)
            if total_mass_fraction > 0 else product_results[0]["product_carbon_content"]
        )

        aggregated_product_yield = total_production / plant_capacity if plant_capacity else 0.0

        # return all intermediate + final values
        return {
            "total_capital_investment": tci,
            "production": total_production,
            "feedstock_consumption": feedstock_cons,
            "fuel_energy_content": total_weighted_energy,
            "product_energy_content": total_weighted_energy,
            "carbon_intensity_feedstock": carbon_intensity,
            "carbon_conversion_efficiency_percent": carbon_eff,
            "amount_of_product": total_production,
            "hydrogen_consumption": h2_cons,
            "electricity_consumption": elec_cons,
            "feedstock_yield": feedstock_yield,
            "product_yield": aggregated_product_yield,
            "product_carbon_content": avg_carbon_content,
            "plant_capacity": plant_capacity,
            "yield_h2": yield_h2,
            "yield_kwh": yield_kwh,
            "products": product_results,
            "total_product_mass_fraction": total_mass_fraction,
        }


class Layer2:
    """
    Layer 2 — Operating Expenditure, Carbon, and Revenue Formulation
    ---------------------------------------------------------------
    Equations:

        (1) Total Indirect OPEX  = Ratio × Total Capital Investment
        (2) Feedstock Cost       = Feedstock Consumption × Feedstock Price
        (3) Total Carbon Intensity = (Feedstock CI + Conversion Process CI) / 1000
        (4) Revenue              = Amount of Product × Product Price
    """

    # --- (1) Total Indirect OPEX ---
    def total_indirect_opex(self, process_ratio, total_capital_investment):
        """Compute total indirect operating expenditure."""
        return process_ratio * total_capital_investment

    # --- (2) Feedstock Cost ---
    def feedstock_cost(self, feedstock_consumption, feedstock_price):
        return feedstock_consumption * feedstock_price

    # --- (3) Hydrogen Cost ---
    def hydrogen_cost(self, hydrogen_consumption, hydrogen_price):
        """Calculate hydrogen cost: Hydrogen Consumption × Hydrogen Price"""
        return hydrogen_consumption * hydrogen_price

    # --- (4) Electricity Cost ---
    def electricity_cost(self, electricity_consumption, electricity_rate):
        """Calculate electricity cost: Electricity Consumption × Electricity Rate"""
        return electricity_consumption * electricity_rate

    # --- (5) Total Carbon Intensity ---
    def total_carbon_intensity(self, feedstock_ci, conversion_process_ci):
        # Divide by 1000 to convert gCO2/MJ → kgCO2/MJ or similar scaling
        return (feedstock_ci + conversion_process_ci) / 1000.0

    # --- (6) Revenue ---
    def revenue(self, amount_of_product, product_price):
        return amount_of_product * product_price

    # --- Orchestrator ---
    def compute(self, layer1_results: dict, ref: dict, inputs: dict):
        """
        Combine Layer1 results with reference & input data to calculate Layer2 metrics.
        """

        # Inputs
        process_type = (inputs.get("process_type") or "").upper()
        feedstock_price = inputs.get("feedstock_price", 0.0)
        products_input = inputs.get("products") or []
        hydrogen_price = inputs.get("hydrogen_price", 0.0)
        electricity_rate = inputs.get("electricity_rate", 0.0)

        conversion_ci_map = ref.get("conversion_process_ci", {})
        process_ratio_map = ref.get("process_ratio", {})
        conversion_process_ci = conversion_ci_map.get(process_type, 0.0)
        process_ratio = process_ratio_map.get(process_type, 0.0) / 100.0 if process_type else 0.0

        # From Layer 1
        total_capital_investment = layer1_results["total_capital_investment"]
        feedstock_consumption = layer1_results["feedstock_consumption"]
        hydrogen_consumption = layer1_results["hydrogen_consumption"]
        electricity_consumption = layer1_results["electricity_consumption"]
        feedstock_ci = layer1_results["carbon_intensity_feedstock"]
        product_outputs = layer1_results.get("products", [])
        product_output_lookup = {
            (entry.get("name") or "").strip().lower(): entry for entry in product_outputs
        }

        # Per-product revenues
        product_revenues = []
        total_revenue = 0.0
        for idx, product_input in enumerate(products_input):
            name = (product_input.get("name") or "").strip()
            lookup_key = name.lower()
            output_entry = product_output_lookup.get(lookup_key)
            if output_entry is None and idx < len(product_outputs):
                output_entry = product_outputs[idx]
            amount = output_entry.get("amount_of_product", 0.0) if output_entry else 0.0
            price = product_input.get("product_price", 0.0)
            revenue_i = amount * price
            total_revenue += revenue_i
            product_revenues.append({
                "name": name or product_input.get("name"),
                "amount_of_product": amount,
                "price": price,
                "revenue": revenue_i,
                "mass_fraction": output_entry.get("mass_fraction") if output_entry else None,
            })

        # Compute aggregated costs
        total_indirect_opex = self.total_indirect_opex(process_ratio, total_capital_investment)
        feedstock_cost = self.feedstock_cost(feedstock_consumption, feedstock_price)
        hydrogen_cost = self.hydrogen_cost(hydrogen_consumption, hydrogen_price)
        electricity_cost = self.electricity_cost(electricity_consumption, electricity_rate)
        total_carbon_intensity = self.total_carbon_intensity(feedstock_ci, conversion_process_ci)

        # Output dictionary
        return {
            "process_type": process_type,
            "total_indirect_opex": total_indirect_opex,
            "feedstock_cost": feedstock_cost,
            "hydrogen_cost": hydrogen_cost,
            "electricity_cost": electricity_cost,
            "total_carbon_intensity": total_carbon_intensity,
            "revenue": total_revenue,
            "conversion_process_ci": conversion_process_ci,
            "process_ratio": process_ratio,
            "product_revenues": product_revenues,
            "product_yield": layer1_results.get("product_yield", 0.0),
            "products": product_outputs,
        }
    
class Layer3:
    """
    Layer 3 — Direct OPEX and Weighted Carbon Intensity
    ---------------------------------------------------
    Equations:
        (1) Total Direct OPEX = Sum of All Direct Costs (Feedstock + H2 + Electricity)
        (2) Carbon Intensity  = Total Carbon Intensity × Product Yield
    """

    # --- (1) Total Direct OPEX ---
    def total_direct_opex(self, feedstock_costs: list[float], hydrogen_costs: list[float], electricity_costs: list[float]) -> float:
        """Sum all direct operating costs (feedstock + hydrogen + electricity)."""
        return sum(feedstock_costs) + sum(hydrogen_costs) + sum(electricity_costs)

    # --- (2) Carbon Intensity (weighted by product yield) ---
    def carbon_intensity(self, total_carbon_intensity: float, product_yield: float) -> float:
        return total_carbon_intensity * product_yield

    # --- Orchestrator ---
    def compute(self, layer2_results: list[dict]) -> dict:
        """
        Aggregate multiple Layer2 feedstock results (if multiple feedstocks exist)
        and compute the combined metrics for the process.
        """

        # Extract lists for aggregation
        feedstock_costs = [r["feedstock_cost"] for r in layer2_results]
        hydrogen_costs = [r["hydrogen_cost"] for r in layer2_results]
        electricity_costs = [r["electricity_cost"] for r in layer2_results]
        total_carbon_intensity_values = [r["total_carbon_intensity"] for r in layer2_results]
        product_yields = [r.get("product_yield", 1.0) for r in layer2_results]

        # Compute layer outputs
        total_direct_opex = self.total_direct_opex(feedstock_costs, hydrogen_costs, electricity_costs)
        # If multiple feedstocks, compute weighted carbon intensity
        total_weighted_ci = sum(
            ci * y for ci, y in zip(total_carbon_intensity_values, product_yields)
        )

        return {
            "total_direct_opex": total_direct_opex,
            "weighted_carbon_intensity": total_weighted_ci,
        }


class Layer4:
    """
    Layer 4 — OPEX, Emission, and LCOP Computation
    ----------------------------------------------
    Equations:
        (1) Total OPEX = Total Direct OPEX + Total Indirect OPEX
        (2) Total CO2 Emissions = Carbon Intensity × Product Energy Content × Production × 1000
        (3) LCOP = (C_feedstock + C_H2 + C_electricity + C_indirect_OPEX + C_capital) / Q_liquid_fuel
    """

    # --- (1) Total OPEX ---
    def total_opex(self, total_direct_opex: float, total_indirect_opex: float) -> float:
        return total_direct_opex + total_indirect_opex

    # --- (2) Total CO2 Emissions ---
    def total_co2_emissions(self, carbon_intensity: float, product_energy_content: float, production: float) -> float:
        """
        Computes total CO2 emissions (e.g. kg CO2) given:
        - carbon_intensity: weighted carbon intensity (kg CO2/MJ)
        - product_energy_content: product energy content (MJ/unit)
        - production: total production amount (units)
        Multiply by 1000 to convert to gCO2 if needed.
        """
        return carbon_intensity * product_energy_content * production * 1000

    # --- (3) Levelized Cost of Production (LCOP) ---
    def levelized_cost_of_production(self, feedstock_cost: float, hydrogen_cost: float,
                                     electricity_cost: float, indirect_opex: float,
                                     capital_investment: float, liquid_fuel_capacity: float,
                                     discount_rate: float = 0.07, plant_lifetime: int = 20) -> float:
        """
        LCOP = (C_feedstock + C_H2 + C_electricity + C_indirect_OPEX + C_capital_annualized) / Q_liquid_fuel

        All costs in USD/year including C_capital_annualized
        Q_liquid_fuel is plant capacity in tons/year
        Result is in USD/ton

        Capital cost is annualized using Capital Recovery Factor (CRF):
        CRF = r(1+r)^n / ((1+r)^n - 1)
        """
        # Calculate Capital Recovery Factor to annualize TCI
        if discount_rate > 0:
            crf = (discount_rate * (1 + discount_rate) ** plant_lifetime) / \
                  ((1 + discount_rate) ** plant_lifetime - 1)
        else:
            crf = 1 / plant_lifetime  # Fallback if discount rate is 0

        annualized_capital = capital_investment * crf
        numerator = feedstock_cost + hydrogen_cost + electricity_cost + indirect_opex + annualized_capital
        return numerator / (liquid_fuel_capacity + 1e-12)

    # --- Orchestrator ---
    def compute(self, layer2_results: dict, layer3_results: dict, layer1_results: dict,
                discount_rate: float = 0.07, plant_lifetime: int = 20) -> dict:
        """
        Combine all layers to compute final process outputs.
        """
        total_direct_opex = layer3_results["total_direct_opex"]
        total_indirect_opex = layer2_results["total_indirect_opex"]
        carbon_intensity = layer3_results["weighted_carbon_intensity"]
        product_energy_content = layer1_results["product_energy_content"]
        production = layer1_results["production"]

        # For LCOP calculation
        feedstock_cost = layer2_results["feedstock_cost"]
        hydrogen_cost = layer2_results["hydrogen_cost"]
        electricity_cost = layer2_results["electricity_cost"]
        capital_investment = layer1_results["total_capital_investment"]
        liquid_fuel_capacity = layer1_results["plant_capacity"]

        total_opex = self.total_opex(total_direct_opex, total_indirect_opex)
        total_co2 = self.total_co2_emissions(carbon_intensity, product_energy_content, production)
        lcop = self.levelized_cost_of_production(
            feedstock_cost, hydrogen_cost, electricity_cost,
            total_indirect_opex, capital_investment, liquid_fuel_capacity,
            discount_rate, plant_lifetime
        )

        return {
            "total_opex": total_opex,
            "total_co2_emissions": total_co2,
            "carbon_intensity": carbon_intensity,
            "product_energy_content": product_energy_content,
            "production": production,
            "lcop": lcop,
        }


for _layer_cls in (Layer1, Layer2, Layer3, Layer4):
    _wrap_class_methods(_layer_cls)
