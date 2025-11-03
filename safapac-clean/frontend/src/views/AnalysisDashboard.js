import React, { useState } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  CardHeader,
  Button,
  Modal,
  ModalBody,
} from "shards-react";
import axios from "axios";
import BreakevenBarChart from "../components/charts/BreakevenBarChart";
import BiofuelForm from "../forms/BiofuelForm";
import CashFlowTable from "../forms/CashFlowTable";
import { useTheme } from "../contexts/ThemeContext";

// ✅ Mock data for fallback
const mockCashFlowTable = [
  { year: 0, cashInflow: 0, cashOutflow: 1000000, netCashFlow: -1000000, presentValue: -1000000 },
  { year: 1, cashInflow: 200000, cashOutflow: 50000, netCashFlow: 150000, presentValue: -850000 },
  { year: 2, cashInflow: 250000, cashOutflow: 60000, netCashFlow: 190000, presentValue: -660000 },
  { year: 3, cashInflow: 300000, cashOutflow: 70000, netCashFlow: 230000, presentValue: -430000 },
  { year: 4, cashInflow: 320000, cashOutflow: 80000, netCashFlow: 240000, presentValue: -190000 },
  { year: 5, cashInflow: 350000, cashOutflow: 90000, netCashFlow: 260000, presentValue: 70000 },
  { year: 6, cashInflow: 400000, cashOutflow: 100000, netCashFlow: 300000, presentValue: 370000 },
  { year: 7, cashInflow: 450000, cashOutflow: 110000, netCashFlow: 340000, presentValue: 710000 },
  { year: 8, cashInflow: 500000, cashOutflow: 120000, netCashFlow: 380000, presentValue: 1090000 },
  { year: 9, cashInflow: 520000, cashOutflow: 130000, netCashFlow: 390000, presentValue: 1480000 },
  { year: 10, cashInflow: 550000, cashOutflow: 150000, netCashFlow: 400000, presentValue: 1880000 },
];

const buildChartData = (tableData = []) =>
  tableData.map((row, i) => ({
    Year: row.Year ?? row.year ?? i,
    "Cumulative DCF (USD)": Number.isFinite(row["Cumulative DCF (USD)"])
      ? row["Cumulative DCF (USD)"]
      : Number.isFinite(row.presentValue ?? row["Present Value"])
      ? row.presentValue ?? row["Present Value"]
      : Number.isFinite(row.netCashFlow ?? row["Net Cash Flow"])
      ? row.netCashFlow ?? row["Net Cash Flow"]
      : 0,
  }));

const toNumericOrZero = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const normalizeHydrogenPrice = (value, unit = "USD/kg") => {
  const numeric = toNumericOrZero(value);
  switch ((unit || "").toUpperCase()) {
    case "USD/KG":
    case "$/KG":
      return { value: numeric, unit: "USD/kg" };
    case "USD/T":
    case "USD/TON":
    case "$/T":
    case "$/TON":
      return { value: numeric / 1000, unit: "USD/kg" };
    case "USD/KT":
    case "$/KT":
      return { value: numeric / 1_000_000, unit: "USD/kg" };
    default:
      return { value: numeric, unit };
  }
};

const normalizeElectricityRate = (value, unit = "USD/kWh") => {
  const numeric = toNumericOrZero(value);
  switch ((unit || "").toUpperCase()) {
    case "USD/KWH":
    case "$/KWH":
      return { value: numeric, unit: "USD/kWh" };
    case "USD/MWH":
    case "$/MWH":
      return { value: numeric / 1000, unit: "USD/kWh" };
    default:
      return { value: numeric, unit };
  }
};

const normalizeHydrogenYield = (value, unit = "kg/kg") => {
  const numeric = toNumericOrZero(value);
  switch ((unit || "").toLowerCase()) {
    case "kg/kg":
    case "ton/ton":
      return { value: numeric, unit: "kg/kg" };
    default:
      return { value: numeric, unit };
  }
};

const normalizeElectricityYield = (value, unit = "kWh/kg") => {
  const numeric = toNumericOrZero(value);
  const unitKey = (unit || "").toLowerCase();
  if (unitKey === "mwh/kg") {
    return { value: numeric * 1000, unit: "kWh/kg" };
  }
  return { value: numeric, unit: "kWh/kg" };
};

const normalizeCarbonIntensity = (value, unit, baseUnit) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const numeric = toNumericOrZero(value);
  if (!unit) {
    return { value: numeric, unit: baseUnit };
  }
  const key = `${unit}->${baseUnit}`;
  const normalizedValue = {
    "kgCO2/t->gCO2/kg": numeric,
    "kgCO2/MWh->gCO2/kWh": numeric,
  }[key];

  if (normalizedValue !== undefined) {
    return { value: normalizedValue, unit: baseUnit };
  }

  if (unit === baseUnit) {
    return { value: numeric, unit: baseUnit };
  }
  return { value: numeric, unit };
};

