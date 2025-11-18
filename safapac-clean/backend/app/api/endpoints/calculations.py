# app/api/endpoints/calculations.py

import logging
from typing import Dict, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.crud.biofuel_crud import BiofuelCRUD
from app.services.economics import BiofuelEconomics
from app.schemas.biofuel_schema import (
    QuickCalculationRequest, CalculationResponse, UserInputs,
    ConversionPlant, EconomicParameters, FeedstockData, 
    UtilityData, ProductData, Quantity
)

logger = logging.getLogger(__name__)

router = APIRouter()

def get_biofuel_crud(db: Session = Depends(get_db)) -> BiofuelCRUD:
    return BiofuelCRUD(db)

@router.post("/calculate/quick", response_model=CalculationResponse)
def quick_calculation(
    request: QuickCalculationRequest,
    crud: BiofuelCRUD = Depends(get_biofuel_crud)
):
    """Perform a quick calculation without saving to database."""
    try:
        # Convert schema to UserInputs dataclass
        input_dict = request.inputs.dict(by_alias=True)
        
        user_inputs_dataclass = UserInputs(
            process_technology=request.process_technology,
            feedstock=request.feedstock,
            country=request.country,
            
            conversion_plant=ConversionPlant(
                plant_capacity=Quantity.from_dict(input_dict["conversion_plant"]["plant_capacity"]),
                annual_load_hours=input_dict["conversion_plant"]["annual_load_hours"],
                ci_process_default=input_dict["conversion_plant"]["ci_process_default"],
            ),
            
            economic_parameters=EconomicParameters(**input_dict["economic_parameters"]),
            
            feedstock_data=[
                FeedstockData.from_schema(**data) 
                for data in input_dict.get("feedstock_data", [])
            ],
            utility_data=[
                UtilityData.from_schema(**data) 
                for data in input_dict.get("utility_data", [])
            ],
            product_data=[
                ProductData.from_schema(**data) 
                for data in input_dict.get("product_data", [])
            ],
        )

        # Run calculation
        economics = BiofuelEconomics(user_inputs_dataclass, crud)
        results = economics.run(
            process_technology=request.process_technology,
            feedstock=request.feedstock,
            country=request.country
        )
        
        return results
        
    except Exception as e:
        logger.error(f"Quick calculation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Calculation failed: {str(e)}"
        )

@router.get("/reference-data/{process_technology}/{feedstock}/{country}")
def get_reference_data(
    process_technology: str,
    feedstock: str,
    country: str,
    crud: BiofuelCRUD = Depends(get_biofuel_crud)
):
    """Get reference data for a specific process-feedstock-country combination."""
    try:
        reference_data = crud.get_project_reference_data(
            process_technology, feedstock, country
        )
        
        if not reference_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reference data not found for the specified combination"
            )
            
        return reference_data
        
    except Exception as e:
        logger.error(f"Error fetching reference data: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to fetch reference data"
        )