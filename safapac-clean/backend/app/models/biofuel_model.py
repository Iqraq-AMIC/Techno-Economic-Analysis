# app/models/biofuel_model.py

from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.schema import UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
import datetime
import uuid

# CRITICAL: Import Base from the dedicated file (from app/core/base_model.py)
from app.core.base_model import Base 

# -----------------------------------------------------------
# MASTER DATA TABLES (Static Reference Data)
# -----------------------------------------------------------

class ProcessTechnology(Base):
    __tablename__ = "process_technologies"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)

    # Relationships
    refs = relationship("ProcessFeedstockRef", back_populates="process")
    default_params = relationship("DefaultParameterSet", back_populates="process")

# NEW MODEL: Country
class Country(Base):
    __tablename__ = "country"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)

    # Relationships
    utility_price_defaults = relationship("UtilityCountryPriceDefaults", back_populates="country")
    default_params = relationship("DefaultParameterSet", back_populates="country")
    projects = relationship("UserProject", back_populates="country")


# NEW MODEL: Feedstock (replaces FeedstockUtility for non-utilities)
class Feedstock(Base):
    __tablename__ = "feedstock"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    carbon_content_kg_c_per_kg = Column(Float)
    energy_content_mj_per_kg = Column(Float)
    ci_ref_gco2e_per_mj = Column(Float)
    price_ref_usd_per_unit = Column(Float) # Reference price (used as fallback/display)
    yield_ref = Column(Float)              # Reference yield (used as fallback/display)

    # Relationships
    refs = relationship("ProcessFeedstockRef", back_populates="feedstock")
    default_params = relationship("DefaultParameterSet", back_populates="feedstock")


# NEW MODEL: Utility (replaces FeedstockUtility for utilities)
class Utility(Base):
    __tablename__ = "utility"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    carbon_content_kg_c_per_kg = Column(Float)
    energy_content_mj_per_kg = Column(Float)
    ci_ref_gco2e_per_mj = Column(Float)
    
    # Relationships
    consumption_refs = relationship("ProcessUtilityConsumptionRef", back_populates="utility")
    price_defaults = relationship("UtilityCountryPriceDefaults", back_populates="utility")


class Product(Base):
    # This table remains for storing unique product names (Jet, Diesel, etc.)
    __tablename__ = "product"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    
    # Relationships
    breakdowns = relationship("ProductReferenceBreakdown", back_populates="product")


# CORE REFERENCE PARAMETERS: Defines the feedstock consumption, and average density for a P-F combination.
class ProcessFeedstockRef(Base):
    __tablename__ = "process_feedstock_ref"
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign Keys
    process_id = Column(Integer, ForeignKey("process_technologies.id"), nullable=False)
    feedstock_id = Column(Integer, ForeignKey("feedstock.id"), nullable=False)
    
    # NEW FIELD: Average Density
    average_product_density_ref = Column(Float) # Default mass-weighted average density

    # Relationships
    process = relationship("ProcessTechnology", back_populates="refs")
    feedstock = relationship("Feedstock", back_populates="refs")
    
    utility_consumptions = relationship("ProcessUtilityConsumptionRef", back_populates="ref")
    product_breakdowns = relationship("ProductReferenceBreakdown", back_populates="ref")

    __table_args__ = (
        UniqueConstraint('process_id', 'feedstock_id', name='_process_feedstock_uc'),
    )

# NEW MODEL: Links Utilities to the process's technical requirements (P+F)
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


# NEW MODEL: Stores the default price for a specific Utility in a specific Country (U+C)
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


