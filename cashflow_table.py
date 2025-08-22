import numpy as np
import pandas as pd
import numpy_financial as nf

class FinancialAnalysis:
    def __init__(self, discount_rate: float):
        self.discount_rate = discount_rate

    def discount_factor(self, year: int) -> float:
        """
        DF = 1 / (1 + r)^t
        """
        return 1 / ((1 + self.discount_rate) ** year)

    def cash_flow_table(self, capex: float, revenue: float, opex: float,
                        plant_lifetime: int) -> pd.DataFrame:
        """
        Builds a cash flow table for NPV/IRR/Payback analysis.
        """
        data = []
        for year in range(0, plant_lifetime + 1):
            if year == 0:
                net_cash_flow = -capex
            else:
                net_cash_flow = revenue - opex

            df = self.discount_factor(year)
            present_value = net_cash_flow * df

            data.append({
                "Year": year,
                "Revenue": 0 if year == 0 else revenue,
                "OPEX": 0 if year == 0 else opex,
                "Net Cash Flow": net_cash_flow,
                "Discount Factor": df,
                "Present Value": present_value
            })

        return pd.DataFrame(data)

    def npv(self, capex: float, revenue: float, opex: float, plant_lifetime: int) -> float:
        df = self.cash_flow_table(capex, revenue, opex, plant_lifetime)
        return df["Present Value"].sum()


    def irr(self, capex: float, revenue: float, opex: float, plant_lifetime: int) -> float:
        cash_flows = [-capex] + [revenue - opex] * plant_lifetime
        return nf.irr(cash_flows)

    def payback_period(self, capex: float, revenue: float, opex: float, plant_lifetime: int) -> int:
        cumulative = -capex
        for year in range(1, plant_lifetime + 1):
            cumulative += (revenue - opex)
            if cumulative >= 0:
                return year
        return None  # not recovered


if __name__ == "__main__":
    fa = FinancialAnalysis(discount_rate=0.07)

    capex = 1_000_000
    revenue = 100_000
    opex = 20_000
    plant_lifetime = 20

    table = fa.cash_flow_table(capex, revenue, opex, plant_lifetime)
    print(table)

    print("\nNPV:", fa.npv(capex, revenue, opex, plant_lifetime))
    print("IRR:", fa.irr(capex, revenue, opex, plant_lifetime))
    print("Payback Period:", fa.payback_period(capex, revenue, opex, plant_lifetime))
