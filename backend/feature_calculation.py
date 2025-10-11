import math

class FirstLayer:
    def __init__(self, production_capacity: float):
        """
        Initialize with the actual production capacity (e.g., tons/year).
        """
        self.production_capacity = production_capacity

    def capex_estimation(self, TCI_ref: float, capacity_ref: float) -> float:
        """
        Sixth-Tenth-Rule for CAPEX Estimation:
        TCI = TCI_ref × (ProductionCapacity / Capacity_ref) ^ 0.6
        """
        return TCI_ref * ((self.production_capacity / capacity_ref) ** 0.6)

    def cost_biomass(self, yield_biomass: float, biomass_price: float) -> float:
        """
        Cost of Biomass = ProductionCapacity × Yield_biomass × Biomass Price
        """
        return self.production_capacity * yield_biomass * biomass_price

    def cost_hydrogen(self, yield_h2: float, hydrogen_price: float) -> float:
        """
        Cost of Hydrogen = ProductionCapacity × Yield_H2 × Hydrogen Price
        """
        return self.production_capacity * yield_h2 * hydrogen_price

    def cost_utility(self, yield_kwh: float, electricity_rate: float) -> float:
        """
        Cost of Utility = ProductionCapacity × Yield_kWh × Electricity Rate
        """
        return self.production_capacity * yield_kwh * electricity_rate

    def operators_required(self, P: int, Nnp: int) -> float:
        """
        N_OL = sqrt(6.29 + 31.7 × P^2 + 0.23 × Nnp)
        where:
          - N_OL = Number of operators per shift
          - P = number of processing steps
          - Nnp = number of non-particulate processing steps
        """
        return math.sqrt(6.29 + 31.7 * (P ** 2) + 0.23 * Nnp)

    def revenue(self, product_yield: float, product_price: float) -> float:
        """
        Revenue = ProductionCapacity × ProductYield × ProductPrice
        """
        return self.production_capacity * product_yield * product_price


class SecondLayer:
    def __init__(self):
        pass

    def cost_operating_labour(self, N_OL: float, yearly_wage: float) -> float:
        """
        Cost of Operating Labour = N_OL × 4.5 × Yearly Wage of Chemical Operator
        """
        return N_OL * 4.5 * yearly_wage

    def cost_raw_materials(self, cost_biomass: float, cost_hydrogen: float) -> float:
        """
        Cost of Raw Materials = Cost of Biomass + Cost of Hydrogen
        """
        return cost_biomass + cost_hydrogen

    def tci_with_cepci(self, TCI_2023: float, CEPCI: float, CEPCI_2023: float = 800.8) -> float:
        """
        Adjust TCI using CEPCI index:
        TCI = TCI_2023 × (CEPCI / CEPCI_2023)

        Default CEPCI_2023 = 800.8
        """
        return TCI_2023 * (CEPCI / CEPCI_2023)

class ThirdLayer:
    def __init__(self):
        pass

    def total_direct_cost(self, cost_raw_materials: float, cost_utility: float, cost_operating_labour: float) -> float:
        """
        Total Direct Cost = Cost of Raw Materials + Cost of Utility + Cost of Operating Labour
        """
        return cost_raw_materials + cost_utility + cost_operating_labour

class FourthLayer:
    def __init__(self):
        pass

    def total_indirect_cost(self, total_direct_cost: float) -> dict:
        """
        Total Indirect Cost = 0.6 × Total Direct Cost

        Breakdown:
          - Prorated Expenses = 10% of TDC
          - Field Expenses = 10% of TDC
          - Home Office & Construction = 20% of TDC
          - Project Contingency = 10% of TDC
          - Other Costs = 10% of TDC
        """
        prorated = 0.10 * total_direct_cost
        field = 0.10 * total_direct_cost
        home_office = 0.20 * total_direct_cost
        project_contingency = 0.10 * total_direct_cost
        other = 0.10 * total_direct_cost

        total_indirect = 0.6 * total_direct_cost

        return {
            "Prorated Expenses": prorated,
            "Field Expenses": field,
            "Home Office & Construction": home_office,
            "Project Contingency": project_contingency,
            "Other Costs": other,
            "Total Indirect Cost": total_indirect
        }

