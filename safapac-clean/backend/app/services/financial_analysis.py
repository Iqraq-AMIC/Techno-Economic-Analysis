import numpy as np
import numpy_financial as nf
import pandas as pd  # Added for table formatting & sanitization
from typing import List, Dict, Any

class FinancialAnalysis:
    def __init__(self, discount_rate: float = 0.07):
        # Fixed parameters from spec
        self.discount_rate = discount_rate
        self.equity_ratio = 0.4  # 40% equity
        self.bank_interest_rate = 0.04  # 4%
        self.loan_term = 10  # 10 years
        self.income_tax_rate = 0.28  # 28%
        self.depreciation_rate = 0.05  # 5% of TCI annually
        self.working_capital_ratio = 0.15  # 15% of TCI
        
    def calculate_loan_payment(self, loan_amount: float) -> float:
        """Calculate annual loan payment using annuity formula"""
        if self.bank_interest_rate == 0:
            return loan_amount / self.loan_term
        annuity_factor = (1 - (1 + self.bank_interest_rate) ** -self.loan_term) / self.bank_interest_rate
        return loan_amount / annuity_factor
    
    def calculate_depreciation(self, tci: float, year: int) -> float:
        """Calculate depreciation - 5% of TCI for years 1-20"""
        if 1 <= year <= 20:
            return tci * self.depreciation_rate
        return 0.0
    
    def calculate_income_tax(self, revenue: float, depreciation: float, 
                           loan_payment: float, manufacturing_cost: float) -> float:
        """Calculate income tax: (Revenue - Depreciation - Loan Payment - Manufacturing Cost) × Income Tax %"""
        taxable_income = revenue - depreciation - loan_payment - manufacturing_cost
        return max(0, taxable_income * self.income_tax_rate)
    
    def calculate_after_tax_profit(self, revenue: float, loan_payment: float, 
                                 manufacturing_cost: float, income_tax: float) -> float:
        """Calculate after-tax profit: Revenue - Loan Payment - Manufacturing Cost - Income Tax"""
        return revenue - loan_payment - manufacturing_cost - income_tax
    
    def calculate_after_tax_cash_flow(self, after_tax_profit: float, depreciation: float) -> float:
        """Calculate after-tax cash flow: After tax net profit + Depreciation"""
        return after_tax_profit + depreciation
    
    def generate_cash_flow_schedule(self, tci_usd: float, annual_revenue: float, 
                                  annual_manufacturing_cost: float, project_lifetime: int = 20) -> List[Dict[str, Any]]:
        """
        Generate complete cash flow schedule according to spec (Internal Raw Data)
        """
        cash_flows = []
        
        # Calculate financial components
        loan_amount = tci_usd * (1 - self.equity_ratio)  # Loan = TCI * (100% - Equity%)
        annual_loan_payment = self.calculate_loan_payment(loan_amount)
        working_capital = tci_usd * self.working_capital_ratio
        
        # Year -2: Land Cost (from spec)
        land_cost = 1026898.876
        cash_flows.append({
            'year': -2,
            'capital_investment': -land_cost,
            'depreciation': 0,
            'remaining_plant_value': 0,
            'revenue': 0,
            'loan_payment': 0,
            'manufacturing_cost': 0,
            'income_tax': 0,
            'after_tax_net_profit': 0,
            'after_tax_cash_flow': -land_cost
        })
        
        # Year -1: Equity Investment (Equity * TCI - WC)
        equity_investment = (self.equity_ratio * tci_usd) - working_capital
        cash_flows.append({
            'year': -1,
            'capital_investment': -equity_investment,
            'depreciation': 0,
            'remaining_plant_value': 0,
            'revenue': 0,
            'loan_payment': 0,
            'manufacturing_cost': 0,
            'income_tax': 0,
            'after_tax_net_profit': 0,
            'after_tax_cash_flow': -equity_investment
        })
        
        # Year 0: Working Capital
        cash_flows.append({
            'year': 0,
            'capital_investment': -working_capital,
            'depreciation': 0,
            'remaining_plant_value': tci_usd,  # Full plant value at year 0
            'revenue': 0,
            'loan_payment': 0,
            'manufacturing_cost': 0,
            'income_tax': 0,
            'after_tax_net_profit': 0,
            'after_tax_cash_flow': -working_capital
        })
        
        # Operating years 1-20
        accumulated_depreciation = 0
        for year in range(1, project_lifetime + 1):
            depreciation = self.calculate_depreciation(tci_usd, year)
            accumulated_depreciation += depreciation
            remaining_plant_value = tci_usd - accumulated_depreciation
            
            # Loan payment only for first 10 years
            loan_payment = annual_loan_payment if year <= self.loan_term else 0
            
            income_tax = self.calculate_income_tax(
                annual_revenue, depreciation, loan_payment, annual_manufacturing_cost
            )
            
            after_tax_profit = self.calculate_after_tax_profit(
                annual_revenue, loan_payment, annual_manufacturing_cost, income_tax
            )
            
            after_tax_cash_flow = self.calculate_after_tax_cash_flow(after_tax_profit, depreciation)
            
            cash_flows.append({
                'year': year,
                'capital_investment': 0,
                'depreciation': depreciation,
                'remaining_plant_value': remaining_plant_value,
                'revenue': annual_revenue,
                'loan_payment': loan_payment,
                'manufacturing_cost': annual_manufacturing_cost,
                'income_tax': income_tax,
                'after_tax_net_profit': after_tax_profit,
                'after_tax_cash_flow': after_tax_cash_flow
            })
        
        return cash_flows
    
    def calculate_financial_metrics(self, tci_usd: float, annual_revenue: float, 
                                  annual_manufacturing_cost: float, project_lifetime: int = 20) -> Dict[str, Any]:
        """
        Calculate NPV, IRR, and payback period according to spec formulas.
        ALSO transforms the schedule into Frontend-ready table with Sanitization.
        """
        # 1. Use your EXACT logic for raw numbers
        raw_cash_flow_schedule = self.generate_cash_flow_schedule(
            tci_usd, annual_revenue, annual_manufacturing_cost, project_lifetime
        )
        
        # Extract after-tax cash flows for NPV and IRR calculations
        after_tax_cash_flows = [cf['after_tax_cash_flow'] for cf in raw_cash_flow_schedule]
        
        # Calculate NPV using discount rate of 7%
        npv = nf.npv(self.discount_rate, after_tax_cash_flows)
        
        # Calculate IRR
        try:
            irr = nf.irr(after_tax_cash_flows)
            # Convert to percentage (96% = 0.96)
            irr_percent = irr if irr else 0.0
        except:
            irr_percent = 0.0
        
        # Calculate payback period (first year CDCF gets positive)
        cumulative_cash_flow = 0
        payback_period = None
        for cf in raw_cash_flow_schedule:
            cumulative_cash_flow += cf['after_tax_cash_flow']
            if cumulative_cash_flow >= 0 and payback_period is None:
                payback_period = cf['year']
        
        final_payback = payback_period if payback_period else project_lifetime + 1

        # ---------------------------------------------------------------------
        # 2. NEW: Format & Sanitize Table for Frontend (Fixes NaN Error)
        # ---------------------------------------------------------------------
        df = pd.DataFrame(raw_cash_flow_schedule)

        # Add columns needed by Frontend (Cumulative, DCF, Discount Factor)
        df["CNDCF (USD)"] = df["after_tax_cash_flow"].cumsum()
        
        # Discount Factor: (1 + r)^-year. For negative years, it compounds.
        df["Discount Factor"] = (1 + self.discount_rate) ** -df["year"]
        
        df["DCF (USD)"] = df["after_tax_cash_flow"] * df["Discount Factor"]
        df["Cumulative DCF (USD)"] = df["DCF (USD)"].cumsum()

        # Map to Frontend String Keys
        # Note: Frontend expects "Capital Investment" as positive magnitude usually, but logic suggests pure flow
        # We will map your 'capital_investment' (which is negative in your code) to the column.
        # If you want it to appear as a cost (negative) in the table, keep it as is.
        formatted_rows = []
        for _, row in df.iterrows():
            formatted_rows.append({
                "Year": int(row["year"]),
                "Capital Investment (USD)": row["capital_investment"],
                "Depreciation (USD)": row["depreciation"],
                "Remaining value of Plant (USD)": row["remaining_plant_value"],
                "Revenue (USD)": row["revenue"],
                "Loan Payment (USD)": row["loan_payment"],
                "Manufacturing Cost (USD)": row["manufacturing_cost"],
                "Income Tax (USD)": row["income_tax"],
                "After-Tax Net Profit (USD)": row["after_tax_net_profit"],
                "After-Tax Cash Flow (USD)": row["after_tax_cash_flow"],
                "CNDCF (USD)": row["CNDCF (USD)"],
                "Discount Factor": row["Discount Factor"],
                "DCF (USD)": row["DCF (USD)"],
                "Cumulative DCF (USD)": row["Cumulative DCF (USD)"]
            })

        # SANITIZATION: Convert to DataFrame again to clean NaNs effectively
        final_df = pd.DataFrame(formatted_rows)
        final_df = final_df.replace([np.inf, -np.inf], 0)
        final_df = final_df.fillna(0)
        
        sanitized_table = final_df.to_dict(orient="records")

        return {
            'npv': 0.0 if np.isnan(npv) else npv, # Sanitize scalar results too
            'irr': 0.0 if np.isnan(irr_percent) else irr_percent,
            'payback_period': final_payback,
            'cash_flow_schedule': sanitized_table # <-- This is now safe for JSONB
        }