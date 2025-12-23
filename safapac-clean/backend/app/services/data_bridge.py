# app/services/data_bridge.py

class DataBridge:
    """
    Bridges the gap between new database structure and old calculation layer expectations.
    Maps database keys to calculation layer keys.
    """
    
    @staticmethod
    def db_to_calc_format(db_data: dict) -> dict:
        """
        Convert database reference data to calculation layer format.
        """
        # Key mapping from database to calculation layer
        key_mapping = {
            # Capital case (DB) -> lowercase (Calc)
            "tci_ref": "tci_ref",
            "capacity_ref": "capacity_ref", 
            "yield_biomass": "yield_biomass",
            "yield_h2": "yield_h2",
            "yield_kwh": "yield_kwh",
            "mass_fractions": "mass_fractions",
            "p_steps": "p_steps",
            "nnp_steps": "nnp_steps",
            
            # Additional mappings that might be needed
            "ci_process_default_gco2_mj": "ci_process_default",
            "annual_load_hours_ref": "annual_load_hours",
        }
        
        calc_data = {}
        
        # Map the keys
        for db_key, calc_key in key_mapping.items():
            if db_key in db_data:
                calc_data[calc_key] = db_data[db_key]
        
        # FIX: Convert mass_fractions from list to dictionary format
        if "mass_fractions" in calc_data and isinstance(calc_data["mass_fractions"], list):
            # Convert list of numbers to dictionary with product names as keys
            # Get product names from the products list in db_data
            products = db_data.get("products", [])
            product_names = []
            for product in products:
                # Handle both dictionary format and object format
                if isinstance(product, dict):
                    product_names.append(product.get("name", "").lower())
                else:
                    # If it's an ORM object, use the name attribute
                    product_names.append(getattr(product, "name", "").lower())
            
            mass_fractions_dict = {}
            for i, fraction in enumerate(calc_data["mass_fractions"]):
                if i < len(product_names) and product_names[i]:
                    mass_fractions_dict[product_names[i]] = fraction
                else:
                    mass_fractions_dict[f"product_{i}"] = fraction
            calc_data["mass_fractions"] = mass_fractions_dict
        
        # Copy any other keys that don't need mapping
        for key, value in db_data.items():
            if key not in key_mapping and key not in calc_data:
                calc_data[key] = value
        
        return calc_data