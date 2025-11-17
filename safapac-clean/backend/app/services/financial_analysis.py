# app/services/financial_analysis.py

import numpy as np
import pandas as pd
import numpy_financial as nf


class FinancialAnalysis:
    def __init__(self, discount_rate: float):   
        self.discount_rate = discount_rate
        

    # ------------------------------------------------------------
    # Core helper functions
    # ------------------------------------------------------------
    def land_cost(self, tci: float) -> float:
        """Land Cost = 1,026,898.876 (fixed value from your spec)"""
        # You can make this a parameter if it varies
        return 1_026_898.876

    def discount_factor(self, year: int) -> float:
        """DF = 1 / (1 + r)^t"""
        if year < 0:
            # For negative years (construction), discount back from year 0
            return 1 / ((1 + self.discount_rate) ** abs(year))
        return 1 / ((1 + self.discount_rate) ** year)

    def working_capital(self, tci: float) -> float:
        """WC = 0.15 × TCI"""
        return 0.15 * tci


    def capital_investment(self, tci: float) -> float:
        """
        CapEx (Equity Investment) = (Equity × TCI) - WC
        where WC = 0.15 × TCI
        So: CapEx = (Equity - 0.15) × TCI
        """
        wc = self.working_capital(tci)
        return (self.equity * tci) - wc

    def depreciation(self, tci: float) -> float:
        """Depreciation = 0.05 × TCI (per year)"""
        return 0.05 * tci

    def annual_loan_payment(self, tci: float) -> float:
        """
        Loan Payment = (r × L) / (1 - (1 + r)^-n)
        where L = TCI × (1 - Equity)
        """
        r = self.bank_interest
        n = self.loan_term
        loan_amount = tci * (1 - self.equity)
        if loan_amount == 0:
            return 0
        return (r * loan_amount) / (1 - (1 + r) ** -n)

    def capex_schedule(self, tci: float) -> dict:
        """
        Construction schedule over 3 years:
        Year -2: Land Cost
        Year -1: Equity Investment = (Equity × TCI) - WC
        Year  0: Working Capital = WC
        """
        land = self.land_cost(tci)
        equity_investment = self.capital_investment(tci)
        wc = self.working_capital(tci)

        return {
            -2: land,
            -1: equity_investment,
            0: wc
        }

    # ------------------------------------------------------------
    # Main cash flow computation
    # ------------------------------------------------------------
    def cash_flow_table(self, tci: float, revenue: float,
                        manufacturing_cost: float, plant_lifetime: int) -> pd.DataFrame:
        """
        Builds the complete cash flow model with construction timeline.

        Parameters
        ----------
        tci : float
            Total Capital Investment
        revenue : float
            Annual revenue (USD/year)
        manufacturing_cost : float
            Annual manufacturing cost (USD/year), same as Total OPEX
        plant_lifetime : int
            Project lifetime in years (operating years)

        Returns
        -------
        pd.DataFrame
            Cash flow table with all financial metrics
        """

        print(f"🔍 FINANCIAL DEBUG - Input Summary:")
        print(f"   TCI: ${tci:,.0f}")
        print(f"   Annual Revenue: ${revenue:,.0f}")
        print(f"   Annual Manufacturing Cost: ${manufacturing_cost:,.0f}")
        print(f"   Annual Net Cash Flow: ${revenue - manufacturing_cost:,.0f}")
        print(f"   Payback (simple): {tci/(revenue - manufacturing_cost):.1f} years")

        capex_sched = self.capex_schedule(tci)
        depreciation_annual = self.depreciation(tci)
        loan_payment = self.annual_loan_payment(tci)

        data = []
        cumulative_dcf = 0.0
        accumulated_depreciation = 0.0

        # Year range: -2 (land purchase) to plant_lifetime (last operating year)
        for year in range(-2, plant_lifetime + 1):
            # Get capital expenditure for this year
            capex = capex_sched.get(year, 0)

            if year < 1:  # Construction phase (years -2, -1, 0)
                revenue_y = 0
                cost_y = 0
                depreciation_y = 0
                loan_y = 0
                income_tax = 0
                after_tax_profit = 0
                # Construction years: negative cash flow (investment)
                after_tax_cf = -capex
                remaining_plant_value = tci if year == 0 else 0

            else:  # Operation phase (year 1 to plant_lifetime)
                revenue_y = revenue
                cost_y = manufacturing_cost
                depreciation_y = depreciation_annual
                accumulated_depreciation += depreciation_y
                loan_y = loan_payment if year <= self.loan_term else 0

                # Remaining value of plant = TCI - Accumulated Depreciation
                remaining_plant_value = tci - accumulated_depreciation

                # Income Tax = (Revenue - Dep - Loan - Cost) × Tax Rate
                taxable_income = revenue_y - depreciation_y - loan_y - cost_y
                income_tax = max(0, taxable_income * self.tax_rate)

                # After-Tax Net Profit = Revenue - Loan - Cost - Tax
                after_tax_profit = revenue_y - loan_y - cost_y - income_tax

                # After-Tax Cash Flow = ATNP + Dep
                after_tax_cf = after_tax_profit + depreciation_y

            # Discounted Cash Flow
            df = self.discount_factor(year)
            dcf = after_tax_cf * df
            cumulative_dcf += dcf

            data.append({
                "Year": year,
                "Capital Investment (USD)": -capex if capex != 0 else 0,
                "Depreciation (USD)": depreciation_y,
                "Remaining value of Plant (USD)": remaining_plant_value,
                "Revenue (USD)": revenue_y,
                "Loan Payment (USD)": loan_y,
                "Manufacturing Cost (USD)": cost_y,
                "Income Tax (USD)": income_tax,
                "After-Tax Net Profit (USD)": after_tax_profit,
                "After-Tax Cash Flow (USD)": after_tax_cf,
                "Discount Factor": df,
                "DCF (USD)": dcf,
                "Cumulative DCF (USD)": cumulative_dcf
            })

        return pd.DataFrame(data)

    # ------------------------------------------------------------
    # NPV, IRR, Payback
    # ------------------------------------------------------------
    def npv(self, tci: float, revenue: float, manufacturing_cost: float, plant_lifetime: int) -> float:
        """
        Simple NPV: Single investment at year 0, then annual cash flows
        """
        print(f"🔍 SIMPLE NPV CALCULATION:")
        print(f"   Initial Investment: ${tci:,.0f}")
        print(f"   Annual Cash Flow: ${revenue - manufacturing_cost:,.0f}")
        print(f"   Plant Lifetime: {plant_lifetime} years")
        print(f"   Discount Rate: {self.discount_rate:.1%}")
        
        # Year 0: Initial investment (negative)
        cash_flows = [-tci]
        
        # Years 1 to plant_lifetime: Annual profit
        annual_cash_flow = revenue - manufacturing_cost
        cash_flows.extend([annual_cash_flow] * plant_lifetime)
        
        npv_result = nf.npv(self.discount_rate, cash_flows)
        print(f"   NPV Result: ${npv_result:,.0f}")
        return npv_result

    def irr(self, tci: float, revenue: float, manufacturing_cost: float, plant_lifetime: int) -> float:
        """
        Simple IRR: Single investment at year 0, then annual cash flows
        """
        print(f"🔍 SIMPLE IRR CALCULATION:")
        print(f"   Initial Investment: ${tci:,.0f}")
        print(f"   Annual Cash Flow: ${revenue - manufacturing_cost:,.0f}")
        
        cash_flows = [-tci]
        annual_cash_flow = revenue - manufacturing_cost
        cash_flows.extend([annual_cash_flow] * plant_lifetime)
        
        try:
            irr_result = nf.irr(cash_flows)
            print(f"   IRR Result: {irr_result:.1%}")
            return irr_result
        except:
            print("   IRR calculation failed")
            return 0.0

    def payback_period(self, tci: float, revenue: float, manufacturing_cost: float, plant_lifetime: int) -> float:
        """
        Simple payback: Initial investment / annual cash flow
        """
        annual_cash_flow = revenue - manufacturing_cost
        payback = tci / annual_cash_flow
        print(f"🔍 SIMPLE PAYBACK:")
        print(f"   Payback: {payback:.2f} years")
        return payback


