# app/services/economics.py

from app.crud.biofuel_crud import BiofuelCRUD  # <<< New Import from CRUD layer
from app.services.feature_calculations import Layer1, Layer2, Layer3, Layer4
from app.schemas.biofuel_schema import UserInputs  # <<< Updated import from schemas/

# Note: The BiofuelEconomics class now accepts the CRUD object.

class BiofuelEconomics:
    """
    Main service layer class responsible for orchestrating the calculation layers
    and fetching database reference data.
    """
    def __init__(self, inputs: UserInputs, crud: BiofuelCRUD): # <<< Accepts BiofuelCRUD instance
        self.inputs_structured = inputs
        self.inputs_flat = inputs.to_flat_dict()
        self.crud = crud  # <<< Store the CRUD instance for database access

        # Calculation layers (no change)
        self.layer1 = Layer1()
        self.layer2 = Layer2()
        self.layer3 = Layer3()
        self.layer4 = Layer4()

    def run(self, process_technology: str, feedstock: str, product_key: str = "jet") -> dict:
        """
        Compute full techno-economics for a selected process technology + feedstock.
        """

        # Fetch reference data using the CRUD object, which talks to the SQLAlchemy session
        row = self.crud.get_reference_by_names(process_technology, feedstock)
        
        if row is None:
            raise ValueError(f"No reference data found for process '{process_technology}' with feedstock '{feedstock}'")

        process_key = process_technology.upper()

        # Reference values from the database, now retrieved as a flat dictionary (the 'row' variable)
        # The structure of 'row' is designed by BiofuelCRUD to match the old Pandas row format, minimizing changes below.
        ref = {
            "tci_ref": row["TCI_ref"],
            "capacity_ref": row["Capacity_ref"],
            "p_steps": row["P_steps"],
            "nnp_steps": row["Nnp_steps"],
            # If user provides custom yields, they override the database yields here
            "yield_biomass": self.inputs_flat.get("biomass_yield_override_kg_per_kg_fuel", row["Yield_biomass"]),
            "yield_h2": self.inputs_flat.get("h2_yield_override_kg_per_kg_fuel", row["Yield_H2"]),
            "yield_kwh": self.inputs_flat.get("kwh_yield_override_kwh_per_kg_fuel", row["Yield_kWh"]),
            "mass_fractions": row["MassFractions"],
            "process_key": process_key,
            "feedstock_key": feedstock,
        }

        # --- Remaining calculation logic remains UNCHANGED ---

        # Layer 1: Core Parameters
        layer1_results = self.layer1.run(self.inputs_flat, ref)

        # Layer 2: Cost Calculation
        layer2_results = self.layer2.run(self.inputs_flat, layer1_results)

        # Layer 3: Carbon Intensity and Emissions
        layer3_results = self.layer3.run(self.inputs_flat, layer1_results, layer2_results, ref)

        # Layer 4: Final Metrics (LCOP, Total OPEX, Total CO2)
        layer4_results = self.layer4.run(
            layer1_results, layer2_results, layer3_results, ref["process_key"],
            self.inputs_flat["discount_rate"], self.inputs_flat["project_lifetime_years"]
        )
        
        # ... (Rest of the method logic to structure the final response dictionary)
        # The final dictionary construction logic (omitted for brevity) remains the same.
        
        # We need the original database values to check for overrides
        original_db_yields = {
            "biomass": row["Yield_biomass"], 
            "H2": row["Yield_H2"],
            "kWh": row["Yield_kWh"],
        }
        
        # The rest of the return block from your original file:
        return {
            "process_technology": process_technology,
            "feedstock": feedstock,
            # ... (other results)
            "LCOP": layer4_results["lcop"],
            # ... (return structured yields and products)
            "yields": {
                "biomass": ref["yield_biomass"],  # Resolved value after overrides
                "H2": ref["yield_h2"],            # Resolved value after overrides
                "kWh": ref["yield_kwh"],          # Resolved value after overrides
            },
            "yields_source": {
                "biomass": "user" if abs(ref["yield_biomass"] - original_db_yields["biomass"]) > 0.001 else "database",
                "H2": "user" if abs(ref["yield_h2"] - original_db_yields["H2"]) > 0.001 else "database",
                "kWh": "user" if abs(ref["yield_kwh"] - original_db_yields["kWh"]) > 0.001 else "database",
            },
            "database_yields": original_db_yields,
            "mass_fractions": ref["mass_fractions"],
            # ... (and so on)
        }