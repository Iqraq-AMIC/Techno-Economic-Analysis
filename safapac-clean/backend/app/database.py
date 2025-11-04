from typing import List, Dict, Any, Optional
import pandas as pd



class BiofuelDatabase:
    def __init__(self):
        self.data = pd.DataFrame([


            {
                "Process Technology": "HEFA", "Feedstock": "UCO", "TCI_ref": 400, "Capacity_ref": 500,
                "Yield_biomass": 1.2048, "Yield_H2": 0.042, "Yield_kWh": 0.12,
                "P_steps": 3, "Nnp_steps": 28,
                "MassFractions": {"Jet": 69, "Diesel": 0, "Gasoline": 31, "Propane": 0, "Naphtha": 0}
            },
            {
                "Process Technology": "HEFA", "Feedstock": "Animal Fats", "TCI_ref": 400, "Capacity_ref": 500,
                "Yield_biomass": 1.2048, "Yield_H2": 0.042, "Yield_kWh": 0.12,
                "P_steps": 3, "Nnp_steps": 28,
                "MassFractions": {"Jet": 69, "Diesel": 0, "Gasoline": 31, "Propane": 0, "Naphtha": 0}
            },
            {
                "Process Technology": "HEFA", "Feedstock": "Algae Oil", "TCI_ref": 400, "Capacity_ref": 500,
                "Yield_biomass": 1.2048, "Yield_H2": 0.042, "Yield_kWh": 0.12,
                "P_steps": 3, "Nnp_steps": 28,
                "MassFractions": {"Jet": 69, "Diesel": 0, "Gasoline": 31, "Propane": 0, "Naphtha": 0}
            },
            {
                "Process Technology": "HEFA", "Feedstock": "Yellow Grease", "TCI_ref": 400, "Capacity_ref": 500,
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
            },
            # New Process Technologies
            {
                "Process Technology": "FT", "Feedstock": "Palm Kernel Shell", "TCI_ref": 850, "Capacity_ref": 100,
                "Yield_biomass": 5.0, "Yield_H2": 20.0, "Yield_kWh": 0.35,
                "P_steps": 4, "Nnp_steps": 30,
                "MassFractions": {"Jet": 75, "Diesel": 10, "Gasoline": 10, "Propane": 3, "Naphtha": 2}
            },
            {
                "Process Technology": "SIP", "Feedstock": "Coconut Husks", "TCI_ref": 750, "Capacity_ref": 120,
                "Yield_biomass": 4.5, "Yield_H2": 15.0, "Yield_kWh": 0.28,
                "P_steps": 3, "Nnp_steps": 25,
                "MassFractions": {"Jet": 65, "Diesel": 15, "Gasoline": 15, "Propane": 3, "Naphtha": 2}
            },
            {
                "Process Technology": "FT-SKA", "Feedstock": "Rice Husk", "TCI_ref": 900, "Capacity_ref": 90,
                "Yield_biomass": 5.5, "Yield_H2": 22.0, "Yield_kWh": 0.32,
                "P_steps": 5, "Nnp_steps": 32,
                "MassFractions": {"Jet": 70, "Diesel": 12, "Gasoline": 12, "Propane": 4, "Naphtha": 2}
            },
            {
                "Process Technology": "ATJ-SPK", "Feedstock": "Corn Stover", "TCI_ref": 820, "Capacity_ref": 110,
                "Yield_biomass": 6.0, "Yield_H2": 13.5, "Yield_kWh": 0.45,
                "P_steps": 4, "Nnp_steps": 28,
                "MassFractions": {"Jet": 72, "Diesel": 18, "Gasoline": 8, "Propane": 1, "Naphtha": 1}
            },
            {
                "Process Technology": "CHJ", "Feedstock": "Sugarcane Bagasse", "TCI_ref": 780, "Capacity_ref": 130,
                "Yield_biomass": 4.8, "Yield_H2": 16.0, "Yield_kWh": 0.38,
                "P_steps": 3, "Nnp_steps": 27,
                "MassFractions": {"Jet": 68, "Diesel": 20, "Gasoline": 10, "Propane": 1, "Naphtha": 1}
            },
            {
                "Process Technology": "HC-HEFA-SPK", "Feedstock": "Waste Cooking Oil", "TCI_ref": 650, "Capacity_ref": 150,
                "Yield_biomass": 1.8, "Yield_H2": 8.0, "Yield_kWh": 0.25,
                "P_steps": 3, "Nnp_steps": 22,
                "MassFractions": {"Jet": 80, "Diesel": 15, "Gasoline": 3, "Propane": 1, "Naphtha": 1}
            },
            {
                "Process Technology": "ATJ-SKA", "Feedstock": "Wood Chips", "TCI_ref": 860, "Capacity_ref": 95,
                "Yield_biomass": 5.2, "Yield_H2": 14.0, "Yield_kWh": 0.42,
                "P_steps": 4, "Nnp_steps": 29,
                "MassFractions": {"Jet": 73, "Diesel": 17, "Gasoline": 7, "Propane": 2, "Naphtha": 1}
            },
            # Additional Feedstocks
            {
                "Process Technology": "HEFA", "Feedstock": "Soybean Oil", "TCI_ref": 420, "Capacity_ref": 480,
                "Yield_biomass": 1.1, "Yield_H2": 0.045, "Yield_kWh": 0.13,
                "P_steps": 3, "Nnp_steps": 26,
                "MassFractions": {"Jet": 71, "Diesel": 0, "Gasoline": 29, "Propane": 0, "Naphtha": 0}
            },
            {
                "Process Technology": "ATJ", "Feedstock": "Ethanol", "TCI_ref": 950, "Capacity_ref": 140,
                "Yield_biomass": 2.5, "Yield_H2": 11.5, "Yield_kWh": 0.48,
                "P_steps": 3, "Nnp_steps": 24,
                "MassFractions": {"Jet": 75, "Diesel": 15, "Gasoline": 8, "Propane": 1, "Naphtha": 1}
            },
            {
                "Process Technology": "FT-BtL", "Feedstock": "Corn Residues", "TCI_ref": 980, "Capacity_ref": 85,
                "Yield_biomass": 6.8, "Yield_H2": 24.0, "Yield_kWh": 0.31,
                "P_steps": 5, "Nnp_steps": 34,
                "MassFractions": {"Jet": 73, "Diesel": 0, "Gasoline": 0, "Propane": 0, "Naphtha": 27}
            },
            {
                "Process Technology": "FT-BtL", "Feedstock": "Rice Straw", "TCI_ref": 960, "Capacity_ref": 75,
                "Yield_biomass": 7.2, "Yield_H2": 23.8, "Yield_kWh": 0.29,
                "P_steps": 5, "Nnp_steps": 36,
                "MassFractions": {"Jet": 71, "Diesel": 0, "Gasoline": 0, "Propane": 0, "Naphtha": 29}
            },
            {
                "Process Technology": "FT", "Feedstock": "Waste CO2", "TCI_ref": 1200, "Capacity_ref": 60,
                "Yield_biomass": 0.8, "Yield_H2": 35.0, "Yield_kWh": 0.65,
                "P_steps": 6, "Nnp_steps": 40,
                "MassFractions": {"Jet": 78, "Diesel": 8, "Gasoline": 8, "Propane": 3, "Naphtha": 3}
            },
            {
                "Process Technology": "CHJ", "Feedstock": "Animal Manure", "TCI_ref": 720, "Capacity_ref": 70,
                "Yield_biomass": 8.5, "Yield_H2": 18.0, "Yield_kWh": 0.33,
                "P_steps": 4, "Nnp_steps": 31,
                "MassFractions": {"Jet": 65, "Diesel": 22, "Gasoline": 11, "Propane": 1, "Naphtha": 1}
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