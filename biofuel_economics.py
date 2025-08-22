from process_technology_lib import BiofuelDatabase
from feature_calculation import (FirstLayer, SecondLayer, ThirdLayer, FourthLayer,
                                   FifthLayer, SixthLayer)
from user_inputs import UserInputs


class BiofuelEconomics:
    def __init__(self, inputs: UserInputs):
        self.inputs = inputs
        self.db = BiofuelDatabase()

        # Layers
        self.fl1 = FirstLayer(inputs.production_capacity)
        self.fl2 = SecondLayer()
        self.fl3 = ThirdLayer()
        self.fl4 = FourthLayer()
        self.fl5 = FifthLayer()
        self.fl6 = SixthLayer()

    def run(self, feedstock: str, TCI_2023: float) -> dict:
        """
        Compute full techno-economics for a selected feedstock.
        """

        row = self.db.get_yield_by_feedstock(feedstock)
        if row is None:
            raise ValueError(f"Feedstock {feedstock} not found in database.")

        # Layer 1
        capex = self.fl1.capex_estimation(row["TCI_ref"], row["Capacity_ref"])
        biomass_cost = self.fl1.cost_biomass(row["Yield_biomass"], self.inputs.biomass_price)
        hydrogen_cost = self.fl1.cost_hydrogen(row["Yield_H2"], self.inputs.hydrogen_price)
        utility_cost = self.fl1.cost_utility(row["Yield_kWh"], self.inputs.electricity_rate)
        N_OL = self.fl1.operators_required(row["P_steps"], row["Nnp_steps"])
        revenue = self.fl1.revenue(row["Yield_biomass"], self.inputs.product_price)

        # Layer 2
        labour_cost = self.fl2.cost_operating_labour(N_OL, self.inputs.yearly_wage_operator)
        raw_materials = self.fl2.cost_raw_materials(biomass_cost, hydrogen_cost)
        capex_adj = self.fl2.tci_with_cepci(TCI_2023, self.inputs.CEPCI)

        # Layer 3
        tdc = self.fl3.total_direct_cost(raw_materials, utility_cost, labour_cost)

        # Layer 4
        tic = self.fl4.total_indirect_cost(tdc)["Total Indirect Cost"]

        # Layer 5
        opex = self.fl5.opex_estimated(tdc, tic)

        # Layer 6
        lcop = self.fl6.levelised_cost_of_production(capex_adj,
                                                     self.inputs.land_cost,
                                                     self.inputs.plant_lifetime,
                                                     opex,
                                                     self.inputs.production_capacity)

        return {
            "Feedstock": feedstock,
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


if __name__ == "__main__":
    from user_inputs import UserInputs

    # Step 1: Collect inputs (could come from user form/CLI)
    inputs = UserInputs(
        production_capacity = 100000,
        CEPCI = 900.0,
        biomass_price = 50,
        hydrogen_price = 3,
        electricity_rate = 0.1,
        yearly_wage_operator = 50000,
        product_price = 100,
        land_cost = 300000,
        plant_lifetime = 20,
        discount_factor = 0.07
    )

    # Step 2: Run economics
    econ = BiofuelEconomics(inputs)
    results = econ.run("Sugarcane", TCI_2023=1_000_000)

    # Step 3: Print results
    for k, v in results.items():
        print(f"{k}: {v}")
