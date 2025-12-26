/**
 * Unit Conversion Utilities
 *
 * This file contains conversion functions for all units used in the biofuel analysis.
 * Each conversion function converts FROM a source unit TO a target unit.
 */

// ==========================================
// CAPACITY CONVERSIONS
// ==========================================

const CAPACITY_CONVERSIONS = {
  "t/yr": {
    "t/yr": (value) => value,
    "KTA": (value) => value / 1000,
    "MGPY": (value) => value * 0.000264172, // tons/yr to million gallons per year (approximate, density-dependent)
    "BPD": (value) => value * 0.0178468, // tons/yr to barrels per day (approximate, density-dependent)
  },
  "KTA": {
    "t/yr": (value) => value * 1000,
    "KTA": (value) => value,
    "MGPY": (value) => value * 0.264172,
    "BPD": (value) => value * 17.8468,
  },
  "MGPY": {
    "t/yr": (value) => value / 0.000264172,
    "KTA": (value) => value / 0.264172,
    "MGPY": (value) => value,
    "BPD": (value) => value * 2739.726, // million gallons per year to barrels per day
  },
  "BPD": {
    "t/yr": (value) => value / 0.0178468,
    "KTA": (value) => value / 17.8468,
    "MGPY": (value) => value / 2739.726,
    "BPD": (value) => value,
  },
};

// ==========================================
// PRICE CONVERSIONS
// ==========================================

const PRICE_CONVERSIONS = {
  "USD/t": {
    "USD/t": (value) => value,
    "USD/kg": (value) => value / 1000,
    "USD/kt": (value) => value * 1000,
  },
  "USD/kg": {
    "USD/t": (value) => value * 1000,
    "USD/kg": (value) => value,
    "USD/kt": (value) => value * 1000000,
  },
  "USD/kt": {
    "USD/t": (value) => value / 1000,
    "USD/kg": (value) => value / 1000000,
    "USD/kt": (value) => value,
  },
};

// ==========================================
// ELECTRICITY RATE CONVERSIONS
// ==========================================

const ELECTRICITY_RATE_CONVERSIONS = {
  "USD/kWh": {
    "USD/kWh": (value) => value,
    "USD/MWh": (value) => value * 1000,
  },
  "USD/MWh": {
    "USD/kWh": (value) => value / 1000,
    "USD/MWh": (value) => value,
  },
};

// ==========================================
// CARBON INTENSITY CONVERSIONS
// ==========================================

const CARBON_INTENSITY_CONVERSIONS = {
  "gCO₂/kg": {
    "gCO₂/kg": (value) => value,
    "kgCO₂/t": (value) => value, // 1 gCO₂/kg = 1 kgCO₂/t
  },
  "kgCO₂/t": {
    "gCO₂/kg": (value) => value, // 1 kgCO₂/t = 1 gCO₂/kg
    "kgCO₂/t": (value) => value,
  },
  "gCO₂/kWh": {
    "gCO₂/kWh": (value) => value,
    "kgCO₂/MWh": (value) => value, // 1 gCO₂/kWh = 1 kgCO₂/MWh
  },
  "kgCO₂/MWh": {
    "gCO₂/kWh": (value) => value, // 1 kgCO₂/MWh = 1 gCO₂/kWh
    "kgCO₂/MWh": (value) => value,
  },
};

// ==========================================
// YIELD CONVERSIONS (mostly 1:1)
// ==========================================

const YIELD_CONVERSIONS = {
  "kg/kg": {
    "kg/kg": (value) => value,
    "ton/ton": (value) => value, // Same ratio
  },
  "ton/ton": {
    "kg/kg": (value) => value,
    "ton/ton": (value) => value,
  },
  "kWh/kg": {
    "kWh/kg": (value) => value,
    "MWh/kg": (value) => value / 1000,
  },
  "MWh/kg": {
    "kWh/kg": (value) => value * 1000,
    "MWh/kg": (value) => value,
  },
};

