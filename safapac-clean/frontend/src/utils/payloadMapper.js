// src/utils/payloadMapper.js

/**
 * Maps the flat Frontend UI state to the Nested Backend Pydantic Schema
 * Used when: Calculating or Saving (UI -> Backend)
 */
export const mapUiStateToBackend = (uiInputs, selectedProcess, selectedFeedstock, selectedCountry) => {
  const num = (val) => (val === "" || val === null || val === undefined ? 0 : Number(val));

  return {
    process_technology: selectedProcess,
    feedstock: selectedFeedstock,
    country: selectedCountry || "USA",
    conversion_plant: {
      plant_capacity: { value: num(uiInputs.production_capacity), unit_id: 3 },
      annual_load_hours: num(uiInputs.annual_load_hours),
      ci_process_default: num(uiInputs.conversion_process_ci_default)
    },
    economic_parameters: {
      project_lifetime_years: num(uiInputs.plant_lifetime),
      discount_rate_percent: num(uiInputs.discount_factor) * 100,
      tci_ref_musd: num(uiInputs.tci_ref) / 1000000,
      reference_capacity_ktpa: num(uiInputs.capacity_ref),
      tci_scaling_exponent: num(uiInputs.tci_scaling_exponent),
      working_capital_tci_ratio: num(uiInputs.wc_to_tci_ratio),
      indirect_opex_tci_ratio: num(uiInputs.indirect_opex_to_tci_ratio)
    },
    feedstock_data: [{
        name: selectedFeedstock,
        price: { value: num(uiInputs.feedstock_price), unit_id: 7 },
        carbon_content: num(uiInputs.feedstock_carbon_content),
        carbon_intensity: { value: num(uiInputs.feedstock_carbon_intensity), unit_id: 11 },
        energy_content: num(uiInputs.feedstock_energy_content),
        yield_percent: num(uiInputs.feedstock_yield)
    }],
    utility_data: [
      {
        name: "Hydrogen",
        price: { value: num(uiInputs.hydrogen_price), unit_id: 6 },
        carbon_content: num(uiInputs.hydrogen_carbon_content),
        carbon_intensity: { value: num(uiInputs.hydrogen_carbon_intensity), unit_id: 11 },
        energy_content: num(uiInputs.hydrogen_energy_content),
        yield_percent: num(uiInputs.hydrogen_yield)
      },
      {
        name: "Electricity",
        price: { value: num(uiInputs.electricity_rate), unit_id: 10 },
        carbon_content: num(uiInputs.electricity_carbon_content),
        carbon_intensity: { value: num(uiInputs.electricity_carbon_intensity), unit_id: 13 },
        energy_content: num(uiInputs.electricity_energy_content),
        yield_percent: num(uiInputs.electricity_yield)
      }
    ],
    product_data: (uiInputs.products || []).map(p => ({
      name: p.name,
      price: { value: num(p.price), unit_id: 7 },
      price_sensitivity_to_ci: num(p.priceSensitivity),
      carbon_content: num(p.carbonContent),
      energy_content: num(p.energyContent),
      yield_percent: num(p.massFraction),
      product_density: num(p.density)
    }))
  };
};

/**
 * Maps the Nested Backend Pydantic Schema back to Flat Frontend UI state
 * Used when: Loading Scenario 1 (Backend -> UI)
 */
