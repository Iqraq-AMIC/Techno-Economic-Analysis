# app/models/biofuel_model.py

from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.schema import UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
import datetime
import uuid

from app.core.base_model import Base 

# ==================== MASTER DATA TABLES ====================

class ProcessTechnology(Base):
    __tablename__ = "process_technologies"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)

    # Relationships
    refs = relationship("ProcessFeedstockRef", back_populates="process")
    default_params = relationship("DefaultParameterSet", back_populates="process")
    scenarios = relationship("Scenario", back_populates="process")

class Country(Base):
    __tablename__ = "country"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)

    # Relationships
    utility_price_defaults = relationship("UtilityCountryPriceDefaults", back_populates="country")
    default_params = relationship("DefaultParameterSet", back_populates="country")
    projects = relationship("UserProject", back_populates="initial_country")
    scenarios = relationship("Scenario", back_populates="country")

class Feedstock(Base):
    __tablename__ = "feedstock"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    carbon_content_kg_c_per_kg = Column(Float)
    energy_content_mj_per_kg = Column(Float)
    ci_ref_gco2e_per_mj = Column(Float)
    price_ref_usd_per_unit = Column(Float)
    yield_ref = Column(Float)

    # Relationships
    refs = relationship("ProcessFeedstockRef", back_populates="feedstock")
    default_params = relationship("DefaultParameterSet", back_populates="feedstock")
    projects = relationship("UserProject", back_populates="initial_feedstock")
    scenarios = relationship("Scenario", back_populates="feedstock")

class Utility(Base):
    __tablename__ = "utility"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    carbon_content_kg_c_per_kg = Column(Float)
    energy_content_mj_per_kg = Column(Float)
    ci_ref_gco2e_per_mj = Column(Float)
    yield_ref = Column(Float, default=0.0)
    
    # Relationships
    consumption_refs = relationship("ProcessUtilityConsumptionRef", back_populates="utility")
    price_defaults = relationship("UtilityCountryPriceDefaults", back_populates="utility")

class Product(Base):
    __tablename__ = "product"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    
    # Relationships
    breakdowns = relationship("ProductReferenceBreakdown", back_populates="product")

# ==================== REFERENCE DATA TABLES ====================

class ProcessFeedstockRef(Base):
    __tablename__ = "process_feedstock_ref"
    id = Column(Integer, primary_key=True, index=True)
    
    process_id = Column(Integer, ForeignKey("process_technologies.id"), nullable=False)
    feedstock_id = Column(Integer, ForeignKey("feedstock.id"), nullable=False)
    average_product_density_ref = Column(Float)

    # Relationships
    process = relationship("ProcessTechnology", back_populates="refs")
    feedstock = relationship("Feedstock", back_populates="refs")
    utility_consumptions = relationship("ProcessUtilityConsumptionRef", back_populates="ref")
    product_breakdowns = relationship("ProductReferenceBreakdown", back_populates="ref")

    __table_args__ = (
        UniqueConstraint('process_id', 'feedstock_id', name='_process_feedstock_uc'),
    )

class ProcessUtilityConsumptionRef(Base):
    __tablename__ = "process_utility_consumption_ref"
    id = Column(Integer, primary_key=True, index=True)
    
    ref_id = Column(Integer, ForeignKey("process_feedstock_ref.id"), nullable=False)
    utility_id = Column(Integer, ForeignKey("utility.id"), nullable=False)
    consumption_ratio_ref_unit_per_kg_fuel = Column(Float, nullable=False)

    # Relationships
    ref = relationship("ProcessFeedstockRef", back_populates="utility_consumptions")
    utility = relationship("Utility", back_populates="consumption_refs")

    __table_args__ = (
        UniqueConstraint('ref_id', 'utility_id', name='_ref_utility_uc'),
    )

class UtilityCountryPriceDefaults(Base):
    __tablename__ = "utility_country_price_defaults"
    id = Column(Integer, primary_key=True, index=True)
    
    utility_id = Column(Integer, ForeignKey("utility.id"), nullable=False)
    country_id = Column(Integer, ForeignKey("country.id"), nullable=False)
    price_ref_usd_per_unit = Column(Float, nullable=False)

    # Relationships
    utility = relationship("Utility", back_populates="price_defaults")
    country = relationship("Country", back_populates="utility_price_defaults")

    __table_args__ = (
        UniqueConstraint('utility_id', 'country_id', name='_utility_country_uc'),
    )

