# app/traceable/financial.py

"""
Financial Analysis Traceable Calculations

Handles financial metric calculations (NPV, IRR, Payback Period).
Based on the implementation plan Phase 2.6 (Financial Analysis).

Calculations:
- Net Present Value (NPV)
- Internal Rate of Return (IRR)
- Payback Period
"""

from typing import Dict, List
from app.traceable.models import TraceableValue, ComponentValue, CalculationStep
from app.models.calculation_data import UserInputs


class TraceableFinancial:
    """
    Financial analysis traceable calculations.

    This class creates traceable outputs for:
    - Net Present Value (NPV)
    - Internal Rate of Return (IRR)
    - Payback Period
    """

    def __init__(self, inputs: UserInputs):
        """
        Initialize Financial traceable calculator.

        Args:
            inputs: User input parameters containing economic data
        """
        self.inputs = inputs

    def create_npv_traceable(self, financials: dict, techno: dict) -> TraceableValue:
        """
        Create traceable NPV with inputs and calculation steps.

        Formula: NPV = Σ [Cash_Flow_t / (1 + r)^t] for t = 0 to n

        Args:
            financials: Financial analysis results dictionary
            techno: Technical economics results dictionary

        Returns:
            TraceableValue with complete calculation breakdown
        """
        npv = financials.get("npv", 0)
        cash_flows = financials.get("cash_flows", [])
        discount_rate = self.inputs.economic_parameters.discount_rate_percent / 100
        lifetime = self.inputs.economic_parameters.project_lifetime_years

        # Get key financial inputs
        tci = techno.get("total_capital_investment", 0) * 1_000_000  # Convert to USD
        total_opex = techno.get("total_opex", 0)
        total_revenue = techno.get("total_revenue", 0)
        production = techno.get("production", 0)
        lcop = techno.get("LCOP", 0)

        # Calculate annual net cash flow (simplified)
        annual_net_cash_flow = total_revenue - total_opex

        components = []
        calculation_steps = []
        step_num = 1

        # Year 0: Initial investment (negative cash flow)
        if cash_flows and len(cash_flows) > 0:
            year_0_cf = cash_flows[0] if cash_flows[0] < 0 else -tci
        else:
            year_0_cf = -tci

        discounted_year_0 = year_0_cf / ((1 + discount_rate) ** 0)

        components.append(
            ComponentValue(
                name="Year 0 (Initial Investment)",
                value=year_0_cf,
                unit="USD",
                description=f"Initial capital investment (discounted: {discounted_year_0:,.2f} USD)"
            )
        )

        calculation_steps.append(
            CalculationStep(
                step=step_num,
                description="Year 0: Initial investment",
                formula="dcf_0 = cash_flow_0 / (1 + r)^0",
                calculation=f"{year_0_cf:,.2f} / (1 + {discount_rate})^0 = {discounted_year_0:,.2f}",
                result={"value": discounted_year_0, "unit": "USD"}
            )
        )
        step_num += 1

        # Sample years (1, 5, 10, 15, 20, 25)
        sample_years = [1, 5, 10, 15, 20, 25]
        cumulative_npv = discounted_year_0

        for year in sample_years:
            if year <= lifetime:
                if cash_flows and year < len(cash_flows):
                    cash_flow = cash_flows[year]
                else:
                    cash_flow = annual_net_cash_flow

                discount_factor = (1 + discount_rate) ** year
                discounted_cf = cash_flow / discount_factor
                cumulative_npv += discounted_cf

                components.append(
                    ComponentValue(
                        name=f"Year {year}",
                        value=discounted_cf,
                        unit="USD",
                        description=f"Discounted cash flow: {cash_flow:,.2f} / {discount_factor:.4f}"
                    )
                )

                calculation_steps.append(
                    CalculationStep(
                        step=step_num,
                        description=f"Year {year}: Discount cash flow",
                        formula=f"dcf_{year} = cash_flow_{year} / (1 + r)^{year}",
                        calculation=f"{cash_flow:,.2f} / (1 + {discount_rate})^{year} = {discounted_cf:,.2f}",
                        result={"value": discounted_cf, "unit": "USD"},
                        details={
                            "cash_flow": f"{cash_flow:,.2f}",
                            "discount_factor": f"{discount_factor:.4f}",
                            "discounted_cf": f"{discounted_cf:,.2f}"
                        }
                    )
                )
                step_num += 1

        # Final NPV sum step
        calculation_steps.append(
            CalculationStep(
                step=step_num,
                description="Sum all discounted cash flows",
                formula="npv = Σ(dcf_t) for t = 0 to n",
                calculation=f"Sum of all {lifetime} years = {npv:,.2f}",
                result={"value": npv, "unit": "USD"}
            )
        )

        inputs = {
            "initial_investment": {"value": tci, "unit": "USD"},
            "annual_revenue": {"value": total_revenue, "unit": "USD/year"},
            "annual_opex": {"value": total_opex, "unit": "USD/year"},
            "annual_net_cash_flow": {"value": annual_net_cash_flow, "unit": "USD/year"},
            "discount_rate": {"value": discount_rate, "unit": "ratio"},
            "project_lifetime": {"value": lifetime, "unit": "years"}
        }

        formula = "NPV = Σ [Cash_Flow_t / (1 + r)^t] for t = 0 to n"

        metadata = {
            "discount_rate_percent": self.inputs.economic_parameters.discount_rate_percent,
            "project_lifetime_years": lifetime,
            "total_cash_flows_count": len(cash_flows) if cash_flows else lifetime + 1,
            "npv_positive": bool(npv > 0),
            "economic_viability": "Profitable" if npv > 0 else "Not profitable",
            "note": "NPV > 0 indicates the project is expected to generate value"
        }

        return TraceableValue(
            name="Net Present Value",
            value=npv,
            unit="USD",
            formula=formula,
            inputs=inputs,
            calculation_steps=calculation_steps,
            components=components,
            metadata=metadata
        )

    def create_irr_traceable(self, financials: dict, techno: dict) -> TraceableValue:
        """
        Create traceable IRR with inputs and calculation steps.

        Formula: Find r where NPV = 0 (numerical solution)

        Args:
            financials: Financial analysis results dictionary
            techno: Technical economics results dictionary

        Returns:
            TraceableValue with complete calculation breakdown
        """
        irr = financials.get("irr", 0)
        irr_percent = irr * 100 if irr < 1 else irr  # Ensure percentage
        cash_flows = financials.get("cash_flows", [])
        discount_rate = self.inputs.economic_parameters.discount_rate_percent / 100
        lifetime = self.inputs.economic_parameters.project_lifetime_years

        # Get key financial inputs
        tci = techno.get("total_capital_investment", 0) * 1_000_000
        total_opex = techno.get("total_opex", 0)
        total_revenue = techno.get("total_revenue", 0)
        annual_net_cash_flow = total_revenue - total_opex

        # Year 0 cash flow
        if cash_flows and len(cash_flows) > 0:
            year_0_cf = cash_flows[0] if cash_flows[0] < 0 else -tci
        else:
            year_0_cf = -tci

        # Calculate NPV at different discount rates for illustration
        test_rates = [0.05, 0.10, 0.15, irr_percent / 100]
        components = []
        calculation_steps = []
        step_num = 1

        for test_rate in test_rates:
            # Calculate NPV at this rate
            npv_at_rate = year_0_cf / ((1 + test_rate) ** 0)

            for year in range(1, min(lifetime + 1, 26)):  # Sample up to 25 years
                if cash_flows and year < len(cash_flows):
                    cash_flow = cash_flows[year]
                else:
                    cash_flow = annual_net_cash_flow

                npv_at_rate += cash_flow / ((1 + test_rate) ** year)

            is_irr = abs(test_rate * 100 - irr_percent) < 0.01

            components.append(
                ComponentValue(
                    name=f"NPV at {test_rate*100:.1f}%",
                    value=npv_at_rate,
                    unit="USD",
                    description=f"NPV when discount rate = {test_rate*100:.1f}%" + (" (IRR)" if is_irr else "")
                )
            )

            calculation_steps.append(
                CalculationStep(
                    step=step_num,
                    description=f"Calculate NPV at r = {test_rate*100:.1f}%",
                    formula="npv(r) = Σ [CF_t / (1 + r)^t]",
                    calculation=f"NPV at {test_rate*100:.1f}% = {npv_at_rate:,.2f}",
                    result={"value": npv_at_rate, "unit": "USD"},
                    details={
                        "test_rate": f"{test_rate*100:.2f}%",
                        "npv": f"{npv_at_rate:,.2f}",
                        "is_irr": is_irr
                    }
                )
            )
            step_num += 1

        # Final IRR determination step
        calculation_steps.append(
            CalculationStep(
                step=step_num,
                description="Find IRR where NPV = 0",
                formula="IRR = r where NPV(r) = 0",
                calculation=f"Numerical solution: IRR = {irr_percent:.4f}%",
                result={"value": irr_percent, "unit": "percent"},
                details={
                    "method": "Numerical iteration (Newton-Raphson or similar)",
                    "irr_decimal": f"{irr_percent / 100:.6f}",
                    "irr_percent": f"{irr_percent:.4f}%"
                }
            )
        )

        inputs = {
            "initial_investment": {"value": tci, "unit": "USD"},
            "annual_net_cash_flow": {"value": annual_net_cash_flow, "unit": "USD/year"},
            "project_lifetime": {"value": lifetime, "unit": "years"},
            "discount_rate_reference": {"value": discount_rate, "unit": "ratio"}
        }

        formula = "IRR: Find r where NPV(r) = 0, i.e., Σ [CF_t / (1 + r)^t] = 0"

        metadata = {
            "irr_decimal": irr_percent / 100,
            "irr_percent": irr_percent,
            "discount_rate_percent": self.inputs.economic_parameters.discount_rate_percent,
            "exceeds_discount_rate": bool(irr_percent > self.inputs.economic_parameters.discount_rate_percent),
            "economic_viability": "Profitable" if irr_percent > self.inputs.economic_parameters.discount_rate_percent else "Below hurdle rate",
            "note": "IRR > discount rate indicates the project meets minimum return requirements"
        }

        return TraceableValue(
            name="Internal Rate of Return",
            value=irr_percent,
            unit="percent",
            formula=formula,
            inputs=inputs,
            calculation_steps=calculation_steps,
            components=components,
            metadata=metadata
        )

    def create_payback_period_traceable(self, financials: dict, techno: dict) -> TraceableValue:
        """
        Create traceable Payback Period with inputs and calculation steps.

        Formula: Payback Period = First year where Cumulative_Cash_Flow > 0

        Args:
            financials: Financial analysis results dictionary
            techno: Technical economics results dictionary

        Returns:
            TraceableValue with complete calculation breakdown
        """
        payback_period = financials.get("payback_period", 0)
        cash_flows = financials.get("cash_flows", [])
        lifetime = self.inputs.economic_parameters.project_lifetime_years

        # Get key financial inputs
        tci = techno.get("total_capital_investment", 0) * 1_000_000
        total_opex = techno.get("total_opex", 0)
        total_revenue = techno.get("total_revenue", 0)
        annual_net_cash_flow = total_revenue - total_opex

        # Year 0 cash flow
        if cash_flows and len(cash_flows) > 0:
            year_0_cf = cash_flows[0] if cash_flows[0] < 0 else -tci
        else:
            year_0_cf = -tci

        components = []
        calculation_steps = []
        step_num = 1

        # Calculate cumulative cash flows
        cumulative_cf = year_0_cf

        components.append(
            ComponentValue(
                name="Year 0",
                value=cumulative_cf,
                unit="USD",
                description=f"Initial investment: {year_0_cf:,.2f}"
            )
        )

        calculation_steps.append(
            CalculationStep(
                step=step_num,
                description="Year 0: Initial investment",
                formula="cumulative_cf_0 = initial_investment",
                calculation=f"{year_0_cf:,.2f}",
                result={"value": cumulative_cf, "unit": "USD"}
            )
        )
        step_num += 1

        # Sample years to show cumulative build-up
        sample_years = list(range(1, min(int(payback_period) + 3, lifetime + 1)))

        payback_year = None
        for year in sample_years:
            if cash_flows and year < len(cash_flows):
                cash_flow = cash_flows[year]
            else:
                cash_flow = annual_net_cash_flow

            cumulative_cf += cash_flow

            # Check if this is the payback year
            if cumulative_cf > 0 and payback_year is None:
                payback_year = year

            is_payback = (payback_year == year)

            components.append(
                ComponentValue(
                    name=f"Year {year}" + (" (Payback)" if is_payback else ""),
                    value=cumulative_cf,
                    unit="USD",
                    description=f"Cumulative CF: {cumulative_cf:,.2f}" + (" - Investment recovered!" if is_payback else "")
                )
            )

            calculation_steps.append(
                CalculationStep(
                    step=step_num,
                    description=f"Year {year}: Add annual cash flow",
                    formula=f"cumulative_cf_{year} = cumulative_cf_{year-1} + cash_flow_{year}",
                    calculation=f"{cumulative_cf - cash_flow:,.2f} + {cash_flow:,.2f} = {cumulative_cf:,.2f}",
                    result={"value": cumulative_cf, "unit": "USD"},
                    details={
                        "annual_cash_flow": f"{cash_flow:,.2f}",
                        "cumulative_cf": f"{cumulative_cf:,.2f}",
                        "is_payback_year": is_payback
                    }
                )
            )
            step_num += 1

        # Final payback period determination
        calculation_steps.append(
            CalculationStep(
                step=step_num,
                description="Determine payback period",
                formula="payback = year where cumulative_cf > 0",
                calculation=f"First year with positive cumulative CF: Year {payback_period:.2f}",
                result={"value": payback_period, "unit": "years"}
            )
        )

        inputs = {
            "initial_investment": {"value": tci, "unit": "USD"},
            "annual_net_cash_flow": {"value": annual_net_cash_flow, "unit": "USD/year"},
            "project_lifetime": {"value": lifetime, "unit": "years"}
        }

        formula = "Payback Period = First year where Cumulative_Cash_Flow > 0"

        # Simple payback calculation for metadata
        simple_payback = tci / annual_net_cash_flow if annual_net_cash_flow > 0 else float('inf')

        metadata = {
            "payback_period_years": payback_period,
            "simple_payback_years": simple_payback,
            "investment_recovered": bool(payback_period < lifetime),
            "years_to_recover": payback_period,
            "note": f"Investment recovered in {payback_period:.2f} years" if payback_period < lifetime else "Investment not recovered within project lifetime"
        }

        return TraceableValue(
            name="Payback Period",
            value=payback_period,
            unit="years",
            formula=formula,
            inputs=inputs,
            calculation_steps=calculation_steps,
            components=components,
            metadata=metadata
        )
