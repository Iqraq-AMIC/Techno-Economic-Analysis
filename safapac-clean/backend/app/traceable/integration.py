# app/traceable/integration.py

"""
Traceable Calculation Integration Module

This is the main orchestrator that combines all traceable calculation layers
to produce comprehensive results with full calculation transparency.

Architecture:
    - TraceableBase: 7 foundation metrics (TCI, OPEX, LCOP, Revenue, Production, CI, Emissions)
    - TraceableLayer1: 5 consumption/production metrics
    - TraceableLayer2: 4 cost component metrics
    - TraceableLayer3: 2 aggregation metrics
    - TraceableLayer4: 3 final KPI metrics
    - TraceableFinancial: 3 financial analysis metrics

Total: 24 traceable metrics
"""

from app.traceable.base import TraceableBase
from app.traceable.layer1 import TraceableLayer1
from app.traceable.layer2 import TraceableLayer2
from app.traceable.layer3 import TraceableLayer3
from app.traceable.layer4 import TraceableLayer4
from app.traceable.financial import TraceableFinancial
from app.services.economics import BiofuelEconomics
from app.models.calculation_data import UserInputs
from app.crud.biofuel_crud import BiofuelCRUD


class TraceableIntegration:
    """
    Main orchestrator for traceable economics calculations.

    This class coordinates all traceable calculation layers and combines them
    with the standard BiofuelEconomics calculations to produce comprehensive
    results with full calculation transparency.
    """

    def __init__(self, inputs: UserInputs, crud: BiofuelCRUD):
        """
        Initialize the Traceable Integration orchestrator.

        Args:
            inputs: User input parameters containing economic and conversion data
            crud: Database CRUD operations for accessing reference data
        """
        self.economics = BiofuelEconomics(inputs, crud)
        self.inputs = inputs

        # Initialize all traceable layer calculators
        self.base = TraceableBase(inputs)
        self.layer1 = TraceableLayer1(inputs)
        self.layer2 = TraceableLayer2(inputs)
        self.layer3 = TraceableLayer3(inputs)
        self.layer4 = TraceableLayer4(inputs)
        self.financial = TraceableFinancial(inputs)

    def run(self, process_id: int, feedstock_id: int, country_id: int, product_key: str = "jet") -> dict:
        """
        Run calculation and return results with all traceable KPIs.

        This method:
        1. Runs the standard BiofuelEconomics calculation
        2. Creates traceable outputs for all 24 metrics across 6 layers
        3. Attaches traceable data to the results dictionary

        Args:
            process_id: ID of the conversion process
            feedstock_id: ID of the feedstock
            country_id: ID of the country
            product_key: Main product key (default: "jet")

        Returns:
            dict: Results with enhanced techno_economics containing TraceableValue objects
        """
        # Run the standard calculation
        results = self.economics.run(process_id, feedstock_id, country_id, product_key)

        # Extract values for traceability
        techno = results["techno_economics"]
        financials = results.get("financials", {})

        # ===== BASE LAYER: 7 Foundation Metrics =====
        tci_traceable = self.base.create_tci_traceable(techno)
        opex_traceable = self.base.create_opex_traceable(techno)
        lcop_traceable = self.base.create_lcop_traceable(techno, financials)
        revenue_traceable = self.base.create_revenue_traceable(techno)
        production_traceable = self.base.create_production_traceable(techno)
        carbon_intensity_traceable = self.base.create_carbon_intensity_traceable(techno)
        emissions_traceable = self.base.create_emissions_traceable(techno)

        # ===== LAYER 1: 5 Consumption & Production Metrics =====
        feedstock_consumption_traceable = self.layer1.create_feedstock_consumption_traceable(techno)
        hydrogen_consumption_traceable = self.layer1.create_hydrogen_consumption_traceable(techno)
        electricity_consumption_traceable = self.layer1.create_electricity_consumption_traceable(techno)
        carbon_conversion_efficiency_traceable = self.layer1.create_carbon_conversion_efficiency_traceable(techno)
        fuel_energy_content_traceable = self.layer1.create_fuel_energy_content_traceable(techno)

        # ===== LAYER 2: 4 Cost Component Metrics =====
        indirect_opex_traceable = self.layer2.create_indirect_opex_traceable(techno)
        feedstock_cost_traceable = self.layer2.create_feedstock_cost_traceable(techno)
        hydrogen_cost_traceable = self.layer2.create_hydrogen_cost_traceable(techno)
        electricity_cost_traceable = self.layer2.create_electricity_cost_traceable(techno)

        # ===== LAYER 3: 2 Aggregation Metrics =====
        direct_opex_traceable = self.layer3.create_direct_opex_traceable(techno)
        weighted_carbon_intensity_traceable = self.layer3.create_weighted_carbon_intensity_traceable(techno)

        # ===== LAYER 4: 3 Final KPI Metrics (Enhanced versions) =====
        total_opex_enhanced_traceable = self.layer4.create_total_opex_traceable(techno)
        lcop_enhanced_traceable = self.layer4.create_lcop_traceable(techno, financials)
        total_emissions_enhanced_traceable = self.layer4.create_total_emissions_traceable(techno)

        # ===== FINANCIAL LAYER: 3 Financial Analysis Metrics =====
        if financials:
            npv_traceable = self.financial.create_npv_traceable(financials, techno)
            irr_traceable = self.financial.create_irr_traceable(financials, techno)
            payback_period_traceable = self.financial.create_payback_period_traceable(financials, techno)
        else:
            npv_traceable = None
            irr_traceable = None
            payback_period_traceable = None

        # ===== ATTACH TRACEABLE VALUES TO RESULTS =====

        # Base layer outputs (7 metrics)
        results["techno_economics"]["total_capital_investment_traceable"] = tci_traceable.to_dict()
        results["techno_economics"]["total_opex_traceable"] = opex_traceable.to_dict()
        results["techno_economics"]["LCOP_traceable"] = lcop_traceable.to_dict()
        results["techno_economics"]["total_revenue_traceable"] = revenue_traceable.to_dict()
        results["techno_economics"]["production_traceable"] = production_traceable.to_dict()
        results["techno_economics"]["carbon_intensity_traceable"] = carbon_intensity_traceable.to_dict()
        results["techno_economics"]["total_emissions_traceable"] = emissions_traceable.to_dict()

        # Layer 1 outputs (5 metrics)
        results["techno_economics"]["feedstock_consumption_traceable"] = feedstock_consumption_traceable.to_dict()
        results["techno_economics"]["hydrogen_consumption_traceable"] = hydrogen_consumption_traceable.to_dict()
        results["techno_economics"]["electricity_consumption_traceable"] = electricity_consumption_traceable.to_dict()
        results["techno_economics"]["carbon_conversion_efficiency_traceable"] = carbon_conversion_efficiency_traceable.to_dict()
        results["techno_economics"]["fuel_energy_content_traceable"] = fuel_energy_content_traceable.to_dict()

        # Layer 2 outputs (4 metrics)
        results["techno_economics"]["indirect_opex_traceable"] = indirect_opex_traceable.to_dict()
        results["techno_economics"]["feedstock_cost_traceable"] = feedstock_cost_traceable.to_dict()
        results["techno_economics"]["hydrogen_cost_traceable"] = hydrogen_cost_traceable.to_dict()
        results["techno_economics"]["electricity_cost_traceable"] = electricity_cost_traceable.to_dict()

        # Layer 3 outputs (2 metrics)
        results["techno_economics"]["direct_opex_traceable"] = direct_opex_traceable.to_dict()
        results["techno_economics"]["weighted_carbon_intensity_traceable"] = weighted_carbon_intensity_traceable.to_dict()

        # Layer 4 outputs (3 metrics - enhanced versions)
        results["techno_economics"]["total_opex_enhanced_traceable"] = total_opex_enhanced_traceable.to_dict()
        results["techno_economics"]["lcop_enhanced_traceable"] = lcop_enhanced_traceable.to_dict()
        results["techno_economics"]["total_emissions_enhanced_traceable"] = total_emissions_enhanced_traceable.to_dict()

        # Financial layer outputs (3 metrics - only if financials exist)
        if npv_traceable and irr_traceable and payback_period_traceable:
            if "financials" not in results:
                results["financials"] = {}
            results["financials"]["npv_traceable"] = npv_traceable.to_dict()
            results["financials"]["irr_traceable"] = irr_traceable.to_dict()
            results["financials"]["payback_period_traceable"] = payback_period_traceable.to_dict()

        return results