export const mapBackendToUiState = (backendInputs) => {
  // Helper to get property regardless of snake_case or camelCase
  const get = (obj, snake, camel) => obj ? (obj[snake] !== undefined ? obj[snake] : obj[camel]) : undefined;
  
  // 1. Resolve root objects
  const cp = get(backendInputs, 'conversion_plant', 'conversionPlant');
  
  // If no conversion plant data found, return null to trigger defaults
  if (!cp) return null;

  const ep = get(backendInputs, 'economic_parameters', 'economicParameters') || {};
  
  const fdList = get(backendInputs, 'feedstock_data', 'feedstockData') || [];
  const fs = fdList[0] || {};
  
  const udList = get(backendInputs, 'utility_data', 'utilityData') || [];
  const pdList = get(backendInputs, 'product_data', 'productData') || [];

  // Helper to find specific utility
  const util = (name) => udList.find(u => u.name?.toLowerCase() === name.toLowerCase()) || {};

  // Helper to safely extract value from quantity object or direct number
  const val = (obj) => (obj && typeof obj === 'object' && 'value' in obj) ? obj.value : obj;

  // Helper to get nested property (handles quantity objects like plant_capacity.value)
  const getVal = (parent, snake, camel) => {
    const item = get(parent, snake, camel);
    return val(item);
  };

  return {
    selected_process: get(backendInputs, 'process_technology', 'processTechnology'),
    selected_feedstock: get(backendInputs, 'feedstock', 'feedstock'),
    selectedCountry: get(backendInputs, 'country', 'country'),
    
    // Conversion Plant
    production_capacity: getVal(cp, 'plant_capacity', 'plantCapacity'),
    annual_load_hours: get(cp, 'annual_load_hours', 'annualLoadHours'),
    conversion_process_ci_default: get(cp, 'ci_process_default', 'ciProcessDefault'),

    // Economic Parameters
    plant_lifetime: get(ep, 'project_lifetime_years', 'projectLifetimeYears'),
    discount_factor: (get(ep, 'discount_rate_percent', 'discountRatePercent') || 0) / 100,
    tci_ref: (get(ep, 'tci_ref_musd', 'tciRefMusd') || 0) * 1000000,
    capacity_ref: get(ep, 'reference_capacity_ktpa', 'referenceCapacityKtpa'),
    tci_scaling_exponent: get(ep, 'tci_scaling_exponent', 'tciScalingExponent'),
    wc_to_tci_ratio: get(ep, 'working_capital_tci_ratio', 'workingCapitalTciRatio'),
    indirect_opex_to_tci_ratio: get(ep, 'indirect_opex_tci_ratio', 'indirectOpexTciRatio'),

    // Feedstock
    feedstock_price: getVal(fs, 'price', 'price'),
    feedstock_carbon_content: get(fs, 'carbon_content', 'carbonContent'),
    feedstock_carbon_intensity: getVal(fs, 'carbon_intensity', 'carbonIntensity'),
    feedstock_energy_content: get(fs, 'energy_content', 'energyContent'),
    feedstock_yield: get(fs, 'yield_percent', 'yieldPercent'),

    // Utilities (H2)
    hydrogen_price: getVal(util('Hydrogen'), 'price', 'price'),
    hydrogen_yield: get(util('Hydrogen'), 'yield_percent', 'yieldPercent'),
    hydrogen_carbon_intensity: getVal(util('Hydrogen'), 'carbon_intensity', 'carbonIntensity'),
    hydrogen_energy_content: get(util('Hydrogen'), 'energy_content', 'energyContent'),
    hydrogen_carbon_content: get(util('Hydrogen'), 'carbon_content', 'carbonContent'),

    // Utilities (Elec)
    electricity_rate: getVal(util('Electricity'), 'price', 'price'),
    electricity_yield: get(util('Electricity'), 'yield_percent', 'yieldPercent'),
    electricity_carbon_intensity: getVal(util('Electricity'), 'carbon_intensity', 'carbonIntensity'),
    electricity_energy_content: get(util('Electricity'), 'energy_content', 'energyContent'),
    electricity_carbon_content: get(util('Electricity'), 'carbon_content', 'carbonContent'),
    // Products
    products: pdList.map(p => ({
      name: p.name,
      price: getVal(p, 'price', 'price'),
      priceSensitivity: get(p, 'price_sensitivity_to_ci', 'priceSensitivityToCi'),
      carbonContent: get(p, 'carbon_content', 'carbonContent'),
      energyContent: get(p, 'energy_content', 'energyContent'),
      massFraction: get(p, 'yield_percent', 'yieldPercent'),
      density: get(p, 'product_density', 'productDensity'),
      // Defaults for units
      priceUnit: "USD/t",
      priceSensitivityUnit: "USD/gCO2",
      energyUnit: "MJ/kg",
      yieldUnit: "kg/kg"
    }))
  };
};