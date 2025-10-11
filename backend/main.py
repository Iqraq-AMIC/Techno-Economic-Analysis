from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from biofuel_economics import BiofuelEconomics
from cashflow_table import FinancialAnalysis
from user_inputs import UserInputs
from process_technology_lib import BiofuelDatabase
from typing import List, Dict
import logging
import time
import math

# 🔹 Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI()

# 🔹 Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # For development, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🔹 Add request logging middleware
@app.middleware("http")
async def log_requests(request, call_next):
    import time
    start_time = time.time()

    # Log the incoming request
    print(f"➡️  Incoming request: {request.method} {request.url}")

    # Continue to the actual endpoint
    response = await call_next(request)

    # Log response time
    duration = time.time() - start_time
    print(f"⬅️  Completed {request.method} {request.url} in {duration:.2f}s with status {response.status_code}")

    return response



# Instantiate the database class
db = BiofuelDatabase()

def safe_float(value):
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None   # or 0 if you prefer
    return value




# ====================== ENDPOINTS ======================

@app.get("/processes", response_model=List[str])
def get_processes():
    logger.info("📩 /processes called")
    return list(db.data["Process Technology"].unique())


@app.get("/feedstocks/{process}", response_model=List[str])
def get_feedstocks_by_process(process: str):
    logger.info(f"📩 /feedstocks called for process={process}")
    df = db.filter_by_process(process)
    return df["Feedstock"].tolist()


@app.get("/feedstock/{feedstock_name}", response_model=Dict)
def get_feedstock_details(feedstock_name: str):
    logger.info(f"📩 /feedstock called for feedstock={feedstock_name}")
    return db.get_yield_by_feedstock(feedstock_name)


class CalculationRequest(BaseModel):
    inputs: dict
    process_technology: str
    feedstock: str
    TCI_2023: float



@app.post("/calculate")
def calculate(request: CalculationRequest):
    try:
        logger.info(f"📩 /calculate called with: {request.dict()}")

        inputs = UserInputs(**request.inputs)

        econ = BiofuelEconomics(inputs)
        results = econ.run(
            process_technology=request.process_technology,
            feedstock=request.feedstock,
            TCI_2023=request.TCI_2023
        )

        fa = FinancialAnalysis(discount_rate=inputs.discount_factor)
        cashflow_df = fa.cash_flow_table(
            capex=results["Adjusted CAPEX"],
            revenue=results["Revenue"],
            opex=results["OPEX"],
            plant_lifetime=inputs.plant_lifetime
        )

        financials = {
            "npv": safe_float(fa.npv(results["Adjusted CAPEX"], results["Revenue"], results["OPEX"], inputs.plant_lifetime)),
            "irr": safe_float(fa.irr(results["Adjusted CAPEX"], results["Revenue"], results["OPEX"], inputs.plant_lifetime)),
            "paybackPeriod": safe_float(fa.payback_period(results["Adjusted CAPEX"], results["Revenue"], results["OPEX"], inputs.plant_lifetime)),
            "cashFlowTable": cashflow_df.to_dict(orient="records")
        }

        response = {
            "technoEconomics": {k: safe_float(v) for k, v in results.items()},
            "financials": financials
        }

        # 🔹 Console log the final response in a readable way
        logger.info("✅ Techno-Economics Results:")
        for k, v in response["technoEconomics"].items():
            logger.info(f"   {k:<20} : {v}")

        logger.info("✅ Financial Summary:")
        for k, v in {k: v for k, v in financials.items() if k != "cashFlowTable"}.items():
            logger.info(f"   {k:<20} : {v}")

        logger.info("📊 Cashflow Table:")
        logger.info("\n" + cashflow_df.to_string(index=False))  # tabular log

        return response

    except Exception as e:
        logger.error(f"❌ Error in /calculate: {str(e)}")
        return {"error": str(e)}

# ====================== UVICORN ENTRY ======================

if __name__ == "__main__":
    import uvicorn
    logger.info("🚀 Starting API server at http://127.0.0.1:8000 ...")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
