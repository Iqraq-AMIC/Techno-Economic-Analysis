# app/traceable/models.py

"""
Traceable Value Models for Calculation Transparency

Provides detailed calculation lineage for key KPIs, showing the formula,
components, and breakdown of how values were calculated.
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict, field
from pydantic import BaseModel


@dataclass
class CalculationStep:
    """
    Represents a single step in a calculation process.

    Example:
        CalculationStep(
            step=1,
            description="Calculate capacity ratio",
            formula="ratio = capacity / capacity_ref",
            calculation="500000 / 500000 = 1.0",
            result={"value": 1.0, "unit": "dimensionless"}
        )
    """
    step: int
    description: str
    formula: str
    calculation: str
    result: Dict[str, Any]
    details: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return asdict(self)


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
        name: Name of the metric (optional for backward compatibility)
        value: The final calculated value
        unit: Unit of measurement
        formula: Human-readable formula showing calculation
        inputs: Dictionary of input values with units (optional)
        calculation_steps: Step-by-step calculation breakdown (optional)
        components: List of component values that contributed to this result
        metadata: Additional context (e.g., assumptions, reference data)

    Example (Enhanced format):
        TraceableValue(
            name="Total Capital Investment",
            value=400.0,
            unit="MUSD",
            formula="TCI = TCI_ref × (Capacity / Capacity_ref)^scaling_exponent",
            inputs={
                "tci_ref": {"value": 400.0, "unit": "MUSD"},
                "capacity": {"value": 500000, "unit": "tons/year"}
            },
            calculation_steps=[
                CalculationStep(
                    step=1,
                    description="Calculate ratio",
                    formula="ratio = capacity / capacity_ref",
                    calculation="500000 / 500000 = 1.0",
                    result={"value": 1.0, "unit": "dimensionless"}
                )
            ],
            components=[...],
            metadata={"scaling_exponent": 0.6}
        )
    """
    value: float
    unit: str
    formula: str
    components: List[ComponentValue] = field(default_factory=list)
    name: Optional[str] = None
    inputs: Optional[Dict[str, Any]] = None
    calculation_steps: Optional[List[CalculationStep]] = None
    metadata: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        result = {
            "value": self.value,
            "unit": self.unit,
            "formula": self.formula,
            "components": [comp.to_dict() for comp in self.components],
            "metadata": self.metadata or {}
        }

        # Add optional fields if present
        if self.name is not None:
            result["name"] = self.name

        if self.inputs is not None:
            result["inputs"] = self.inputs

        if self.calculation_steps is not None:
            result["calculation_steps"] = [step.to_dict() for step in self.calculation_steps]

        return result


# Pydantic schemas for API responses
class CalculationStepSchema(BaseModel):
    """Pydantic schema for CalculationStep."""
    step: int
    description: str
    formula: str
    calculation: str
    result: Dict[str, Any]
    details: Optional[Dict[str, Any]] = None


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
    name: Optional[str] = None
    inputs: Optional[Dict[str, Any]] = None
    calculation_steps: Optional[List[CalculationStepSchema]] = None
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