# MODIFIED MODEL: Stores product definitions, mass fractions, and default economic data (P+F)
class ProductReferenceBreakdown(Base):
    __tablename__ = "product_reference_breakdown"
    id = Column(Integer, primary_key=True, index=True)
    
    ref_id = Column(Integer, ForeignKey("process_feedstock_ref.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("product.id"), nullable=False)
    
    # Technical properties
    carbon_content_kg_c_per_kg = Column(Float)
    energy_content_mj_per_kg = Column(Float)
    
    # Default Fields
    price_ref_usd_per_unit = Column(Float, nullable=False)
    price_sensitivity_ref = Column(Float)
    product_yield_ref = Column(Float) # Default mass fraction/yield for this specific product
    product_density = Column(Float)    # NEW FIELD

    # Relationships
    ref = relationship("ProcessFeedstockRef", back_populates="product_breakdowns")
    product = relationship("Product", back_populates="breakdowns")

    __table_args__ = (
        UniqueConstraint('ref_id', 'product_id', name='_ref_product_uc'),
    )


# NEW MODEL: Stores all default conversion and economic parameters (P+F+C dependency)
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

class UnitGroup(Base):
    __tablename__ = "unit_group"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True) # e.g., 'Mass', 'Energy Content'
    base_unit_name = Column(String, nullable=False)    # e.g., 'kg', 'MJ'

    # Relationship to the units in this group
    units = relationship("UnitOfMeasure", back_populates="group")
    
class UnitOfMeasure(Base):
    __tablename__ = "unit_of_measure"
    id = Column(Integer, primary_key=True, index=True)
    unit_group_id = Column(Integer, ForeignKey("unit_group.id"), nullable=False)
    name = Column(String, nullable=False)          # e.g., 'kg', 't', 'ktpa'
    display_name = Column(String)                  # e.g., 'Kilogram', 'Tonne'

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
    conversion_factor = Column(Float, nullable=False) # Factor to convert THIS unit to the Group's Base Unit

    # Relationship
    unit = relationship("UnitOfMeasure", back_populates="conversion")

class UnitRatio(Base):
    __tablename__ = "unit_ratios"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    display_name = Column(String)
    # Foreign keys link to the numerator and denominator UnitOfMeasure
    numerator_unit_id = Column(Integer, ForeignKey("unit_of_measure.id"), nullable=False)
    denominator_unit_id = Column(Integer, ForeignKey("unit_of_measure.id"), nullable=False)
    
    # Relationships
    numerator_unit = relationship("UnitOfMeasure", foreign_keys=[numerator_unit_id])
    denominator_unit = relationship("UnitOfMeasure", foreign_keys=[denominator_unit_id])

    __table_args__ = (UniqueConstraint('numerator_unit_id', 'denominator_unit_id', name='uc_ratio_components'),)

# -----------------------------------------------------------
# USER AND PROJECT TABLES 
# -----------------------------------------------------------

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, nullable=False, unique=True)
    password_hash = Column(String, nullable=False, default='placeholder') # Added for consistency with DBML
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    projects = relationship("UserProject", back_populates="user")

class UserProject(Base):
    __tablename__ = "user_projects"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Foreign Keys
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    process_id = Column(Integer, ForeignKey("process_technologies.id"))
    feedstock_id = Column(Integer, ForeignKey("feedstock.id")) # MODIFIED
    country_id = Column(Integer, ForeignKey("country.id"))      # NEW FOREIGN KEY
    
    project_name = Column(String, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="projects")
    process = relationship("ProcessTechnology")
    feedstock = relationship("Feedstock")
    country = relationship("Country", back_populates="projects") # NEW RELATIONSHIP

    # Relationships for analysis runs
    analysis_runs = relationship("ProjectAnalysisRun", back_populates="project")
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class ProjectAnalysisRun(Base):
    __tablename__ = "project_analysis_runs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    project_id = Column(UUID(as_uuid=True), ForeignKey("user_projects.id"), nullable=False)
    run_name = Column(String)
    
    user_inputs_json = Column(JSONB, nullable=False)
    techno_economics_json = Column(JSONB, nullable=False)
    financial_analysis_json = Column(JSONB, nullable=False)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    project = relationship("UserProject", back_populates="analysis_runs")