class FifthLayer:
    def __init__(self):
        pass

    def opex_estimated(self, total_direct_cost: float, total_indirect_cost: float) -> float:
        """
        OPEX Estimated = Total Direct Cost + Total Indirect Cost
        """
        return total_direct_cost + total_indirect_cost

class SixthLayer:
    def __init__(self):
        pass

    def levelised_cost_of_production(self, CAPEX: float, land_cost: float,
                                     plant_lifetime: int, OPEX: float,
                                     production_capacity: float) -> float:
        """
        Levelised Cost of Production (LCOP):

        LCOP = (CAPEX + LandCost + (PlantLifetime × OPEX)) 
               / (PlantLifetime × ProductionCapacity)
        """
        numerator = CAPEX + land_cost + (plant_lifetime * OPEX)
        denominator = plant_lifetime * production_capacity
        return numerator / denominator




class BiofuelEconomics:
    def __init__(self, production_capacity, land_cost, plant_lifetime, yearly_wage):
        self.production_capacity = production_capacity
        self.land_cost = land_cost
        self.plant_lifetime = plant_lifetime
        self.yearly_wage = yearly_wage

        # instantiate sub-layers
        self.fl1 = FirstLayer(production_capacity)
        self.fl2 = SecondLayer()
        self.fl3 = ThirdLayer()
        self.fl4 = FourthLayer()
        self.fl5 = FifthLayer()
        self.fl6 = SixthLayer()

    def compute_all(self, params):
        """
        params should include:
        - TCI_ref, capacity_ref
        - yield_biomass, biomass_price
        - yield_h2, hydrogen_price
        - yield_kwh, electricity_rate
        - P, Nnp
        - product_yield, product_price
        - CEPCI, TCI_2023
        """
        # Layer 1
        capex = self.fl1.capex_estimation(params["TCI_ref"], params["capacity_ref"])
        biomass_cost = self.fl1.cost_biomass(params["yield_biomass"], params["biomass_price"])
        hydrogen_cost = self.fl1.cost_hydrogen(params["yield_h2"], params["hydrogen_price"])
        utility_cost = self.fl1.cost_utility(params["yield_kwh"], params["electricity_rate"])
        N_OL = self.fl1.operators_required(params["P"], params["Nnp"])
        revenue = self.fl1.revenue(params["product_yield"], params["product_price"])

        # Layer 2
        labour_cost = self.fl2.cost_operating_labour(N_OL, self.yearly_wage)
        raw_materials = self.fl2.cost_raw_materials(biomass_cost, hydrogen_cost)
        capex_adj = self.fl2.tci_with_cepci(params["TCI_2023"], params["CEPCI"])

        # Layer 3
        tdc = self.fl3.total_direct_cost(raw_materials, utility_cost, labour_cost)

        # Layer 4
        tic = self.fl4.total_indirect_cost(tdc)["Total Indirect Cost"]

        # Layer 5
        opex = self.fl5.opex_estimated(tdc, tic)

        # Layer 6
        lcop = self.fl6.levelised_cost_of_production(capex_adj, self.land_cost,
                                                     self.plant_lifetime, opex,
                                                     self.production_capacity)

        return {
            "CAPEX": capex,
            "Adjusted CAPEX": capex_adj,
            "Biomass Cost": biomass_cost,
            "Hydrogen Cost": hydrogen_cost,
            "Utility Cost": utility_cost,
            "Labour Cost": labour_cost,
            "Raw Materials": raw_materials,
            "TDC": tdc,
            "TIC": tic,
            "OPEX": opex,
            "Revenue": revenue,
            "LCOP": lcop
        }


# econ = BiofuelEconomics(production_capacity=100000, land_cost=300000, plant_lifetime=20, yearly_wage=50000)
# results = econ.compute_all(params)
# print(results["LCOP"])
