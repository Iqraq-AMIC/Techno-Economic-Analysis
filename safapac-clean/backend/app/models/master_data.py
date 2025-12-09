# app/models/master_data.py

from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.schema import UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB

# Assuming Base is imported from your core module
from app.core.base_model import Base 

# ==================== MASTER DATA TABLES ====================

class ProcessTechnology(Base):
    __tablename__ = "process_technologies"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)

    # Relationships (Forward-declared or imported models will link here)
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
# These tables link Master Data entities together and hold reference values

class ProcessFeedstockRef(Base):
    __tablename__ = "process_feedstock_ref"
    id = Column(Integer, primary_key=True, index=True)
    
    process_id = Column(Integer, ForeignKey("process_technologies.id"), nullable=False)
    feedstock_id = Column(Integer, ForeignKey("feedstock.id"), nullable=False)
    average_product_density_ref = Column(Float)

    # Relationships - NOTE: Process and Feedstock are defined above
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

    # Relationships - NOTE: Ref and Utility are defined above
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

    # Relationships - NOTE: Utility and Country are defined above
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

    # Relationships - NOTE: Process, Feedstock, Country are defined above
    process = relationship("ProcessTechnology", back_populates="default_params")
    feedstock = relationship("Feedstock", back_populates="default_params")
    country = relationship("Country", back_populates="default_params")

    __table_args__ = (
        UniqueConstraint('process_id', 'feedstock_id', 'country_id', name='_pfc_default_uc'),
    )