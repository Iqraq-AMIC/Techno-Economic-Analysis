# app/models/traceable_value.py

"""
Traceable Value Models for Calculation Transparency

Provides detailed calculation lineage for key KPIs, showing the formula,
components, and breakdown of how values were calculated.
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
from pydantic import BaseModel


@dataclass
class ComponentValue:
    """
    Represents a single component in a calculation.

    Example:
        ComponentValue(
            name="Feedstock Cost",
            value=450000000.0,
            unit="USD/year",
            description="Annual feedstock procurement cost"
        )
    """
    name: str
    value: float
    unit: str
    description: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return asdict(self)


@dataclass
class TraceableValue:
    """
    A value with full calculation transparency.

    Attributes:
        value: The final calculated value
        unit: Unit of measurement
        formula: Human-readable formula showing calculation
        components: List of component values that contributed to this result
        metadata: Additional context (e.g., assumptions, reference data)

    Example:
        TraceableValue(
            value=1173.8,
            unit="USD/t",
            formula="LCOP = (TCI_annual + OPEX_total - Revenue_byproducts) / SAF_production",
            components=[
                ComponentValue("TCI_annual", 58500000, "USD/year"),
                ComponentValue("OPEX_total", 710150000, "USD/year"),
                ComponentValue("Revenue_byproducts", 250000000, "USD/year"),
                ComponentValue("SAF_production", 605000, "t/year")
            ],
            metadata={"discount_rate": 0.07, "project_lifetime": 20}
        )
    """
    value: float
    unit: str
    formula: str
    components: List[ComponentValue]
    metadata: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "value": self.value,
            "unit": self.unit,
            "formula": self.formula,
            "components": [comp.to_dict() for comp in self.components],
            "metadata": self.metadata or {}
        }


# Pydantic schemas for API responses
class ComponentValueSchema(BaseModel):
    """Pydantic schema for ComponentValue."""
    name: str
    value: float
    unit: str
    description: Optional[str] = None


class TraceableValueSchema(BaseModel):
    """Pydantic schema for TraceableValue."""
    value: float
    unit: str
    formula: str
    components: List[ComponentValueSchema]
    metadata: Optional[Dict[str, Any]] = None


# Helper function to create traceable values
def create_traceable_value(
    value: float,
    unit: str,
    formula: str,
    components: List[Dict[str, Any]],
    metadata: Optional[Dict[str, Any]] = None
) -> TraceableValue:
    """
    Factory function to create a TraceableValue from dictionaries.

    Args:
        value: Final calculated value
        unit: Unit of measurement
        formula: Human-readable formula
        components: List of component dictionaries
        metadata: Optional metadata dict

    Returns:
        TraceableValue instance
    """
    component_objects = [
        ComponentValue(
            name=comp.get("name", "Unknown"),
            value=comp.get("value", 0.0),
            unit=comp.get("unit", ""),
            description=comp.get("description")
        )
        for comp in components
    ]

    return TraceableValue(
        value=value,
        unit=unit,
        formula=formula,
        components=component_objects,
        metadata=metadata
    )
