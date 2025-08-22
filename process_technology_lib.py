from typing import List, Dict, Any, Optional
import pandas as pd

class BiofuelDatabase:
    def __init__(self):
        self.data = pd.DataFrame([
            {
                "Process Technology": "HEFA", "Feedstock": "FOGs", "TCI_ref": 400, "Capacity_ref": 500,
                "Yield_biomass": 1.2048, "Yield_H2": 0.042, "Yield_kWh": 0.12,
                "P_steps": 3, "Nnp_steps": 28,
                "MassFractions": {"Jet": 69, "Diesel": 0, "Gasoline": 31, "Propane": 0, "Naphtha": 0}
            },
            {
                "Process Technology": "FT-BtL", "Feedstock": "MSW", "TCI_ref": 970, "Capacity_ref": 80,
                "Yield_biomass": 3.2258, "Yield_H2": 23.2, "Yield_kWh": 0.3,
                "P_steps": 5, "Nnp_steps": 35,
                "MassFractions": {"Jet": 72, "Diesel": 0, "Gasoline": 0, "Propane": 0, "Naphtha": 28}
            },
            {
                "Process Technology": "FT-BtL", "Feedstock": "Forest Residues", "TCI_ref": 970, "Capacity_ref": 80,
                "Yield_biomass": 5.5555, "Yield_H2": 23.2, "Yield_kWh": 0.3,
                "P_steps": 5, "Nnp_steps": 35,
                "MassFractions": {"Jet": 72, "Diesel": 0, "Gasoline": 0, "Propane": 0, "Naphtha": 28}
            },
            {
                "Process Technology": "FT-BtL", "Feedstock": "Agriculture Residues", "TCI_ref": 970, "Capacity_ref": 80,
                "Yield_biomass": 7.1429, "Yield_H2": 23.2, "Yield_kWh": 0.3,
                "P_steps": 5, "Nnp_steps": 35,
                "MassFractions": {"Jet": 72, "Diesel": 0, "Gasoline": 0, "Propane": 0, "Naphtha": 28}
            },
            {
                "Process Technology": "ATJ", "Feedstock": "Sugarcane", "TCI_ref": 1020, "Capacity_ref": 160,
                "Yield_biomass": 28.7356, "Yield_H2": 12.1, "Yield_kWh": 0.5,
                "P_steps": 4, "Nnp_steps": 33,
                "MassFractions": {"Jet": 70.84, "Diesel": 19.76, "Gasoline": 9.40, "Propane": 0, "Naphtha": 0}
            },
            {
                "Process Technology": "ATJ", "Feedstock": "Bagasse", "TCI_ref": 880, "Capacity_ref": 80,
                "Yield_biomass": 20.1532, "Yield_H2": 12.1, "Yield_kWh": 0.5,
                "P_steps": 4, "Nnp_steps": 33,
                "MassFractions": {"Jet": 70.84, "Diesel": 19.76, "Gasoline": 9.40, "Propane": 0, "Naphtha": 0}
            },
            {
                "Process Technology": "ATJ", "Feedstock": "Molasses", "TCI_ref": 880, "Capacity_ref": 80,
                "Yield_biomass": 1.938, "Yield_H2": 12.1, "Yield_kWh": 0.5,
                "P_steps": 4, "Nnp_steps": 33,
                "MassFractions": {"Jet": 70.84, "Diesel": 19.76, "Gasoline": 9.40, "Propane": 0, "Naphtha": 0}
            },
            {
                "Process Technology": "ATJ", "Feedstock": "Wheat Straw", "TCI_ref": 880, "Capacity_ref": 80,
                "Yield_biomass": 6.6934, "Yield_H2": 12.1, "Yield_kWh": 0.5,
                "P_steps": 4, "Nnp_steps": 33,
                "MassFractions": {"Jet": 70.84, "Diesel": 19.76, "Gasoline": 9.40, "Propane": 0, "Naphtha": 0}
            }
        ])

    def get_feedstocks(self) -> List[str]:
        return self.data["Feedstock"].tolist()

    def filter_by_process(self, process: str) -> pd.DataFrame:
        return self.data[self.data["Process Technology"] == process]

    def get_yield_by_feedstock(self, feedstock: str) -> Optional[Dict[str, Any]]:
        row = self.data[self.data["Feedstock"] == feedstock]
        if not row.empty:
            return row.iloc[0].to_dict()
        return None

    def compare_mass_fractions(self, feedstocks: List[str]) -> pd.DataFrame:
        subset = self.data[self.data["Feedstock"].isin(feedstocks)]
        return pd.DataFrame([
            {"Feedstock": row["Feedstock"], **row["MassFractions"]}
            for _, row in subset.iterrows()
        ])


# Example usage
if __name__ == "__main__":
    db = BiofuelDatabase()
    print("Available feedstocks:", db.get_feedstocks())
    print("\nATJ Feedstocks:\n", db.filter_by_process("ATJ"))
    print("\nSugarcane Yield Info:\n", db.get_yield_by_feedstock("Sugarcane"))
    print("\nMass Fraction Comparison:\n", db.compare_mass_fractions(["Sugarcane", "Bagasse"]))
