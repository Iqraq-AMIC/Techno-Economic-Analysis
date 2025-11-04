from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.economics import BiofuelEconomics
from app.financial_analysis import FinancialAnalysis
from app.models import UserInputs
from app.database import BiofuelDatabase
from typing import List, Dict
import logging
import time
import math

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,  # Must be False when using wildcard origins
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add request logging middleware
@app.middleware("http")
async def log_requests(request, call_next):
    import time
    start_time = time.time()

    print(f"Incoming request: {request.method} {request.url}")

    response = await call_next(request)

    duration = time.time() - start_time
    print(f"Completed {request.method} {request.url} in {duration:.2f}s with status {response.status_code}")

    return response


# Instantiate the database class
db = BiofuelDatabase()

def safe_float(value):
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None
    return value


# ====================== ENDPOINTS ======================

@app.get("/processes", response_model=List[str])
def get_processes():
    logger.info("/processes called")
    return list(db.data["Process Technology"].unique())


@app.get("/feedstocks/{process}", response_model=List[str])
def get_feedstocks_by_process(process: str):
    logger.info(f"/feedstocks called for process={process}")
    df = db.filter_by_process(process)
    return df["Feedstock"].tolist()


@app.get("/feedstock/{feedstock_name}", response_model=Dict)
def get_feedstock_details(feedstock_name: str):
    logger.info(f"/feedstock called for feedstock={feedstock_name}")
    return db.get_yield_by_feedstock(feedstock_name)


class CalculationRequest(BaseModel):
    inputs: dict
    process_technology: str
    feedstock: str
    product_key: str = "jet"


@app.post("/calculate")
def calculate(request: CalculationRequest):
    try:
        logger.info(f"/calculate called with: {request.dict()}")

        structured_inputs = UserInputs.from_dict(request.inputs)
        flattened_inputs = structured_inputs.to_flat_dict()

        econ = BiofuelEconomics(structured_inputs)
        results = econ.run(
            process_technology=request.process_technology,
            feedstock=request.feedstock,
            product_key=request.product_key
        )

        # Map new keys to expected format
        tci = results["TCI"]
        revenue = results["Revenue"]
        manufacturing_cost = results["Total OPEX"]

        # Initialize Financial Analysis with fixed parameters
        discount_rate = flattened_inputs.get("discount_rate", 0.105)
        plant_lifetime = flattened_inputs.get("plant_lifetime", 25)
        fa = FinancialAnalysis(
            discount_rate=discount_rate,
            tax_rate=0.28,
            equity=0.4,
            bank_interest=0.04,
            loan_term=10
        )

        # Generate cash flow table
        cashflow_df = fa.cash_flow_table(
            tci=tci,
            revenue=revenue,
            manufacturing_cost=manufacturing_cost,
            plant_lifetime=plant_lifetime
        )

        financials = {
            "npv": safe_float(fa.npv(tci, revenue, manufacturing_cost, plant_lifetime)),
            "irr": safe_float(fa.irr(tci, revenue, manufacturing_cost, plant_lifetime)),
            "paybackPeriod": safe_float(fa.payback_period(tci, revenue, manufacturing_cost, plant_lifetime)),
            "cashFlowTable": cashflow_df.to_dict(orient="records")
        }

        response = {
            "technoEconomics": {k: safe_float(v) for k, v in results.items()},
            "financials": financials,
            "resolvedInputs": {
                "structured": request.inputs,
                "flattened": flattened_inputs,
            },
        }

        logger.info("Techno-Economics Results:")
        for k, v in response["technoEconomics"].items():
            logger.info(f"   {k:<20} : {v}")

        logger.info("Financial Summary:")
        for k, v in {k: v for k, v in financials.items() if k != "cashFlowTable"}.items():
            logger.info(f"   {k:<20} : {v}")

        logger.info("Cashflow Table:")
        logger.info("\n" + cashflow_df.to_string(index=False))

        return response

    except Exception as e:
        logger.error(f"Error in /calculate: {str(e)}")
        return {"error": str(e)}


if __name__ == "__main__":
    import uvicorn
    logger.info("Starting API server at http://127.0.0.1:8000 ...")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
