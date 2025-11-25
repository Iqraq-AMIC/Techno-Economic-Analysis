# app/services/financial_analysis.py

import numpy as np
import numpy_financial as nf
from typing import List, Dict, Any

import pandas as pd

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
    
    def generate_cash_flow_table(self, tci_usd: float, annual_revenue: float, 
                                 annual_manufacturing_cost: float, project_lifetime: int = 20) -> List[Dict[str, Any]]:
        """
        Generates the full table with headers matching the React Frontend.
        """
        
        # --- 1. Setup Parameters ---
        loan_amount = tci_usd * (1 - self.equity_ratio)
        # Annuity payment formula
        if self.bank_interest_rate > 0:
            annuity_factor = (1 - (1 + self.bank_interest_rate) ** -self.loan_term) / self.bank_interest_rate
            annual_loan_payment = loan_amount / annuity_factor
        else:
            annual_loan_payment = loan_amount / self.loan_term

        working_capital = tci_usd * self.working_capital_ratio
        
        # Land cost (Hardcoded estimation based on previous spec context or 0 if unknown)
        # Assuming a small fraction or separate input. Using 0 for generic calc unless spec'd.
        land_cost = 0 

        # Equity Investment (The cash put down at Year -1)
        equity_investment = (tci_usd * self.equity_ratio) 

        rows = []

        # --- 2. Build Rows (Construction Phase: -2 to 0) ---
        
        # Year -2: Land Purchase (Optional, keeping 0 based on typical inputs unless specified)
        rows.append({
            "year": -2,
            "capex": land_cost, # Outflow
            "revenue": 0,
            "opex": 0,
            "depreciation": 0,
            "loan_payment": 0,
            "tax": 0,
            "remaining_value": 0
        })

        # Year -1: Equity Investment (Major CapEx)
        rows.append({
            "year": -1,
            "capex": equity_investment, 
            "revenue": 0,
            "opex": 0,
            "depreciation": 0,
            "loan_payment": 0,
            "tax": 0,
            "remaining_value": 0
        })

        # Year 0: Working Capital & Completion
        rows.append({
            "year": 0,
            "capex": working_capital,
            "revenue": 0,
            "opex": 0,
            "depreciation": 0,
            "loan_payment": 0,
            "tax": 0,
            "remaining_value": tci_usd # Plant is worth TCI at start
        })

        # --- 3. Build Rows (Operations Phase: 1 to Lifetime) ---
        accumulated_depreciation = 0
        
        for year in range(1, project_lifetime + 1):
            # Depreciation
            depreciation = tci_usd * self.depreciation_rate if year <= 20 else 0
            accumulated_depreciation += depreciation
            remaining_value = max(0, tci_usd - accumulated_depreciation)

            # Loan Payment (Principal + Interest)
            loan_pay = annual_loan_payment if year <= self.loan_term else 0

            # Tax Calculation
            # Taxable Income = Revenue - Deprec - LoanInterest(usually) - Opex
            # Simplified Spec: Taxable = Revenue - Deprec - LoanPayment(Total) - Opex
            taxable_income = annual_revenue - depreciation - loan_pay - annual_manufacturing_cost
            tax = max(0, taxable_income * self.income_tax_rate)

            # After Tax Net Profit (ATNP)
            atnp = annual_revenue - loan_pay - annual_manufacturing_cost - tax

            rows.append({
                "year": year,
                "capex": 0,
                "revenue": annual_revenue,
                "opex": annual_manufacturing_cost,
                "depreciation": depreciation,
                "loan_payment": loan_pay,
                "tax": tax,
                "remaining_value": remaining_value,
                "atnp": atnp
            })

        # --- 4. Create DataFrame for Financial Math ---
        df = pd.DataFrame(rows)

        # Calculate After-Tax Cash Flow (ATCF)
        # For years < 1: ATCF = -(CapEx)
        # For years >= 1: ATCF = ATNP + Depreciation
        df['atcf'] = df.apply(
            lambda row: -(row['capex']) if row['year'] < 1 else (row.get('atnp', 0) + row['depreciation']), 
            axis=1
        )

        # Cumulative Non-Discounted Cash Flow (CNDCF)
        df['cndcf'] = df['atcf'].cumsum()

        # Discount Factor: 1 / (1 + r)^n
        # We assume Year 0 is the base year. 
        # For Year -2, factor = 1*(1+r)^2 (Compounding) or just treat as negative power.
        # Standard convention: (1 + r) ** -year
        df['discount_factor'] = (1 + self.discount_rate) ** -df['year']

        # Discounted Cash Flow (DCF)
        df['dcf'] = df['atcf'] * df['discount_factor']

        # Cumulative DCF
        df['cumulative_dcf'] = df['dcf'].cumsum()

        # --- 5. Map to Frontend Keys ---
        # This dictionary maps Python logic to the Strings expected by React
        frontend_data = []
        for _, row in df.iterrows():
            mapped_row = {
                "Year": int(row['year']),
                "Capital Investment (USD)": row['capex'] * -1 if row['capex'] > 0 else 0, # Show as negative or positive depending on UI pref? Usually UI expects just the amount. Let's keep it signed correctly.
                # Frontend usually expects Capital Investment as a negative number in the column? 
                # Looking at your screenshot, -7,500,000 is shown. So keep it negative.
                "Capital Investment (USD)": -row['capex'], 
                
                "Depreciation (USD)": row['depreciation'],
                "Remaining value of Plant (USD)": row['remaining_value'],
                "Revenue (USD)": row['revenue'],
                "Loan Payment (USD)": row['loan_payment'],
                "Manufacturing Cost (USD)": row['opex'],
                "Income Tax (USD)": row['tax'],
                "After-Tax Net Profit (USD)": row.get('atnp', 0),
                "After-Tax Cash Flow (USD)": row['atcf'],
                "CNDCF (USD)": row['cndcf'], # Cumulative Non-Discounted
                "Discount Factor": row['discount_factor'],
                "DCF (USD)": row['dcf'],
                "Cumulative DCF (USD)": row['cumulative_dcf']
            }
            frontend_data.append(mapped_row)

        return frontend_data

    def calculate_metrics(self, cash_flow_table: List[Dict[str, Any]]) -> Dict[str, float]:
        """
        Extracts NPV, IRR, Payback from the generated table.
        """
        df = pd.DataFrame(cash_flow_table)
        atcf_series = df['After-Tax Cash Flow (USD)'].values

        # NPV (Net Present Value) - Last value of Cumulative DCF
        npv = df['Cumulative DCF (USD)'].iloc[-1]

        # IRR (Internal Rate of Return)
        try:
            irr = nf.irr(atcf_series)
            irr = 0 if np.isnan(irr) else irr
        except:
            irr = 0

        # Payback Period (First year where Cumulative DCF > 0)
        # Note: Often Payback is calculated on *Non-Discounted* flows. 
        # Standard spec usually implies Simple Payback (Non-Discounted).
        # Let's check CNDCF.
        positive_years = df[df['CNDCF (USD)'] >= 0]
        if not positive_years.empty:
            payback = int(positive_years.iloc[0]['Year'])
        else:
            payback = 0 # Never pays back

        return {
            "npv": npv,
            "irr": irr,
            "payback_period": payback
        }