const AnalysisDashboard = ({ selectedCurrency = "USD" }) => {
  const { colors } = useTheme();
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [inputs, setInputs] = useState({
    production_capacity: 5000,
    plant_capacity_unit: "t/yr",
    average_liquid_density: 820,
    average_liquid_density_unit: "kg/m3",
    annual_load_hours: 8000,
    conversion_process_ci_default: 45,
    feedstock_price: 250,
    feedstock_price_unit: "USD/t",
    hydrogen_price: 2.5,
    hydrogen_price_unit: "USD/kg",
    electricity_rate: 0.12,
    electricity_rate_unit: "USD/kWh",
    feedstock_carbon_intensity: 50,
    feedstock_ci_unit: "gCO2/kg",
    feedstock_energy_content: 18,
    feedstock_energy_unit: "MJ/kg",
    feedstock_yield: 1.5,
    feedstock_yield_unit: "kg/kg",
    hydrogen_yield: 0.042,
    hydrogen_yield_unit: "kg/kg",
    electricity_yield: 0.12,
    electricity_yield_unit: "kWh/kg",
    hydrogen_carbon_intensity: 0,
    hydrogen_ci_unit: "gCO2/kg",
    electricity_carbon_intensity: 0,
    electricity_ci_unit: "gCO2/kWh",
    feedstock_carbon_content: 0.5,
    plant_lifetime: 25,
    discount_factor: 0.105,
    land_cost: 1026898.876,
    tci_ref: 250_000_000,
    tci_ref_unit: "USD",
    capacity_ref: 50000,
    capacity_ref_unit: "t/yr",
    tci_scaling_exponent: 0.6,
    wc_to_tci_ratio: 0.1,
    indirect_opex_to_tci_ratio: 0.05,
    products: [
      {
        name: "Jet Fuel",
        price: 2750,
        priceUnit: "USD/t",
        priceSensitivity: 0,
        priceSensitivityUnit: "USD/gCO2",
        carbonContent: 0.7,
        energyContent: 43,
        energyUnit: "MJ/kg",
        yield: 0.4,
        yieldUnit: "kg/kg",
        massFraction: 70,
      },
      {
        name: "Diesel",
        price: 2000,
        priceUnit: "USD/t",
        priceSensitivity: 0,
        priceSensitivityUnit: "USD/gCO2",
        carbonContent: 0.75,
        energyContent: 42,
        energyUnit: "MJ/kg",
        yield: 0.2,
        yieldUnit: "kg/kg",
        massFraction: 20,
      },
      {
        name: "Naphtha",
        price: 1500,
        priceUnit: "USD/t",
        priceSensitivity: 0,
        priceSensitivityUnit: "USD/gCO2",
        carbonContent: 0.65,
        energyContent: 40,
        energyUnit: "MJ/kg",
        yield: 0.1,
        yieldUnit: "kg/kg",
        massFraction: 10,
      },
    ],
  });

  // Start with empty strings - will be populated by BiofuelForm when it loads from API
  const [selectedProcess, setSelectedProcess] = useState("");
  const [selectedFeedstock, setSelectedFeedstock] = useState("");

  const [apiData, setApiData] = useState(null);
  const [table, setTable] = useState(mockCashFlowTable);
  const [chartData, setChartData] = useState(buildChartData(mockCashFlowTable));
  const [openTable, setOpenTable] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  // const [expandedGroups, setExpandedGroups] = useState({
  //   financial: false,
  //   production: false,
  //   cost: false,
  //   environmental: false,
  // });
  const [expandedGroups, setExpandedGroups] = useState({
    processOutputs: false,
    economicOutputs: false,
  });
  const [expandedStatDetails, setExpandedStatDetails] = useState({});
  const API_URL = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) || "http://127.0.0.1:8000";
  // When API has returned results, we use a bigger, centered value style for KPIs
  const hasResults = Boolean(apiData && (apiData.technoEconomics || apiData.financials));

  const toggleGroup = (groupKey) => {
    setExpandedGroups((prev) => {
      const isCurrentlyExpanded = prev[groupKey];

      // If clicking on an already expanded group, collapse it
      if (isCurrentlyExpanded) {
        return {
          ...prev,
          [groupKey]: false,
        };
      }

      // If clicking on a collapsed group, collapse all others and expand this one
      // return {
      //   financial: false,
      //   production: false,
      //   cost: false,
      //   environmental: false,
      //   [groupKey]: true,
      // };
      return {
        processOutputs: false,
        economicOutputs: false,
        [groupKey]: true,
      };
    });
  };

  const toggleStatDetail = (statKey) => {
    setExpandedStatDetails((prev) => ({
      ...prev,
      [statKey]: !prev[statKey],
    }));
  };

  const handleSliderChange = (key) => (vals) => {
    setInputs((prev) => ({
      ...prev,
      [key]: Number(vals[0]),
    }));
  };

  const handleInputChange = (key) => (valueOrEvent) => {
    const value =
      valueOrEvent && typeof valueOrEvent === "object" && "target" in valueOrEvent
        ? valueOrEvent.target.value
        : valueOrEvent;
    setInputs((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleProductSliderChange = (index, key) => (vals) => {
    setInputs((prev) => {
      const products = prev.products.map((product, idx) =>
        idx === index ? { ...product, [key]: Number(vals[0]) } : product
      );
      return { ...prev, products };
    });
  };

  const handleProductInputChange = (index, key) => (valueOrEvent) => {
    const value =
      valueOrEvent && typeof valueOrEvent === "object" && "target" in valueOrEvent
        ? valueOrEvent.target.value
        : valueOrEvent;
    setInputs((prev) => {
      const products = prev.products.map((product, idx) =>
        idx === index ? { ...product, [key]: value } : product
      );
      return { ...prev, products };
    });
  };

  const addProduct = () => {
    setInputs((prev) => ({
      ...prev,
      products: [
        ...prev.products,
        {
          name: `Product ${prev.products.length + 1}`,
          price: 1000,
          priceUnit: "USD/t",
          priceSensitivity: 0,
          priceSensitivityUnit: "USD/gCO2",
          carbonContent: 0.6,
          energyContent: 35,
          energyUnit: "MJ/kg",
          yield: 0.1,
          yieldUnit: "kg/kg",
          massFraction: 0,
        },
      ],
    }));
  };

  const removeProduct = (index) => {
    setInputs((prev) => {
      if (prev.products.length <= 1) return prev;
      const products = prev.products.filter((_, idx) => idx !== index);
      return { ...prev, products };
    });
  };

  const handleReset = () => {
    // Reset to initial default values
    setInputs({
      production_capacity: 5000,
      plant_capacity_unit: "t/yr",
      average_liquid_density: 820,
      average_liquid_density_unit: "kg/m3",
      annual_load_hours: 8000,
      conversion_process_ci_default: 45,
      feedstock_price: 250,
      feedstock_price_unit: "USD/t",
      hydrogen_price: 2.5,
      hydrogen_price_unit: "USD/kg",
      electricity_rate: 0.12,
      electricity_rate_unit: "USD/kWh",
      feedstock_carbon_intensity: 50,
      feedstock_ci_unit: "gCO2/kg",
      feedstock_energy_content: 18,
      feedstock_energy_unit: "MJ/kg",
      feedstock_yield: 1.5,
      feedstock_yield_unit: "kg/kg",
      hydrogen_yield: 0.042,
      hydrogen_yield_unit: "kg/kg",
      electricity_yield: 0.12,
      electricity_yield_unit: "kWh/kg",
      hydrogen_carbon_intensity: 0,
      hydrogen_ci_unit: "gCO2/kg",
      electricity_carbon_intensity: 0,
      electricity_ci_unit: "gCO2/kWh",
      feedstock_carbon_content: 0.5,
      plant_lifetime: 25,
      discount_factor: 0.105,
      land_cost: 1026898.876,
      tci_ref: 250_000_000,
      tci_ref_unit: "USD",
      capacity_ref: 50000,
      capacity_ref_unit: "t/yr",
      tci_scaling_exponent: 0.6,
      wc_to_tci_ratio: 0.1,
      indirect_opex_to_tci_ratio: 0.05,
      products: [
        {
          name: "Jet Fuel",
          price: 2750,
          priceUnit: "USD/t",
          priceSensitivity: 0,
          priceSensitivityUnit: "USD/gCO2",
          carbonContent: 0.7,
          energyContent: 43,
          energyUnit: "MJ/kg",
          yield: 0.4,
          yieldUnit: "kg/kg",
          massFraction: 70,
        },
      ],
    });
    // Reset chart data
    setChartData({ labels: [], pv: [], breakevenIndex: -1 });
  };

  const handleSave = () => {
    // Export inputs and outputs to CSV
    if (!apiData) {
      alert("Please calculate results before saving!");
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    // Prepare CSV content
    const csvRows = [];

    // Header
    csvRows.push("SAFAPAC Techno-Economic Analysis Results");
    csvRows.push(`Generated: ${new Date().toLocaleString()}`);
    csvRows.push(`Process: ${selectedProcess || 'N/A'}`);
    csvRows.push(`Feedstock: ${selectedFeedstock || 'N/A'}`);
    csvRows.push("");

    // Inputs Section
    csvRows.push("=== INPUTS ===");
    csvRows.push("Parameter,Value,Unit");
    csvRows.push(`Production Capacity,${inputs.production_capacity},${inputs.plant_capacity_unit}`);
    csvRows.push(`Average Liquid Density,${inputs.average_liquid_density},${inputs.average_liquid_density_unit}`);
    csvRows.push(`Annual Load Hours,${inputs.annual_load_hours},hours`);
    csvRows.push(`Feedstock Price,${inputs.feedstock_price},${inputs.feedstock_price_unit}`);
    csvRows.push(`Hydrogen Price,${inputs.hydrogen_price},${inputs.hydrogen_price_unit}`);
    csvRows.push(`Electricity Rate,${inputs.electricity_rate},${inputs.electricity_rate_unit}`);
    csvRows.push(`Plant Lifetime,${inputs.plant_lifetime},years`);
    csvRows.push(`Discount Factor,${inputs.discount_factor},-`);
    csvRows.push(`TCI Reference,${inputs.tci_ref},${inputs.tci_ref_unit}`);
    csvRows.push(`Capacity Reference,${inputs.capacity_ref},${inputs.capacity_ref_unit}`);
    csvRows.push("");

    // Products
    csvRows.push("=== PRODUCTS ===");
    csvRows.push("Name,Price,Price Unit,Mass Fraction %");
    inputs.products.forEach(product => {
      csvRows.push(`${product.name},${product.price},${product.priceUnit},${product.massFraction}`);
    });
    csvRows.push("");

    // Outputs Section
    csvRows.push("=== OUTPUTS ===");
    csvRows.push("Metric,Value,Unit");

    if (apiData.technoEconomics) {
      const te = apiData.technoEconomics;
      csvRows.push(`Total Capital Investment,${te.total_capital_investment || 'N/A'},${selectedCurrency}`);
      csvRows.push(`Annual Production,${te.production || 'N/A'},t/yr`);
      csvRows.push(`Feedstock Consumption,${te.feedstock_consumption || 'N/A'},t/yr`);
      csvRows.push(`Hydrogen Consumption,${te.hydrogen_consumption || 'N/A'},kg/yr`);
      csvRows.push(`Electricity Consumption,${te.electricity_consumption || 'N/A'},kWh/yr`);
      csvRows.push(`Total OPEX,${te.total_opex || 'N/A'},${selectedCurrency}/yr`);
      csvRows.push(`Total Direct OPEX,${te.total_direct_opex || 'N/A'},${selectedCurrency}/yr`);
      csvRows.push(`Total Indirect OPEX,${te.total_indirect_opex || 'N/A'},${selectedCurrency}/yr`);
      csvRows.push(`Feedstock Cost,${te.feedstock_cost || 'N/A'},${selectedCurrency}/yr`);
      csvRows.push(`Hydrogen Cost,${te.hydrogen_cost || 'N/A'},${selectedCurrency}/yr`);
      csvRows.push(`Electricity Cost,${te.electricity_cost || 'N/A'},${selectedCurrency}/yr`);
      csvRows.push(`LCOP,${te.LCOP || te.lcop || 'N/A'},${selectedCurrency}/t`);
      csvRows.push(`LCCA,${te.LCCA || te.lcca || 'N/A'},${selectedCurrency}/tCO2`);
      csvRows.push(`Carbon Intensity,${te.carbon_intensity || 'N/A'},gCO2e/MJ`);
      csvRows.push(`Total CO2 Emissions,${te.total_co2_emissions || 'N/A'},tCO2/yr`);
      csvRows.push(`Carbon Conversion Efficiency,${te.carbon_conversion_efficiency_percent || 'N/A'},%`);
    }

    if (apiData.financials) {
      const fin = apiData.financials;
      csvRows.push(`NPV,${fin.npv || 'N/A'},${selectedCurrency}`);
      csvRows.push(`IRR,${fin.irr || 'N/A'},%`);
      csvRows.push(`Payback Period,${fin.paybackPeriod || 'N/A'},years`);
      csvRows.push(`Breakeven Year,${fin.breakevenYear || 'N/A'},year`);
    }
    csvRows.push("");

    // Cash Flow Table
    if (apiData.financials?.cashFlowTable) {
      csvRows.push("=== CASH FLOW TABLE ===");
      const table = apiData.financials.cashFlowTable;

      // Headers
      const headers = Object.keys(table[0] || {});
      csvRows.push(headers.join(","));

      // Data rows
      table.forEach(row => {
        const values = headers.map(h => {
          const val = row[h];
          // Handle values that might contain commas
          if (typeof val === 'string' && val.includes(',')) {
            return `"${val}"`;
          }
          return val;
        });
        csvRows.push(values.join(","));
      });
    }

    // Create CSV blob and download
    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `SAFAPAC_Results_${timestamp}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const buildStructuredInputs = () => {
    const feedstockName = selectedFeedstock || "Feedstock_1";

    const hasAverageDensity =
      inputs.average_liquid_density !== null &&
      inputs.average_liquid_density !== undefined &&
      inputs.average_liquid_density_unit;

    const averageDensityBlock = hasAverageDensity
        ? {
            value: inputs.average_liquid_density,
            unit: inputs.average_liquid_density_unit,
          }
        : null;

    const feedstockBlock = {
      name: feedstockName,
      price: { value: inputs.feedstock_price, unit: inputs.feedstock_price_unit },
      carbon_content: inputs.feedstock_carbon_content,
      carbon_intensity: { value: inputs.feedstock_carbon_intensity, unit: inputs.feedstock_ci_unit },
      energy_content: { value: inputs.feedstock_energy_content, unit: inputs.feedstock_energy_unit },
      yield_: { value: inputs.feedstock_yield, unit: inputs.feedstock_yield_unit },
    };

    const hydrogenPrice = normalizeHydrogenPrice(inputs.hydrogen_price, inputs.hydrogen_price_unit);
    const electricityRate = normalizeElectricityRate(inputs.electricity_rate, inputs.electricity_rate_unit);
    const hydrogenYield = normalizeHydrogenYield(inputs.hydrogen_yield, inputs.hydrogen_yield_unit);
    const electricityYield = normalizeElectricityYield(inputs.electricity_yield, inputs.electricity_yield_unit);
    const hydrogenCI = normalizeCarbonIntensity(
      inputs.hydrogen_carbon_intensity,
      inputs.hydrogen_ci_unit,
      "gCO2/kg"
    );
    const electricityCI = normalizeCarbonIntensity(
      inputs.electricity_carbon_intensity,
      inputs.electricity_ci_unit,
      "gCO2/kWh"
    );

    const utilitiesBlock = [
      {
        name: "Hydrogen",
        price: hydrogenPrice,
        yield_: hydrogenYield,
        carbon_intensity: hydrogenCI,
      },
      {
        name: "Electricity",
        price: electricityRate,
        yield_: electricityYield,
        carbon_intensity: electricityCI,
      },
    ];

    const productsBlock = (inputs.products || []).map((product) => ({
      name: product.name,
      price: { value: Number(product.price) || 0, unit: product.priceUnit },
      price_sensitivity_to_ci: {
        value: Number(product.priceSensitivity) || 0,
        unit: product.priceSensitivityUnit,
      },
      carbon_content: Number(product.carbonContent) || 0,
      energy_content: { value: Number(product.energyContent) || 0, unit: product.energyUnit },
      yield_: { value: Number(product.yield) || 0, unit: product.yieldUnit },
      mass_fraction: Number(product.massFraction) || 0,
    }));

    const economicsBlock = {
      discount_rate: inputs.discount_factor,
      project_lifetime_years: inputs.plant_lifetime,
      tci_at_reference_capacity: { value: inputs.tci_ref, unit: inputs.tci_ref_unit },
      tci_scaling_exponent: inputs.tci_scaling_exponent,
      reference_production_capacity: { value: inputs.capacity_ref, unit: inputs.capacity_ref_unit },
      wc_to_tci_ratio: inputs.wc_to_tci_ratio,
      indirect_opex_to_tci_ratio: inputs.indirect_opex_to_tci_ratio,
    };

    return {
      plant: {
        total_liquid_fuel_capacity: { value: inputs.production_capacity, unit: inputs.plant_capacity_unit },
        annual_load_hours: inputs.annual_load_hours,
        conversion_process_carbon_intensity_default: inputs.conversion_process_ci_default,
        process_type: selectedProcess,
        average_liquid_density: averageDensityBlock,
      },
      feedstocks: [feedstockBlock],
      utilities: utilitiesBlock,
      products: productsBlock,
      economics: economicsBlock,
    };
  };

  const applyTableData = (tableData) => {
    setTable(tableData);
    setChartData(buildChartData(tableData));
  };

  const calculateOutputs = async () => {
    if (!selectedProcess || !selectedFeedstock) {
      console.warn("Process and feedstock must be selected before calculation.");
      return;
    }

    const totalMassFraction = (inputs.products || []).reduce(
      (acc, product) => acc + (Number(product.massFraction) || 0),
      0
    );
    if (totalMassFraction > 100 + 1e-6) {
      console.warn("Total product mass fraction exceeds 100%. Adjust inputs before calculating.");
      return;
    }

    setIsCalculating(true);
    try {
        const structuredInputs = buildStructuredInputs();
        const payload = {
          inputs: structuredInputs,
          process_technology: selectedProcess,
          feedstock: selectedFeedstock,
          product_key: "jet",
        };
      console.log("=== API Request ===");
      console.log("API_URL:", API_URL);
      console.log("Payload:", payload);

      const res = await axios.post(`${API_URL}/calculate`, payload);

      console.log("=== API Response ===");
      console.log("Status:", res.status);
      console.log("Full response data:", res.data);
      console.log("Has financials?", res.data?.financials);
      console.log("Has error?", res.data?.error);
      console.log("Cash Flow Table length:", res.data?.financials?.cashFlowTable?.length);
      console.log("First 3 rows:", res.data?.financials?.cashFlowTable?.slice(0, 3));

      setApiData(res.data);

      if (res.data?.error) {
        console.error("Backend returned error:", res.data.error);
        applyTableData(mockCashFlowTable);
      } else if (res.data?.financials?.cashFlowTable?.length) {
        applyTableData(res.data.financials.cashFlowTable);
        console.log("Table updated with", res.data.financials.cashFlowTable.length, "rows of API data");
      } else {
        console.warn("No cash flow table in response, using mock data");
        console.warn("Response structure:", Object.keys(res.data));
        applyTableData(mockCashFlowTable);
      }
    } catch (error) {
      console.error("=== API Error ===");
      console.error("Error:", error.message);
      console.warn("Using mock cash flow table");
      applyTableData(mockCashFlowTable);
      setApiData(null);
    } finally {
      setIsCalculating(false);
    }
  };

  // ✅ Currency conversion rates (approximate rates as of 2024)
  const currencyRates = {
    USD: { rate: 1, symbol: "$", name: "USD" },
    MYR: { rate: 4.7, symbol: "RM", name: "MYR" }, // Malaysian Ringgit
    GBP: { rate: 0.79, symbol: "£", name: "GBP" }, // UK Pound
    EUR: { rate: 0.85, symbol: "€", name: "EUR" }, // Euro (France)
  };

  // ✅ Currency converter
  const convertCurrency = (usdValue, targetCurrency) => {
    if (usdValue === null || usdValue === undefined || isNaN(usdValue)) return usdValue;
    return usdValue * currencyRates[targetCurrency].rate;
  };

  // ✅ Number formatter with currency (no symbol - symbol goes in header)
  const formatValue = (val, decimals = 2, currency = "USD") => {
    if (val === null || val === undefined || isNaN(val)) return "N/A";
    const convertedValue = convertCurrency(val, currency);
    const formatted = Number(convertedValue).toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return formatted;
  };

  // ✅ Number formatter without currency
  const formatNumber = (val, decimals = 2) => {
    if (val === null || val === undefined || isNaN(val)) return "N/A";
    return Number(val).toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  // ✅ Percentage formatter
  const formatPercent = (val, decimals = 2) => {
    if (val === null || val === undefined || isNaN(val)) return "N/A";
    return (val * 100).toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  // Get currency symbol for display
  const currSymbol = currencyRates[selectedCurrency]?.symbol || "$";

  // ✅ KPI cards grouped by context
  /* const kpiGroups = {
    financial: {
      title: "Financial Metrics",
      color: colors.oxfordBlue,
      stats: [
        {
          label: `Net Present Value (${currSymbol})`,
          value: formatValue(apiData?.financials?.npv, 2, selectedCurrency),
        },
        {
          label: "Internal Rate of Return (%)",
          value: formatPercent(apiData?.financials?.irr, 2),
        },
        {
          label: "Payback Period (years)",
          value: apiData?.financials?.paybackPeriod ? apiData.financials.paybackPeriod.toFixed(0) : "N/A",
        },
      ],
    },
    production: {
      title: "Production Metrics",
      color: "#17c671",
      stats: [
        {
          label: "Feedstock Consumption (tons/year)",
          value: formatNumber(apiData?.technoEconomics?.feedstock_consumption, 2),
        },
        {
          label: "Product Output (tons/year)",
          value: formatNumber(apiData?.technoEconomics?.production, 2),
        },
      ],
    },
    cost: {
      title: "Cost Metrics",
      color: "#c4183c",
      stats: [
        {
          label: `Total Capital Investment (${currSymbol})`,
          value: formatValue(apiData?.technoEconomics?.total_capital_investment, 2, selectedCurrency),
        },
        {
          label: `Total OPEX (${currSymbol}/year)`,
          value: formatValue(apiData?.technoEconomics?.total_opex, 2, selectedCurrency),
        },
        {
          label: `Total Indirect OPEX (${currSymbol}/year)`,
          value: formatValue(apiData?.technoEconomics?.total_indirect_opex, 2, selectedCurrency),
        },
        {
          label: `Feedstock Cost (${currSymbol}/year)`,
          value: formatValue(apiData?.technoEconomics?.feedstock_cost, 2, selectedCurrency),
        },
        {
          label: `Levelized Cost of Production (${currSymbol}/ton)`,
          value: formatValue(apiData?.technoEconomics?.LCOP, 2, selectedCurrency),
        },
      ],
    },
    environmental: {
      title: "Environmental Metrics",
      color: "#00b8d8",
      stats: [
        {
          label: "Carbon Intensity (kgCO₂/MJ)",
          value: formatNumber(apiData?.technoEconomics?.carbon_intensity, 2),
        },
        {
          label: "Carbon Conversion Efficiency (%)",
          value: formatNumber(apiData?.technoEconomics?.carbon_conversion_efficiency_percent, 2),
        },
        {
          label: "Total CO₂ Emission (kg/year)",
          value: formatNumber(apiData?.technoEconomics?.total_co2_emissions, 2),
        },
      ],
    },
  }; */

  const toFiniteNumber = (val) => (typeof val === "number" && Number.isFinite(val) ? val : null);
  const rawTotalCO2 = toFiniteNumber(apiData?.technoEconomics?.total_co2_emissions);
  const totalCO2Tonnes = rawTotalCO2 !== null ? rawTotalCO2 / 1_000_000 : null;
  const hydrogenCost = toFiniteNumber(apiData?.technoEconomics?.hydrogen_cost);
  const electricityCost = toFiniteNumber(apiData?.technoEconomics?.electricity_cost);
  const utilityCost =
    hydrogenCost === null && electricityCost === null
      ? null
      : (hydrogenCost ?? 0) + (electricityCost ?? 0);
  const totalDirectOpex = toFiniteNumber(apiData?.technoEconomics?.total_direct_opex);
  const annualCapacity = inputs?.production_capacity || 0;
  const safeCapacity = annualCapacity > 0 ? annualCapacity : null;
  const lcopValue = toFiniteNumber(apiData?.technoEconomics?.lcop ?? apiData?.technoEconomics?.LCOP);
  const totalCapitalInvestment = toFiniteNumber(apiData?.technoEconomics?.total_capital_investment);
  const feedstockCostValue = toFiniteNumber(apiData?.technoEconomics?.feedstock_cost);
  const totalIndirectOpexValue = toFiniteNumber(apiData?.technoEconomics?.total_indirect_opex);
  const totalOpexValue = toFiniteNumber(apiData?.technoEconomics?.total_opex);
  const lcopCapital = safeCapacity && totalCapitalInvestment !== null ? totalCapitalInvestment / safeCapacity : null;
  const lcopFeedstock = safeCapacity && feedstockCostValue !== null ? feedstockCostValue / safeCapacity : null;
  const lcopUtility = safeCapacity && utilityCost !== null ? utilityCost / safeCapacity : null;
  const lcopHydrogen = safeCapacity && hydrogenCost !== null ? hydrogenCost / safeCapacity : null;
  const lcopElectricity = safeCapacity && electricityCost !== null ? electricityCost / safeCapacity : null;
  const lcopIndirect = safeCapacity && totalIndirectOpexValue !== null ? totalIndirectOpexValue / safeCapacity : null;
  // LCOP breakdown percentages (share of total LCOP)
  const lcopPct = (part) => (lcopValue && part !== null ? part / lcopValue : null);
  const lcopPctCapital = lcopPct(lcopCapital);
  const lcopPctFeedstock = lcopPct(lcopFeedstock);
  const lcopPctHydrogen = lcopPct(lcopHydrogen);
  const lcopPctElectricity = lcopPct(lcopElectricity);
  const lcopPctIndirect = lcopPct(lcopIndirect);
  const lccaValue = toFiniteNumber(apiData?.technoEconomics?.lcca ?? apiData?.financials?.lcca);
  const productionOutput = toFiniteNumber(apiData?.technoEconomics?.production);
  const carbonIntensityPerProduct =
    rawTotalCO2 !== null && productionOutput
      ? (rawTotalCO2 / 1000) / productionOutput
      : toFiniteNumber(apiData?.technoEconomics?.carbon_intensity);
  const consumptionCards = [];
  const feedstockConsumption = toFiniteNumber(apiData?.technoEconomics?.feedstock_consumption);
  const hydrogenConsumption = toFiniteNumber(apiData?.technoEconomics?.hydrogen_consumption);
  const electricityConsumption = toFiniteNumber(apiData?.technoEconomics?.electricity_consumption);

  if (feedstockConsumption !== null) {
    consumptionCards.push({
      key: "feedstock",
      label: "Feedstock",
      value: formatNumber(feedstockConsumption, 2),
      unit: "tons/yr",
    });
  }
  if (hydrogenConsumption !== null) {
    consumptionCards.push({
      key: "hydrogen",
      label: "Hydrogen",
      value: formatNumber(hydrogenConsumption, 2),
      unit: "kg/yr",
    });
  }
  if (electricityConsumption !== null) {
    consumptionCards.push({
      key: "electricity",
      label: "Electricity",
      value: formatNumber(electricityConsumption, 2),
      unit: "kWh/yr",
    });
  }

  // Build per-product output details for KPI cards
  const productOutputDetails = (apiData?.technoEconomics?.products || []).map((p) => ({
    label: `${p.name}`,
    value: `${formatNumber(p.amount_of_product, 2)} t/yr`,
  }));

  const kpiGroups = {
    processOutputs: {
      title: "Process Outputs",
      color: "#115e59",
      stats: [
        {
          label: "Total Consumption",
          type: "consumptionCards",
          cards: consumptionCards,
        },
        {
          label: "Product Outputs",
          value: formatNumber(productionOutput, 2),
          details: productOutputDetails,
        },
        {
          label: "Carbon Intensity (kg CO2e per unit)",
          value: formatNumber(carbonIntensityPerProduct, 3),
        },
        {
          label: "Carbon Conversion Efficiency (%)",
          value: formatNumber(apiData?.technoEconomics?.carbon_conversion_efficiency_percent, 2),
        },
        {
          label: "Total CO2 Emissions (tons/year)",
          value: formatNumber(totalCO2Tonnes, 2),
        },
      ],
    },
    economicOutputs: {
      title: "Economic Outputs",
      color: "#92400e",
      stats: [
        {
          label: 'Total Capital Investment',
          value: formatValue(totalCapitalInvestment, 2, selectedCurrency),
        },
        {
          label: 'Total direct OPEX',
          value: formatValue(totalDirectOpex, 2, selectedCurrency),
          details: [
            { label: 'Cost of Feedstocks', value: formatValue(feedstockCostValue, 2, selectedCurrency) },
            { label: 'Cost of Hydrogen', value: formatValue(hydrogenCost, 2, selectedCurrency) },
            { label: 'Cost of Electricity', value: formatValue(electricityCost, 2, selectedCurrency) },
          ],
        },
        {
          label: 'Total Indirect OPEX',
          value: formatValue(totalIndirectOpexValue, 2, selectedCurrency),
        },
        {
          label: 'Total OPEX',
          value: formatValue(totalOpexValue, 2, selectedCurrency),
        },
        {
          label: 'Levelized Cost Of Production',
          value: formatValue(lcopValue, 2, selectedCurrency),
          details: [
            { label: 'TCI', value: lcopPctCapital !== null ? `${formatPercent(lcopPctCapital, 2)}%` : 'N/A' },
            { label: 'Cost of Feedstocks', value: lcopPctFeedstock !== null ? `${formatPercent(lcopPctFeedstock, 2)}%` : 'N/A' },
            { label: 'Cost of Hydrogen', value: lcopPctHydrogen !== null ? `${formatPercent(lcopPctHydrogen, 2)}%` : 'N/A' },
            { label: 'Cost of Electricity', value: lcopPctElectricity !== null ? `${formatPercent(lcopPctElectricity, 2)}%` : 'N/A' },
            { label: 'Cost of Indirect OPEX', value: lcopPctIndirect !== null ? `${formatPercent(lcopPctIndirect, 2)}%` : 'N/A' },
          ],
        },
        {
          label: 'Levelized Cost Of Carbon Abatement',
          value: formatValue(lccaValue, 2, selectedCurrency),
        },
        {
          label: 'Net present value',
          value: formatValue(apiData?.financials?.npv, 2, selectedCurrency),
        },
        {
          label: 'Internal rate of return',
          value: formatPercent(apiData?.financials?.irr, 2),
        },
        {
          label: 'Payback period',
          value: apiData?.financials?.paybackPeriod ? apiData.financials.paybackPeriod.toFixed(1) : 'N/A',
        },
      ],
    },
  };

  return (
    <Container fluid className="main-content-container px-2">
      {/* Main Layout */}
      {/* Tighten gap between scenario inputs (left) and chart (right) */}
      <div style={{ display: "flex", flexDirection: "row", gap: "12px", width: "100%", height: "calc(100vh - 100px)" }}>
        {/* Left Form - always show but with different width */}
        <div
          style={{
            width: isLeftPanelCollapsed ? "50px" : "25%",
            minWidth: isLeftPanelCollapsed ? "50px" : "25%",
            maxWidth: isLeftPanelCollapsed ? "50px" : "25%",
            height: "100%",
            position: "relative",
            transition: "all 0.3s ease"
          }}
        >
          {/* Toggle Button - always visible */}
          <div style={{ position: "absolute", right: isLeftPanelCollapsed ? "7px" : "12px", top: "10px", zIndex: 10, width: "36px", height: "36px" }}>
            <button
              onClick={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
              style={{
                background: colors.oxfordBlue,
                border: "none",
                color: "white",
                cursor: "pointer",
                fontSize: "1.2rem",
                padding: "0.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "4px",
                width: "100%",
                height: "100%",
                transition: "all 0.2s ease",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#0a2454";
                e.currentTarget.style.transform = "scale(1.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colors.oxfordBlue;
                e.currentTarget.style.transform = "scale(1)";
              }}
              title={isLeftPanelCollapsed ? "Show Input Panel" : "Hide Input Panel"}
            >
              {isLeftPanelCollapsed ? "►" : "◄"}
            </button>
          </div>

          {/* Form - only show when not collapsed */}
          {!isLeftPanelCollapsed && (
            <BiofuelForm
              inputs={inputs}
              selectedProcess={selectedProcess}
              selectedFeedstock={selectedFeedstock}
              handleSliderChange={handleSliderChange}
              handleInputChange={handleInputChange}
              handleProductSliderChange={handleProductSliderChange}
              handleProductInputChange={handleProductInputChange}
              onAddProduct={addProduct}
              onRemoveProduct={removeProduct}
              onProcessChange={setSelectedProcess}
              onFeedstockChange={setSelectedFeedstock}
              onCalculate={calculateOutputs}
              onReset={handleReset}
              onSave={handleSave}
              isCalculating={isCalculating}
            />
          )}
        </div>

        {/* Chart area - expands when sidebar collapses */}
        <div className="d-flex flex-column" style={{ flex: 1, height: "100%", transition: "all 0.3s ease", minWidth: 0 }}>
              <Card small className="flex-fill d-flex flex-column">
                <CardHeader className="border-bottom d-flex justify-content-between align-items-center p-2">
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <h6 className="m-0" style={{ fontSize: "0.85rem", fontWeight: "600" }}>Breakeven Analysis</h6>
                    <small style={{ fontSize: '0.7rem', color: colors.textSecondary }}>
                      Cumulative discounted cash flow across project lifetime; breakeven occurs
                      where the curve first crosses zero.
                    </small>
                  </div>
                  <Button
                    size="sm"
                    className="table-icon-btn"
                    style={{
                      backgroundColor: colors.oxfordBlue,
                      borderColor: colors.oxfordBlue,
                      color: "#fff",
                      padding: "0.25rem 0.5rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.2s ease",
                      position: "relative"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#0a2454";
                      e.currentTarget.style.borderColor = "#0a2454";
                      e.currentTarget.style.transform = "scale(1.1)";
                      e.currentTarget.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = colors.oxfordBlue;
                      e.currentTarget.style.borderColor = colors.oxfordBlue;
                      e.currentTarget.style.transform = "scale(1)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                    onClick={() => setOpenTable(true)}
                    title="Cash Flow Table"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      style={{ display: "block" }}
                    >
                      <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm15 2h-4v3h4V4zm0 4h-4v3h4V8zm0 4h-4v3h3a1 1 0 0 0 1-1v-2zm-5 3v-3H6v3h4zm-5 0v-3H1v2a1 1 0 0 0 1 1h3zm-4-4h4V8H1v3zm0-4h4V4H1v3zm5-3v3h4V4H6zm4 4H6v3h4V8z"/>
                    </svg>
                  </Button>
                </CardHeader>
                <CardBody className="flex-fill" style={{ padding: "10px", minHeight: 0 }}>
                  <BreakevenBarChart data={chartData} />
                </CardBody>
              </Card>
        </div>

        {/* KPI Cards - narrower width, stays in place */}
        <div style={{ width: "250px", minWidth: "250px", maxWidth: "250px", height: "100%" }}>
          <div style={{ height: "100%", overflowY: "auto", overflowX: "hidden" }}>
            {/* KPI Cards Grid - Grouped by Context with Collapsible Sections */}
            {Object.entries(kpiGroups).map(([groupKey, group]) => (
                  <div key={groupKey} className="mb-2">
                    {/* Section Header - Clickable to expand/collapse */}
                    <div
                      onClick={() => toggleGroup(groupKey)}
                      style={{
                        backgroundColor: colors.cardBackground,
                        padding: "8px 12px",
                        borderRadius: "4px",
                        border: "none",
                        marginBottom: expandedGroups[groupKey] ? "8px" : "0",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        transition: "all 0.2s ease"
                      }}
                    >
                      <h6 className="m-0" style={{ fontSize: "0.85rem", fontWeight: "600" }}>
                        {group.title}
                      </h6>
                      <span style={{ fontSize: "1rem", fontWeight: "bold" }}>
                        {expandedGroups[groupKey] ? "−" : "+"}
                      </span>
                    </div>

                    {/* Cards in this group - Only show when expanded */}
                    {expandedGroups[groupKey] && (
                      <div>
                        {group.stats.map((stat, idx) => {
                          const detailKey = `${groupKey}:${stat.label}`;
                          const hasDetails = Array.isArray(stat.details) && stat.details.length > 0;
                          const isDetailOpen = hasDetails && expandedStatDetails[detailKey];
                          const isConsumptionCards = stat.type === "consumptionCards";
                          return (
                            <Card small className="mb-2" key={idx}>
                              <CardHeader
                                className="border-bottom p-2 d-flex justify-content-between align-items-center"
                                style={{
                                  borderLeft: "none"
                                }}
                              >
                                <h6 className="m-0" style={{ fontSize: "0.7rem", fontWeight: "600", lineHeight: "1.2" }}>
                                  {stat.label}
                                </h6>
                                {hasDetails && (
                                  <Button
                                    size="sm"
                                    theme="light"
                                    style={{ fontSize: "0.65rem", padding: "2px 6px" }}
                                    onClick={() => toggleStatDetail(detailKey)}
                                  >
                                    {isDetailOpen ? "Hide" : "View"}
                                  </Button>
                                )}
                              </CardHeader>
                                <CardBody className="p-2">
                                  {isConsumptionCards ? (
                                    stat.cards && stat.cards.length ? (
                                      <div
                                        style={{
                                          display: "flex",
                                          gap: "6px",
                                        }}
                                      >
                                        {stat.cards.map((card) => (
                                          <div
                                            key={card.key || card.label}
                                            style={{
                                              flex: 1,
                                              backgroundColor: colors.background,
                                              borderRadius: "6px",
                                              padding: "6px 8px",
                                              textAlign: "center",
                                              border: "none",
                                            }}
                                          >
                                            <div style={{ fontSize: "0.65rem", fontWeight: 600, color: "#475569" }}>
                                              {card.label}
                                            </div>
                                            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1f2937" }}>
                                              {card.value ?? "N/A"}
                                            </div>
                                            <div style={{ fontSize: "0.65rem", color: "#6b7280" }}>{card.unit}</div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div
                                        style={{
                                          fontSize: "0.85rem",
                                          fontWeight: 600,
                                          color: "#6b7280",
                                          textAlign: "center",
                                        }}
                                      >
                                        N/A
                                      </div>
                                    )
                                  ) : (
                                    <>
                                  <div
                                    className="d-flex align-items-center"
                                    style={{
                                      fontSize: hasResults ? "1.1rem" : "0.85rem",
                                      fontWeight: hasResults ? "700" : "600",
                                      color: "#1f2937",
                                      justifyContent: hasResults || stat.value === 'N/A' ? 'center' : 'space-between'
                                    }}
                                  >
                                    <span>{stat.value}</span>
                                  </div>
                                      {hasDetails && isDetailOpen && (
                                        <div style={{ marginTop: "6px" }}>
                                          {stat.details.map((detail, dIdx) => {
                                            const isNA = detail.value === 'N/A';
                                            return (
                                              <div
                                                key={dIdx}
                                                style={{
                                                  display: 'flex',
                                                  justifyContent: isNA ? 'center' : 'space-between',
                                                  fontSize: '0.75rem',
                                                  fontWeight: 500,
                                                  color: '#4b5563',
                                                  padding: '2px 0'
                                                }}
                                              >
                                                {isNA ? (
                                                  <span>N/A</span>
                                                ) : (
                                                  <>
                                                    <span>{detail.label}</span>
                                                    <span>{detail.value}</span>
                                                  </>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </>
                                  )}
                                </CardBody>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cash Flow Modal */}
      <Modal open={openTable} toggle={() => setOpenTable(!openTable)} size="lg">
        <ModalBody>
          <CashFlowTable tableData={table} />
        </ModalBody>
      </Modal>
    </Container>
  );
};

export default AnalysisDashboard;
