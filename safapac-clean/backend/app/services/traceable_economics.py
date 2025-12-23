# app/services/traceable_economics.py

"""
Traceable Economics Wrapper

Wraps the BiofuelEconomics class to add calculation transparency for key KPIs.
This module converts raw calculation results into TraceableValue objects with
formulas, components, and metadata.
"""

from app.models.traceable_value import TraceableValue, ComponentValue, create_traceable_value
from app.services.economics import BiofuelEconomics
from app.models.calculation_data import UserInputs
from app.crud.biofuel_crud import BiofuelCRUD


class TraceableEconomics:
    """
    Enhanced economics calculator that provides traceable results.

    This wrapper adds transparency by converting key KPIs (TCI, OPEX, LCOP)
    into TraceableValue objects with formulas and component breakdowns.
    """

    def __init__(self, inputs: UserInputs, crud: BiofuelCRUD):
        self.economics = BiofuelEconomics(inputs, crud)
        self.inputs = inputs

    def run(self, process_id: int, feedstock_id: int, country_id: int, product_key: str = "jet") -> dict:
        """
        Run calculation and return results with traceable key KPIs.

        Returns:
            dict: Results with enhanced techno_economics containing TraceableValue objects
        """
        # Run the standard calculation
        results = self.economics.run(process_id, feedstock_id, country_id, product_key)

        # Extract values for traceability
        techno = results["techno_economics"]

        # Create traceable TCI
        tci_traceable = self._create_tci_traceable(techno)

        # Create traceable OPEX
        opex_traceable = self._create_opex_traceable(techno)

        # Create traceable LCOP
        lcop_traceable = self._create_lcop_traceable(techno, results["financials"])

        # Update results with traceable values
        results["techno_economics"]["total_capital_investment_traceable"] = tci_traceable.to_dict()
        results["techno_economics"]["total_opex_traceable"] = opex_traceable.to_dict()
        results["techno_economics"]["LCOP_traceable"] = lcop_traceable.to_dict()

        return results

    def _create_tci_traceable(self, techno: dict) -> TraceableValue:
        """Create traceable TCI with formula and components."""
        tci = techno.get("total_capital_investment", 0)

        components = [
            ComponentValue(
                name="Total Capital Investment",
                value=tci,
                unit="MUSD",
                description="Total capital investment including working capital"
            )
        ]

        # Get economic parameters for metadata
        eco_params = self.inputs.economic_parameters
        metadata = {
            "tci_ref_musd": eco_params.tci_ref_musd,
            "reference_capacity_ktpa": eco_params.reference_capacity_ktpa,
            "scaling_exponent": eco_params.tci_scaling_exponent,
            "working_capital_ratio": eco_params.working_capital_tci_ratio
        }

        formula = (
            "TCI = TCI_ref × (Capacity / Capacity_ref)^scaling_exponent × (1 + working_capital_ratio)"
        )

        return TraceableValue(
            value=tci,
            unit="MUSD",
            formula=formula,
            components=components,
            metadata=metadata
        )

    def _create_opex_traceable(self, techno: dict) -> TraceableValue:
        """Create traceable OPEX with formula and component breakdown."""
        total_opex = techno.get("total_opex", 0)
        opex_breakdown = techno.get("opex_breakdown", {})

        components = [
            ComponentValue(
                name="Feedstock Cost",
                value=opex_breakdown.get("feedstock", 0),
                unit="USD/year",
                description="Annual feedstock procurement cost"
            ),
            ComponentValue(
                name="Hydrogen Cost",
                value=opex_breakdown.get("hydrogen", 0),
                unit="USD/year",
                description="Annual hydrogen utility cost"
            ),
            ComponentValue(
                name="Electricity Cost",
                value=opex_breakdown.get("electricity", 0),
                unit="USD/year",
                description="Annual electricity utility cost"
            ),
            ComponentValue(
                name="Indirect OPEX",
                value=opex_breakdown.get("indirect_opex", 0),
                unit="USD/year",
                description="Indirect operating expenses (maintenance, labor, overhead)"
            )
        ]

        formula = (
            "Total OPEX = Feedstock_cost + Hydrogen_cost + Electricity_cost + Indirect_OPEX"
        )

        metadata = {
            "indirect_opex_ratio": self.inputs.economic_parameters.indirect_opex_tci_ratio,
            "annual_load_hours": self.inputs.conversion_plant.annual_load_hours
        }

        return TraceableValue(
            value=total_opex,
            unit="USD/year",
            formula=formula,
            components=components,
            metadata=metadata
        )

    def _create_lcop_traceable(self, techno: dict, financials: dict) -> TraceableValue:
        """Create traceable LCOP with formula and component breakdown."""
        lcop = techno.get("LCOP", 0)
        tci = techno.get("total_capital_investment", 0)
        total_opex = techno.get("total_opex", 0)
        total_revenue = techno.get("total_revenue", 0)
        production = techno.get("production", 0)

        # Calculate annualized TCI
        discount_rate = self.inputs.economic_parameters.discount_rate_percent / 100
        lifetime = self.inputs.economic_parameters.project_lifetime_years

        # Capital Recovery Factor
        if discount_rate > 0:
            crf = (discount_rate * (1 + discount_rate) ** lifetime) / ((1 + discount_rate) ** lifetime - 1)
        else:
            crf = 1 / lifetime

        tci_annual = tci * 1_000_000 * crf  # Convert MUSD to USD

        components = [
            ComponentValue(
                name="Annualized TCI",
                value=tci_annual,
                unit="USD/year",
                description="Total capital investment annualized using capital recovery factor"
            ),
            ComponentValue(
                name="Total Operating Expenses",
                value=total_opex,
                unit="USD/year",
                description="Total annual operating expenses"
            ),
            ComponentValue(
                name="Byproduct Revenue",
                value=total_revenue,
                unit="USD/year",
                description="Revenue from byproducts (diesel, naphtha, etc.)"
            ),
            ComponentValue(
                name="SAF Production",
                value=production,
                unit="t/year",
                description="Annual production of sustainable aviation fuel"
            )
        ]

        formula = (
            "LCOP = (TCI_annual + OPEX_total - Revenue_byproducts) / SAF_production"
        )

        metadata = {
            "discount_rate_percent": self.inputs.economic_parameters.discount_rate_percent,
            "project_lifetime_years": lifetime,
            "capital_recovery_factor": crf,
            "npv_usd": financials.get("npv", 0),
            "irr_percent": financials.get("irr", 0),
            "payback_period_years": financials.get("payback_period", 0)
        }

        return TraceableValue(
            value=lcop,
            unit="USD/t",
            formula=formula,
            components=components,
            metadata=metadata
        )