// ==========================================
// PRICE SENSITIVITY CONVERSIONS
// ==========================================

const PRICE_SENSITIVITY_CONVERSIONS = {
  "USD/gCO₂": {
    "USD/gCO₂": (value) => value,
    "USD/kgCO₂": (value) => value * 1000,
  },
  "USD/kgCO₂": {
    "USD/gCO₂": (value) => value / 1000,
    "USD/kgCO₂": (value) => value,
  },
};

// ==========================================
// MASTER CONVERSION FUNCTION
// ==========================================

/**
 * Convert a value from one unit to another
 * @param {number} value - The value to convert
 * @param {string} fromUnit - The source unit
 * @param {string} toUnit - The target unit
 * @param {string} conversionType - The type of conversion (e.g., "capacity", "price", etc.)
 * @returns {number} The converted value
 */
export const convertUnit = (value, fromUnit, toUnit, conversionType) => {
  if (value === null || value === undefined || isNaN(value)) {
    return value;
  }

  if (fromUnit === toUnit) {
    return value;
  }

  const conversionMap = getConversionMap(conversionType);

  if (!conversionMap || !conversionMap[fromUnit] || !conversionMap[fromUnit][toUnit]) {
    console.warn(`No conversion available from ${fromUnit} to ${toUnit} for type ${conversionType}`);
    return value;
  }

  return conversionMap[fromUnit][toUnit](value);
};

/**
 * Get the appropriate conversion map for a conversion type
 */
const getConversionMap = (conversionType) => {
  const maps = {
    capacity: CAPACITY_CONVERSIONS,
    price: PRICE_CONVERSIONS,
    electricity_rate: ELECTRICITY_RATE_CONVERSIONS,
    carbon_intensity: CARBON_INTENSITY_CONVERSIONS,
    yield: YIELD_CONVERSIONS,
    price_sensitivity: PRICE_SENSITIVITY_CONVERSIONS,
  };
  return maps[conversionType];
};

/**
 * Map input field names to their conversion types
 */
export const FIELD_TO_CONVERSION_TYPE = {
  // Capacity fields
  production_capacity: "capacity",
  capacity_ref: "capacity",

  // Price fields
  feedstock_price: "price",
  hydrogen_price: "price",

  // Electricity rate
  electricity_rate: "electricity_rate",

  // Carbon intensity fields
  feedstock_carbon_intensity: "carbon_intensity",
  hydrogen_carbon_intensity: "carbon_intensity",
  electricity_carbon_intensity: "carbon_intensity",

  // Yield fields
  feedstock_yield: "yield",
  hydrogen_yield: "yield",
  electricity_yield: "yield",
};

/**
 * Map unit field names to their corresponding value field names
 */
export const UNIT_TO_VALUE_FIELD = {
  plant_capacity_unit: "production_capacity",
  capacity_ref_unit: "capacity_ref",
  feedstock_price_unit: "feedstock_price",
  hydrogen_price_unit: "hydrogen_price",
  electricity_rate_unit: "electricity_rate",
  feedstock_ci_unit: "feedstock_carbon_intensity",
  hydrogen_ci_unit: "hydrogen_carbon_intensity",
  electricity_ci_unit: "electricity_carbon_intensity",
  feedstock_yield_unit: "feedstock_yield",
  hydrogen_yield_unit: "hydrogen_yield",
  electricity_yield_unit: "electricity_yield",
};

/**
 * Map product unit field names to their conversion types
 */
export const PRODUCT_FIELD_TO_CONVERSION_TYPE = {
  price: "price",
  priceSensitivity: "price_sensitivity",
  yield: "yield",
};

/**
 * Map product unit keys to their value keys
 */
export const PRODUCT_UNIT_TO_VALUE_FIELD = {
  priceUnit: "price",
  priceSensitivityUnit: "priceSensitivity",
  yieldUnit: "yield",
};
