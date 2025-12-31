# app/traceable/__init__.py

"""
Traceable Calculation Module

This module provides comprehensive calculation transparency for all key metrics.
Each calculation includes inputs, step-by-step breakdowns, and metadata.

Architecture:
    - models.py: Core data classes (TraceableValue, ComponentValue, CalculationStep)
    - base.py: Foundation metrics (TCI, OPEX, LCOP, Revenue, Production, CI, Emissions)
    - layer1.py: Consumption & production metrics (Feedstock, H2, Electricity, CCE, FEC)
    - layer2.py: Cost components (Indirect OPEX, Feedstock/H2/Electricity costs)
    - layer3.py: Aggregation metrics (Direct OPEX, Weighted CI)
    - layer4.py: Final KPIs (Enhanced OPEX, LCOP, Emissions)
    - financial.py: Financial analysis (NPV, IRR, Payback Period)
    - integration.py: Main orchestrator that combines all layers

Usage:
    from app.traceable import TraceableIntegration

    integration = TraceableIntegration(inputs, crud)
    results = integration.run(process_id, feedstock_id, country_id)
"""

# Core models
from app.traceable.models import (
    TraceableValue,
    ComponentValue,
    CalculationStep,
    TraceableValueSchema,
    ComponentValueSchema,
    CalculationStepSchema,
    create_traceable_value,
)

# Layer classes
from app.traceable.base import TraceableBase
from app.traceable.layer1 import TraceableLayer1
from app.traceable.layer2 import TraceableLayer2
from app.traceable.layer3 import TraceableLayer3
from app.traceable.layer4 import TraceableLayer4
from app.traceable.financial import TraceableFinancial

# Main integration class
from app.traceable.integration import TraceableIntegration

__all__ = [
    # Models
    "TraceableValue",
    "ComponentValue",
    "CalculationStep",
    "TraceableValueSchema",
    "ComponentValueSchema",
    "CalculationStepSchema",
    "create_traceable_value",
    # Layer classes
    "TraceableBase",
    "TraceableLayer1",
    "TraceableLayer2",
    "TraceableLayer3",
    "TraceableLayer4",
    "TraceableFinancial",
    # Integration
    "TraceableIntegration",
]
