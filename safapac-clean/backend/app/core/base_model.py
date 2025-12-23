# app/core/base_model.py

from sqlalchemy.orm import declarative_base

# This is the single source of truth for all models to inherit from
Base = declarative_base()