class ProductReferenceBreakdown(Base):
    __tablename__ = "product_reference_breakdown"
    id = Column(Integer, primary_key=True, index=True)
    
    ref_id = Column(Integer, ForeignKey("process_feedstock_ref.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("product.id"), nullable=False)
    
    # Technical properties
    carbon_content_kg_c_per_kg = Column(Float)
    energy_content_mj_per_kg = Column(Float)
    
    # Economic properties
    price_ref_usd_per_unit = Column(Float, nullable=False)
    price_sensitivity_ref = Column(Float)
    product_yield_ref = Column(Float)
    product_density = Column(Float)

    # Relationships
    ref = relationship("ProcessFeedstockRef", back_populates="product_breakdowns")
    product = relationship("Product", back_populates="breakdowns")

    __table_args__ = (
        UniqueConstraint('ref_id', 'product_id', name='_ref_product_uc'),
    )

class DefaultParameterSet(Base):
    __tablename__ = "default_parameter_set"
    id = Column(Integer, primary_key=True, index=True)
    
    process_id = Column(Integer, ForeignKey("process_technologies.id"), nullable=False)
    feedstock_id = Column(Integer, ForeignKey("feedstock.id"), nullable=False)
    country_id = Column(Integer, ForeignKey("country.id"), nullable=False)
    
    # Conversion Plant Defaults
    plant_capacity_ktpa_ref = Column(Float)
    annual_load_hours_ref = Column(Float)
    ci_process_default_gco2_mj = Column(Float)

    # Economic Parameter Defaults
    project_lifetime_years = Column(Integer, nullable=False)
    discount_rate_percent = Column(Float, nullable=False)
    tci_ref_musd = Column(Float)
    tci_scaling_exponent = Column(Float, nullable=False)
    working_capital_tci_ratio = Column(Float, nullable=False)
    indirect_opex_tci_ratio = Column(Float, nullable=False)
    
    # Additional Parameters
    p_steps = Column(Integer)
    nnp_steps = Column(Integer) 

    # Relationships
    process = relationship("ProcessTechnology", back_populates="default_params")
    feedstock = relationship("Feedstock", back_populates="default_params")
    country = relationship("Country", back_populates="default_params")

    __table_args__ = (
        UniqueConstraint('process_id', 'feedstock_id', 'country_id', name='_pfc_default_uc'),
    )

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

# ==================== USER & PROJECT TABLES ====================

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, nullable=False, unique=True)
    password_hash = Column(String, nullable=False, default='placeholder')
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    projects = relationship("UserProject", back_populates="user")

class UserProject(Base):
    __tablename__ = "user_projects"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Foreign Keys
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    
    # Project metadata
    project_name = Column(String, nullable=False)
    
    # Initial selections (optional)
    initial_process_id = Column(Integer, ForeignKey("process_technologies.id"), nullable=True)
    initial_feedstock_id = Column(Integer, ForeignKey("feedstock.id"), nullable=True)
    initial_country_id = Column(Integer, ForeignKey("country.id"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="projects")
    initial_process = relationship("ProcessTechnology", foreign_keys=[initial_process_id])
    initial_feedstock = relationship("Feedstock", foreign_keys=[initial_feedstock_id])
    initial_country = relationship("Country", foreign_keys=[initial_country_id])
    
    # Scenarios
    scenarios = relationship("Scenario", back_populates="project", cascade="all, delete-orphan")

class Scenario(Base):
    __tablename__ = "scenarios"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("user_projects.id"), nullable=False)
    
    # Scenario metadata
    scenario_name = Column(String, nullable=False)
    scenario_order = Column(Integer, nullable=False, default=0)
    
    # Core selections for this scenario
    process_id = Column(Integer, ForeignKey("process_technologies.id"), nullable=False)
    feedstock_id = Column(Integer, ForeignKey("feedstock.id"), nullable=False)
    country_id = Column(Integer, ForeignKey("country.id"), nullable=False)
    
    # User inputs and results
    user_inputs_json = Column(JSONB, nullable=False)
    techno_economics_json = Column(JSONB)
    financial_analysis_json = Column(JSONB)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    project = relationship("UserProject", back_populates="scenarios")
    process = relationship("ProcessTechnology", back_populates="scenarios")
    feedstock = relationship("Feedstock", back_populates="scenarios")
    country = relationship("Country", back_populates="scenarios")

    __table_args__ = (
        UniqueConstraint('project_id', 'scenario_order', name='_project_scenario_order_uc'),
    )