if __name__ == "__main__":
    # Test example with construction timeline
    fa = FinancialAnalysis(
        discount_rate=0.105,
        tax_rate=0.28,
        equity=0.4,
        bank_interest=0.04,
        loan_term=10
    )

    tci = 10_000_000
    revenue = 2_000_000
    manufacturing_cost = 1_000_000
    plant_lifetime = 25

    print("=" * 80)
    print("FINANCIAL ANALYSIS TEST - WITH CONSTRUCTION TIMELINE")
    print("=" * 80)
    print(f"Total Capital Investment (TCI): ${tci:,.2f}")
    print(f"Land Cost (Year -2): ${fa.land_cost(tci):,.2f}")
    print(f"Equity Investment (Year -1): ${fa.capital_investment(tci):,.2f}")
    print(f"Working Capital (Year 0): ${fa.working_capital(tci):,.2f}")
    print(f"Annual Depreciation: ${fa.depreciation(tci):,.2f}")
    print(f"Annual Loan Payment: ${fa.annual_loan_payment(tci):,.2f}")
    print("=" * 80)

    table = fa.cash_flow_table(tci, revenue, manufacturing_cost, plant_lifetime)
    print("\nCash Flow Table (Construction + First 5 Operating Years):")
    print(table.head(8).to_string(index=False))

    print("\n" + "=" * 80)
    print(f"NPV: ${fa.npv(tci, revenue, manufacturing_cost, plant_lifetime):,.2f}")
    irr_val = fa.irr(tci, revenue, manufacturing_cost, plant_lifetime)
    if irr_val:
        print(f"IRR: {irr_val*100:.2f}%")
    else:
        print("IRR: Not converged")
    payback = fa.payback_period(tci, revenue, manufacturing_cost, plant_lifetime)
    if payback:
        print(f"Payback Period: {payback} years")
    else:
        print("Payback Period: Not recovered within project lifetime")
    print("=" * 80)
