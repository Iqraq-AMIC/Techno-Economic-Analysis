# app/models/user_project.py

from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.schema import UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
import datetime
import uuid

# Assuming Base is imported from your core module
from app.core.base_model import Base 

# ==================== USER & PROJECT TABLES ====================

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True)
    password_hash = Column(String, nullable=False, default='placeholder')
    access_level = Column(String, nullable=False)
    occupation = Column(String, nullable=True)  # student/researcher
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
    
    # Initial selections (Foreign Keys point to tables defined in master_data.py)
    initial_process_id = Column(Integer, ForeignKey("process_technologies.id"), nullable=True)
    initial_feedstock_id = Column(Integer, ForeignKey("feedstock.id"), nullable=True)
    initial_country_id = Column(Integer, ForeignKey("country.id"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships (Relationships link to Models defined in master_data.py and this file)
    user = relationship("User", back_populates="projects")
    # Note: process, feedstock, country are defined by name (forward reference)
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
    
    # Core selections (Foreign Keys point to tables defined in master_data.py)
    process_id = Column(Integer, ForeignKey("process_technologies.id"), nullable=False)
    feedstock_id = Column(Integer, ForeignKey("feedstock.id"), nullable=False)
    country_id = Column(Integer, ForeignKey("country.id"), nullable=False)
    
    # Data blobs
    user_inputs = Column(JSONB, nullable=False)
    techno_economics = Column(JSONB)
    financial_analysis = Column(JSONB)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    project = relationship("UserProject", back_populates="scenarios")
    # Note: process, feedstock, country are defined by name (forward reference)
    process = relationship("ProcessTechnology", back_populates="scenarios")
    feedstock = relationship("Feedstock", back_populates="scenarios")
    country = relationship("Country", back_populates="scenarios")

    __table_args__ = (
        UniqueConstraint('project_id', 'scenario_order', name='_project_scenario_order_uc'),
    )