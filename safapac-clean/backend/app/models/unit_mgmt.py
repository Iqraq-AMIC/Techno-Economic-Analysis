# app/models/unit_mgmt.py

from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.schema import UniqueConstraint

# Assuming Base is imported from your core module
from app.core.base_model import Base 

# ==================== UNIT MANAGEMENT TABLES ====================

class UnitGroup(Base):
    __tablename__ = "unit_group"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    base_unit_name = Column(String, nullable=False)

    units = relationship("UnitOfMeasure", back_populates="group")
    
class UnitOfMeasure(Base):
    __tablename__ = "unit_of_measure"
    id = Column(Integer, primary_key=True, index=True)
    unit_group_id = Column(Integer, ForeignKey("unit_group.id"), nullable=False)
    name = Column(String, nullable=False)
    display_name = Column(String)

    # Relationships
    group = relationship("UnitGroup", back_populates="units")
    conversion = relationship("UnitConversion", uselist=False, back_populates="unit")

    __table_args__ = (
        UniqueConstraint('unit_group_id', 'name', name='_unit_group_name_uc'),
    )

class UnitConversion(Base):
    __tablename__ = "unit_conversion"
    id = Column(Integer, primary_key=True, index=True)
    unit_id = Column(Integer, ForeignKey("unit_of_measure.id"), nullable=False, unique=True)
    conversion_factor = Column(Float, nullable=False)

    # Relationship
    unit = relationship("UnitOfMeasure", back_populates="conversion")