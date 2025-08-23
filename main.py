from fastapi import FastAPI
from pydantic import BaseModel
from biofuel_economics import BiofuelEconomics
from cashflow_table import FinancialAnalysis
from user_inputs import UserInputs
from process_technology_lib import BiofuelDatabase
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict

app = FastAPI()

# 🔹 Add CORS middleware here
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # For development, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instantiate the database class
db = BiofuelDatabase()

# New Endpoints to support the BiofuelSelector.js component
@app.get("/processes", response_model=List[str])
def get_processes():
    # The process technology is a unique value in the `Process Technology` column
    return list(db.data["Process Technology"].unique())

@app.get("/feedstocks/{process}", response_model=List[str])
def get_feedstocks_by_process(process: str):
    df = db.filter_by_process(process)
    return df["Feedstock"].tolist()

@app.get("/feedstock/{feedstock_name}", response_model=Dict)
def get_feedstock_details(feedstock_name: str):
    return db.get_yield_by_feedstock(feedstock_name)

class CalculationRequest(BaseModel):
    inputs: dict
    process_technology: str
    feedstock: str
    TCI_2023: float

@app.post("/calculate")
def calculate(request: CalculationRequest):
    try:
        # Build UserInputs object
        inputs = UserInputs(**request.inputs)

        # Techno-economic analysis
        econ = BiofuelEconomics(inputs)
        results = econ.run(
            process_technology=request.process_technology,
            feedstock=request.feedstock,
            TCI_2023=request.TCI_2023
        )

        # Financial analysis
        fa = FinancialAnalysis(discount_rate=inputs.discount_factor)
        cashflow_df = fa.cash_flow_table(
            capex=results["Adjusted CAPEX"],
            revenue=results["Revenue"],
            opex=results["OPEX"],
            plant_lifetime=inputs.plant_lifetime
        )

        financials = {
            "npv": fa.npv(results["Adjusted CAPEX"], results["Revenue"], results["OPEX"], inputs.plant_lifetime),
            "irr": fa.irr(results["Adjusted CAPEX"], results["Revenue"], results["OPEX"], inputs.plant_lifetime),
            "paybackPeriod": fa.payback_period(results["Adjusted CAPEX"], results["Revenue"], results["OPEX"], inputs.plant_lifetime),
            "cashFlowTable": cashflow_df.to_dict(orient="records")
        }

        return {
            "technoEconomics": results,
            "financials": financials
        }
    except Exception as e:
        return {"error": str(e)}