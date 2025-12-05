"""
Financial Analysis
------------------
Implements the flowchart Financial Analysis exactly.

This module calculates NPV, IRR, and Payback Period using the simple
formula from the flowchart, not the complex loan/depreciation model.
"""

import numpy as np
import numpy_financial as nf
import pandas as pd
from typing import List, Dict, Any


class FinancialAnalysis:
    """
    Financial Analysis
    ------------------
    Matches flowchart Financial Analysis exactly.

    INPUTS:
        - Total capital investment in USD
        - Annual revenue from Layer 2
        - Annual manufacturing cost (Total OPEX from Layer 4)
        - Project lifetime and discount rate

    CALCULATIONS:
        1. For each year (0 to lifetime):
           - Year 0 (Construction): Capital expenditure = -TCI, Revenue = 0, Cash flow = -TCI
           - Years 1-N (Operations): Capital expenditure = 0, Cash flow = Revenue - Manufacturing Cost
        2. Net Present Value: NPV = Σ [Cash_Flow_t / (1 + r)^t]
        3. Internal Rate of Return: Find r where NPV = 0
        4. Payback Period: First year where cumulative cash flow > 0

    OUTPUTS:
        - NPV (USD)
        - IRR (%)
        - Payback period (years)
        - Cash flow schedule table
    """

    def __init__(self, discount_rate: float = 0.07):
        self.discount_rate = discount_rate

    def generate_cash_flow_schedule(self, tci_usd: float, annual_revenue: float,
                                     annual_manufacturing_cost: float,
                                     project_lifetime: int = 20) -> List[Dict[str, Any]]:
        """
        Generate cash flow schedule according to flowchart.

        Year 0: Construction year with capital expenditure
        Years 1-N: Operating years with revenue and costs
        """
        cash_flows = []

        # === YEAR 0 (CONSTRUCTION) ===
        # Capital expenditure = -TCI, Revenue = 0, Cash flow = -TCI
        cash_flows.append({
            'year': 0,
            'capital_investment': -tci_usd,
            'revenue': 0,
            'manufacturing_cost': 0,
            'after_tax_cash_flow': -tci_usd
        })

        # === YEARS 1-N (OPERATIONS) ===
        # Capital expenditure = 0, Cash flow = Revenue - Manufacturing Cost
        for year in range(1, project_lifetime + 1):
            cash_flow = annual_revenue - annual_manufacturing_cost

            cash_flows.append({
                'year': year,
                'capital_investment': 0,
                'revenue': annual_revenue,
                'manufacturing_cost': annual_manufacturing_cost,
                'after_tax_cash_flow': cash_flow
            })

        return cash_flows

    def calculate_financial_metrics(self, tci_usd: float, annual_revenue: float,
                                     annual_manufacturing_cost: float,
                                     project_lifetime: int = 20) -> Dict[str, Any]:
        """
        Calculate NPV, IRR, and payback period according to flowchart formulas.

        Args:
            tci_usd: Total capital investment in USD
            annual_revenue: Annual revenue in USD/year
            annual_manufacturing_cost: Total OPEX in USD/year
            project_lifetime: Project lifetime in years

        Returns:
            Dictionary containing NPV, IRR, payback period, and cash flow table
        """
        # Generate cash flow schedule
        raw_cash_flow_schedule = self.generate_cash_flow_schedule(
            tci_usd, annual_revenue, annual_manufacturing_cost, project_lifetime
        )

        # Extract after-tax cash flows for NPV and IRR calculations
        after_tax_cash_flows = [cf['after_tax_cash_flow'] for cf in raw_cash_flow_schedule]

        # === CALCULATION (2): Net Present Value ===
        # NPV = Σ [Cash_Flow_t / (1 + r)^t]
        npv = nf.npv(self.discount_rate, after_tax_cash_flows)

        # === CALCULATION (3): Internal Rate of Return ===
        # Find r where NPV = 0
        try:
            irr = nf.irr(after_tax_cash_flows)
            irr_value = irr if irr and not np.isnan(irr) else 0.0
        except:
            irr_value = 0.0

        # === CALCULATION (4): Payback Period ===
        # First year where cumulative cash flow > 0
        cumulative_cash_flow = 0
        payback_period = None

        for cf in raw_cash_flow_schedule:
            cumulative_cash_flow += cf['after_tax_cash_flow']
            if cumulative_cash_flow >= 0 and payback_period is None:
                payback_period = cf['year']

        final_payback = payback_period if payback_period is not None else project_lifetime + 1

        # Format table for frontend
        df = pd.DataFrame(raw_cash_flow_schedule)

        # Add calculated columns
        df["CNDCF (USD)"] = df["after_tax_cash_flow"].cumsum()
        df["Discount Factor"] = (1 + self.discount_rate) ** -df["year"]
        df["DCF (USD)"] = df["after_tax_cash_flow"] * df["Discount Factor"]
        df["Cumulative DCF (USD)"] = df["DCF (USD)"].cumsum()

        # Map to frontend string keys
        formatted_rows = []
        for _, row in df.iterrows():
            formatted_rows.append({
                "Year": int(row["year"]),
                "Capital Investment (USD)": row["capital_investment"],
                "Revenue (USD)": row["revenue"],
                "Manufacturing Cost (USD)": row["manufacturing_cost"],
                "After-Tax Cash Flow (USD)": row["after_tax_cash_flow"],
                "CNDCF (USD)": row["CNDCF (USD)"],
                "Discount Factor": row["Discount Factor"],
                "DCF (USD)": row["DCF (USD)"],
                "Cumulative DCF (USD)": row["Cumulative DCF (USD)"]
            })

        # Sanitize table (replace NaN and inf)
        final_df = pd.DataFrame(formatted_rows)
        final_df = final_df.replace([np.inf, -np.inf], 0)
        final_df = final_df.fillna(0)

        sanitized_table = final_df.to_dict(orient="records")

        return {
            'npv': 0.0 if np.isnan(npv) else npv,
            'irr': 0.0 if np.isnan(irr_value) else irr_value,
            'payback_period': final_payback,
            'cash_flow_schedule': sanitized_table
        }
