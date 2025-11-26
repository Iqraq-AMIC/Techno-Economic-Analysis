// src/views/AnalysisDashboard.js

import React, { useState, useEffect } from "react";
import {
  Container,
  Card,
  CardBody,
  CardHeader,
  Button,
  Modal,
  ModalBody,
} from "shards-react";
import BreakevenBarChart from "../components/charts/BreakevenBarChart";
import BiofuelForm from "../forms/BiofuelForm";
import CashFlowTable from "../forms/CashFlowTable";
import { useTheme } from "../contexts/ThemeContext";
import { useAccess } from "../contexts/AccessContext";
import { useProject } from "../contexts/ProjectContext";
import ProjectStartupModal from "../components/project/ProjectStartupModal";
import { getScenario, calculateScenario } from "../api/projectApi";
import { mapUiStateToBackend, mapBackendToUiState } from "../utils/payloadMapper";

const buildChartData = (tableData = []) => {
  if (!tableData || tableData.length === 0) return [];

  let cumulative = 0;
  return tableData.map((row, i) => {
    // Handle both old and new data structures
    const cashFlow = row.after_tax_cash_flow || row.netCashFlow || 0;
    cumulative += cashFlow;

    return {
      Year: row.year || row.Year || i,
      "Cumulative DCF (USD)": cumulative,
    };
  });
};

const AnalysisDashboard = ({ selectedCurrency = "USD" }) => {
  const { colors } = useTheme();
  const { selectedAccess } = useAccess();
  const {
    currentProject,
    currentScenario,
    updateCurrentScenario,
    scenarios,
    comparisonScenarios,
    loadMasterData,
    masterData
  } = useProject();

  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);

  // Use ref to access latest table value without triggering re-renders
  const tableRef = React.useRef(null);

  // Show project modal if no project is selected
  useEffect(() => {
    console.log("📊 AnalysisDashboard mounted");
    console.log("📊 currentProject:", currentProject);
    console.log("📊 showProjectModal:", showProjectModal);

    if (!currentProject) {
      console.log("🎭 No project selected, showing modal");
      setShowProjectModal(true);
    } else {
      console.log("✅ Project already selected:", currentProject);
      // Load master data if not already loaded
      if (!masterData) {
        loadMasterData();
      }
    }
  }, [currentProject, masterData, loadMasterData]);

  useEffect(() => {
    console.log("🎭 showProjectModal changed to:", showProjectModal);
  }, [showProjectModal]);

  // Load inputs and outputs from current scenario when it changes
  useEffect(() => {
    if (currentScenario) {
      console.log("🔄 Hydrating Dashboard from Scenario:", currentScenario.scenarioName);

      // 1. Hydrate Dropdowns (Process/Feedstock)
      if (currentScenario.process?.name) {
        setSelectedProcess(currentScenario.process.name);
      }
      if (currentScenario.feedstock?.name) {
        setSelectedFeedstock(currentScenario.feedstock.name);
      }

      // 2. Hydrate Form Inputs
      // We use the mapper to convert Backend Nested JSON -> Frontend Flat State
      if (currentScenario.userInputs) {
        console.log("📥 Found saved inputs, mapping to form...");
        const mappedInputs = mapBackendToUiState(currentScenario.userInputs);

        if (mappedInputs) {
          // Update the form state with the saved values
          setInputs(prev => ({
            ...prev,
            ...mappedInputs
          }));
        }
      }

      // 3. Hydrate Charts & Tables (Outputs)
      // Since you Auto-Calculated on creation, these should exist!
      if (currentScenario.technoEconomics && currentScenario.financialAnalysis) {
        console.log("📈 Found saved calculation results, updating charts...");

        const results = {
          technoEconomics: currentScenario.technoEconomics,
          financials: currentScenario.financialAnalysis,
          resolvedInputs: currentScenario.userInputs // or whatever structure needed
        };

        setApiData(results);

        // Regenerate Chart Data
        const mockCashFlowData = generateMockCashFlowData(results);
        setTable(mockCashFlowData);
        setChartData(buildChartData(mockCashFlowData));
      }
    }
  }, [currentScenario]);

  const [inputs, setInputs] = useState({
    production_capacity: 500,
    plant_capacity_unit: "kta",
    average_liquid_density: 820,
    average_liquid_density_unit: "kg/m3",
    annual_load_hours: 8000,
    conversion_process_ci_default: 45,
    feedstock_price: 250,
    feedstock_price_unit: "USD/t",
    feedstock_carbon_intensity: 50,
    feedstock_ci_unit: "gCO2/kg",
    feedstock_energy_content: 18,
    feedstock_energy_unit: "MJ/kg",
    feedstock_yield: 1.5,
    feedstock_yield_unit: "kg/kg",
    feedstock_carbon_content: 0.5,
    // ✅ NEW: HYDROGEN PARAMETERS
    hydrogen_price: 2.5,
    hydrogen_price_unit: "USD/kg",
    hydrogen_yield: 0.042,
    hydrogen_yield_unit: "kg/kg",
    hydrogen_carbon_intensity: 0,
    hydrogen_ci_unit: "gCO2/kg",
    hydrogen_energy_content: 120, // Default LHV for Hydrogen
    hydrogen_carbon_content: 0,   // Pure H2 has 0 carbon

    // ✅ NEW: ELECTRICITY PARAMETERS
    electricity_rate: 0.12,
    electricity_rate_unit: "USD/kWh",
    electricity_yield: 0.12,
    electricity_yield_unit: "kWh/kg",
    electricity_carbon_intensity: 0,
    electricity_ci_unit: "gCO2/kWh",
    electricity_energy_content: 0, // Electricity has no mass-based energy content usually
    electricity_carbon_content: 0,
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
        density: 820,
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
        density: 830,
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
        density: 750,
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
  const [table, setTable] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [comparisonChartData, setComparisonChartData] = useState([]);
  const [openTable, setOpenTable] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [expandedStatDetails, setExpandedStatDetails] = useState({});
  const [maximizedKPI, setMaximizedKPI] = useState('processOutputs');

  // Update ref when table changes (after table is declared)
  useEffect(() => {
    tableRef.current = table;
  }, [table]);

  useEffect(() => {
    console.log("📊 AnalysisDashboard mounted - Loading master data");

    const loadData = async () => {
      if (!masterData) {
        console.log("🔄 Master data not loaded, fetching...");
        await loadMasterData();
      } else {
        console.log("✅ Master data already loaded");
      }
    };

    loadData();
  }, [loadMasterData, masterData]);

  const currentScenarioId = currentScenario?.id;

  // Fetch comparison data when scenarios are selected for comparison
  useEffect(() => {
    const fetchComparisonData = async () => {
      if (!comparisonScenarios || comparisonScenarios.length === 0) {
        setComparisonChartData([]);
        return;
      }

      console.log("📊 Fetching comparison data for:", comparisonScenarios);

      try {
        const comparisonData = await Promise.all(
          comparisonScenarios.map(async (scenarioId) => {
            // 1. Try to get it from the local state list first
            let scenario = scenarios.find(s => s.id === scenarioId);

            // Helper to safely access properties (handles snake_case vs camelCase)
            const getProp = (obj, snake, camel) => obj?.[snake] || obj?.[camel];

            let techno = getProp(scenario, 'techno_economics', 'technoEconomics');
            let financials = getProp(scenario, 'financial_analysis', 'financialAnalysis');

            // 2. If missing, FETCH full details from API
            if (!techno || !financials) {
              console.log(`🔄 Data missing for ${scenarioId}, fetching full details...`);
              const apiResult = await getScenario(scenarioId);
              if (apiResult.success) {
                scenario = apiResult.data;
                techno = scenario.technoEconomics; // API returns camelCase
                financials = scenario.financialAnalysis;
              } else {
                console.error(`❌ Failed to fetch details for ${scenarioId}`);
                return null;
              }
            }

            const scenarioName = scenario.scenarioName || scenario.scenario_name || "Unknown Scenario";

            // 3. Extract Cash Flow Table
            let cashFlowData = null;

            if (financials) {
              // Check for new structure (cashFlowTable) or old structure (cash_flow_schedule)
              // OR the raw snake_case from backend (cash_flow_schedule)
              const table = financials.cashFlowTable || financials.cash_flow_schedule;
              if (Array.isArray(table) && table.length > 0) {
                cashFlowData = table;
              }
            }

            // 4. Fallback: If this is the CURRENT scenario, use the live tableRef
            if (!cashFlowData && scenarioId === currentScenario?.id && tableRef.current?.length > 0) {
              console.log(`✅ Using live table for Current Scenario: ${scenarioName}`);
              cashFlowData = tableRef.current;
            }

            if (!cashFlowData) {
              console.warn(`⚠️ No cash flow data available for ${scenarioName}`);
              return null;
            }

            return {
              name: scenarioName,
              data: cashFlowData,
            };
          })
        );

        // Filter out nulls (failed fetches)
        const validComparisons = comparisonData.filter(d => d !== null);
        setComparisonChartData(validComparisons);

      } catch (error) {
        console.error("Error fetching comparison data:", error);
        setComparisonChartData([]);
      }
    };

    fetchComparisonData();
  }, [comparisonScenarios, scenarios, currentScenarioId]);

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
          density: "",
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
      production_capacity: 0,
      plant_capacity_unit: "t/yr",
      average_liquid_density: 0,
      average_liquid_density_unit: "kg/m3",
      annual_load_hours: 0,
      conversion_process_ci_default: 0,
      feedstock_price: 0,
      feedstock_price_unit: "USD/t",
      hydrogen_price: 0,
      hydrogen_price_unit: "USD/kg",
      electricity_rate: 0,
      electricity_rate_unit: "USD/kWh",
      feedstock_carbon_intensity: 0,
      feedstock_ci_unit: "gCO2/kg",
      feedstock_energy_content: 0,
      feedstock_energy_unit: "MJ/kg",
      feedstock_yield: 0,
      feedstock_yield_unit: "kg/kg",
      hydrogen_yield: 0,
      hydrogen_yield_unit: "kg/kg",
      electricity_yield: 0,
      electricity_yield_unit: "kWh/kg",
      hydrogen_carbon_intensity: 0,
      hydrogen_ci_unit: "gCO2/kg",
      electricity_carbon_intensity: 0,
      electricity_ci_unit: "gCO2/kWh",
      feedstock_carbon_content: 0,
      plant_lifetime: 0,
      discount_factor: 0,
      land_cost: 0,
      tci_ref: 0,
      tci_ref_unit: "USD",
      capacity_ref: 0,
      capacity_ref_unit: "t/yr",
      tci_scaling_exponent: 0,
      wc_to_tci_ratio: 0,
      indirect_opex_to_tci_ratio: 0,
      products: [
        {
          name: "Product 1",
          price: 0,
          priceUnit: "USD/t",
          priceSensitivity: 0,
          priceSensitivityUnit: "USD/gCO2",
          carbonContent: 0,
          energyContent: 0,
          energyUnit: "MJ/kg",
          density: "",
          yield: 0,
          yieldUnit: "kg/kg",
          massFraction: 0,
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

  
  
  // Add this function to generate mock cash flow data
  const generateMockCashFlowData = (calculationResults) => {

    const financials = calculationResults.financials;

    // 1. Check if Backend provided the real schedule (New Flow)
    if (financials && financials.cashFlowTable && Array.isArray(financials.cashFlowTable)) {
      console.log("✅ Using Backend Cash Flow Data");
      return financials.cashFlowTable; // Use real data directly
    }

    // Fallback for old data structure
    if (financials && financials.cash_flow_schedule && Array.isArray(financials.cash_flow_schedule)) {
      console.log("✅ Using Backend Cash Flow Schedule");
      return financials.cash_flow_schedule;
    }

    console.warn("⚠️ No cash flow table found in backend response, using fallback generator");

    const techno = calculationResults.techno_economics;

    if (!techno || !financials) return [];

    const tci = techno.total_capital_investment * 1000000; // Convert to USD
    const annualRevenue = techno.total_opex * 1.2; // Estimate revenue as 20% more than OPEX
    const projectLifetime = 20; // Default lifetime

    const cashFlowTable = [];

    // Year 0: Initial investment
    cashFlowTable.push({
      year: 0,
      after_tax_cash_flow: -tci,
      netCashFlow: -tci
    });

    // Subsequent years
    for (let year = 1; year <= projectLifetime; year++) {
      const cashFlow = year <= financials.payback_period
        ? annualRevenue * (year / financials.payback_period) // Ramp up to payback
        : annualRevenue;

      cashFlowTable.push({
        year: year,
        after_tax_cash_flow: cashFlow,
        netCashFlow: cashFlow
      });
    }

    console.log("💰 Generated mock cash flow data:", cashFlowTable);
    return cashFlowTable;
  };

  const calculateOutputs = async () => {
    // ... (validation checks remain the same) ...

    setIsCalculating(true);
    try {
      console.log("🚀 Preparing calculation payload...");

      // 1. Map UI state to Backend format
      const formattedInputs = mapUiStateToBackend(
        inputs,
        selectedProcess,
        selectedFeedstock,
        inputs.selectedCountry || "USA"
      );

      console.log("📤 Sending inputs to backend:", formattedInputs);

      // 2. Trigger Calculation (Pass formattedInputs to the API)
      // 🚨 FIX: Pass formattedInputs as the second argument
      const result = await calculateScenario(currentScenario.id, formattedInputs);

      if (result.success) {
        const calculationResults = {
          technoEconomics: result.data.technoEconomics,
          financials: result.data.financials,
          resolvedInputs: result.data.resolvedInputs
        };

        setApiData(calculationResults);

        // Generate charts
        const mockCashFlowData = generateMockCashFlowData(calculationResults);
        setTable(mockCashFlowData);
        setChartData(buildChartData(mockCashFlowData));

        // 3. Update local scenario state so the dashboard stays consistent
        // (You don't strictly need to call updateCurrentScenario here because the 
        // backend calculate endpoint already saved the inputs to the DB, 
        // but updating the context ensures the UI is in sync)
        if (updateCurrentScenario) {
          // We can just refetch the scenario to be 100% sure we are synced
          // or just rely on the result.data 
        }

      } else {
        console.error("❌ Backend Calculation Error:", result.error);
        // Show the specific validation error from Pydantic if available
        const errorMsg = typeof result.error === 'object' ? JSON.stringify(result.error) : result.error;
        alert(`Calculation Failed: ${errorMsg}`);
      }
    } catch (error) {
      console.error("❌ Process Error:", error);
      alert(`Error: ${error.message}`);
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

  const toFiniteNumber = (val) => (typeof val === "number" && Number.isFinite(val) ? val : null);

  // 1. DEFINE HELPERS FOR NESTED DATA
  const te = apiData?.technoEconomics || {};
  const breakdown = te.opex_breakdown || {};
  const consumption = te.utility_consumption || {};

  // 2. READ BASIC METRICS
  const rawTotalCO2 = toFiniteNumber(te.total_co2_emissions);
  const totalCO2Tonnes = rawTotalCO2 !== null ? rawTotalCO2 / 1_000_000 : null;
  const annualCapacity = toFiniteNumber(te.production) || inputs?.production_capacity || 0;
  const safeCapacity = annualCapacity > 0 ? annualCapacity : null;


  // 3. FIX: READ COSTS FROM 'opex_breakdown'
  const hydrogenCost = toFiniteNumber(breakdown.hydrogen); 
  const electricityCost = toFiniteNumber(breakdown.electricity);
  const feedstockCostValue = toFiniteNumber(breakdown.feedstock);
  const totalIndirectOpexValue = toFiniteNumber(breakdown.indirect_opex);
  const utilityCost =
    hydrogenCost === null && electricityCost === null
      ? null
      : (hydrogenCost ?? 0) + (electricityCost ?? 0);

  // 4. FIX: CALCULATE DIRECT OPEX (It is not in the JSON, so we sum it up)
  const totalDirectOpex = toFiniteNumber(te.total_direct_opex) 
    ?? ((feedstockCostValue || 0) + (hydrogenCost || 0) + (electricityCost || 0));

  const totalOpexValue = toFiniteNumber(te.total_opex);
  const totalCapitalInvestment = toFiniteNumber(te.total_capital_investment);
  const lcopValue = toFiniteNumber(te.lcop ?? te.LCOP);

  // 5. FIX: READ CONSUMPTION FROM 'utility_consumption'
  const feedstockConsumption = toFiniteNumber(te.feedstock_consumption);
  const hydrogenConsumption = toFiniteNumber(consumption.hydrogen); 
  const electricityConsumption = toFiniteNumber(consumption.electricity);

  // Calculate annualized capital using Capital Recovery Factor (CRF)
  const discountRate = inputs?.discount_factor || 0.07;
  const plantLifetime = inputs?.plant_lifetime || 20;
  const crf = discountRate > 0
    ? (discountRate * Math.pow(1 + discountRate, plantLifetime)) / (Math.pow(1 + discountRate, plantLifetime) - 1)
    : 1 / plantLifetime;
  const annualizedCapital = totalCapitalInvestment !== null ? totalCapitalInvestment * crf : null;

  const lcopCapital = safeCapacity && annualizedCapital !== null ? annualizedCapital / safeCapacity : null;
  const lcopFeedstock = safeCapacity && feedstockCostValue !== null ? feedstockCostValue / safeCapacity : null;
  const lcopHydrogen = safeCapacity && hydrogenCost !== null ? hydrogenCost / safeCapacity : null;
  const lcopElectricity = safeCapacity && electricityCost !== null ? electricityCost / safeCapacity : null;
  const lcopIndirect = safeCapacity && totalIndirectOpexValue !== null ? totalIndirectOpexValue / safeCapacity : null;
  // LCOP breakdown percentages (share of total LCOP)
  // Calculate individual components
  const lcopComponents = [lcopCapital, lcopFeedstock, lcopHydrogen, lcopElectricity, lcopIndirect].filter(v => v !== null);
  const lcopComponentsSum = lcopComponents.reduce((sum, val) => sum + val, 0);

  // Normalize percentages to ensure they sum to exactly 100%
  const lcopPct = (part) => {
    if (part === null || !lcopComponentsSum) return null;
    return part / lcopComponentsSum; // Use component sum instead of total LCOP to ensure 100%
  };

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

  const productCarbonEfficiencyDetails = (apiData?.technoEconomics?.products || []).map((p) => ({
    label: p.name || "Product",
    value: `${formatNumber(p.carbon_conversion_efficiency_percent ?? p.carbon_conversion_efficiency ?? 0, 2)}%`,
  }));

  // Helper function to check if a stat should be visible based on access level
  const isStatVisible = (statLabel) => {
    // For Economic Outputs
    if (statLabel.includes("Payback period")) {
      return selectedAccess === "CORE" || selectedAccess === "ADVANCE" || selectedAccess === "ROADSHOW";
    }
    if (statLabel.includes("OPEX") || statLabel.includes("Internal rate of return")) {
      return selectedAccess === "ADVANCE" || selectedAccess === "ROADSHOW";
    }
    if (statLabel.includes("Net present value") || statLabel.includes("Levelized Cost")) {
      return selectedAccess === "ROADSHOW";
    }

    // For Process Outputs - all visible in ROADSHOW, specific ones in other levels
    if (selectedAccess === "ROADSHOW") {
      return true; // All features visible in ROADSHOW
    }

    // Default: show the stat
    return true;
  };

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
          label: "Product Outputs (t/yr)",
          value: formatNumber(productionOutput, 2),
          details: productOutputDetails,
        },
        {
          label: "Carbon Intensity (kg CO2e/t product)",
          value: formatNumber(carbonIntensityPerProduct, 3),
        },
        {
          label: "Carbon Conversion Efficiency (%)",
          value: formatNumber(
            apiData?.technoEconomics?.carbon_conversion_efficiency_percent ??
            apiData?.technoEconomics?.carbon_conversion_efficiency,
            2
          ),
          details: productCarbonEfficiencyDetails,
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
          label: `Total Capital Investment (${currSymbol})`,
          value: formatValue(totalCapitalInvestment, 2, selectedCurrency),
        },
        {
          label: `Total direct OPEX (${currSymbol}/yr)`,
          value: formatValue(totalDirectOpex, 2, selectedCurrency),
          details: [
            { label: `Cost of Feedstocks (${currSymbol}/yr)`, value: formatValue(feedstockCostValue, 2, selectedCurrency) },
            { label: `Cost of Hydrogen (${currSymbol}/yr)`, value: formatValue(hydrogenCost, 2, selectedCurrency) },
            { label: `Cost of Electricity (${currSymbol}/yr)`, value: formatValue(electricityCost, 2, selectedCurrency) },
          ],
        },
        {
          label: `Total Indirect OPEX (${currSymbol}/yr)`,
          value: formatValue(totalIndirectOpexValue, 2, selectedCurrency),
        },
        {
          label: `Total OPEX (${currSymbol}/yr)`,
          value: formatValue(totalOpexValue, 2, selectedCurrency),
        },
        {
          label: `Levelized Cost Of Production (${currSymbol}/t)`,
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
          label: `Levelized Cost Of Carbon Abatement (${currSymbol}/t CO2)`,
          value: formatValue(lccaValue, 2, selectedCurrency),
        },
        {
          label: `Net present value (${currSymbol})`,
          value: formatValue(apiData?.financials?.npv, 2, selectedCurrency),
        },
        {
          label: 'Internal rate of return (%)',
          value: formatPercent(apiData?.financials?.irr, 2),
        },
        {
          label: 'Payback period (years)',
          value: (() => {
            const pp = apiData?.financials?.paybackPeriod ?? apiData?.financials?.payback_period;
            return (pp !== null && pp !== undefined) ? Number(pp).toFixed(1) : 'N/A';
          })(),
        },
      ].filter(stat => isStatVisible(stat.label)),
    },
  };

  const projectHeader = currentProject && (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "0.5rem 0.75rem",
      backgroundColor: colors.cardBackground,
      borderBottom: `1px solid ${colors.border}`,
      marginBottom: "0.5rem"
    }}>
      <div>
        <h6 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: colors.text }}>
          {currentProject.projectName || currentProject.project_name}
        </h6>
      </div>
      <button
        onClick={() => setShowProjectModal(true)}
        style={{
          background: "#006D7C",
          border: "none",
          color: "white",
          cursor: "pointer",
          fontSize: "0.8rem",
          padding: "0.4rem 0.8rem",
          borderRadius: "4px",
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          fontWeight: 500
        }}
        title="Switch to another project"
      >
        <i className="material-icons" style={{ fontSize: "1rem" }}>swap_horiz</i>
        Switch Project
      </button>
    </div>
  );

  const handleProjectSelected = (project, scenario) => {
    console.log("📁 Project selected in TEA:", project);
    console.log("📋 Scenario selected in TEA:", scenario);
    setShowProjectModal(false);
  };

  return (
    <>
      {/* Blur overlay when modal is open */}
      {showProjectModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            zIndex: 1040,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Project Selection Modal */}
      <ProjectStartupModal
        isOpen={showProjectModal}
        onProjectSelected={handleProjectSelected}
      />

      <Container fluid className="main-content-container px-2" style={{
        filter: showProjectModal ? "blur(4px)" : "none",
        transition: "filter 0.3s ease",
        display: "flex",
        flexDirection: "column",
        height: "100%"
      }}>
        {projectHeader}

        {/* Main Layout - keep existing structure */}
        <div style={{ display: "flex", flexDirection: "row", gap: "12px", width: "100%", flex: 1, minHeight: 0, paddingBottom: "8px" }}>
          {/* Left Form */}
          <div style={{ width: isLeftPanelCollapsed ? "50px" : "25%", minWidth: isLeftPanelCollapsed ? "50px" : "25%", maxWidth: isLeftPanelCollapsed ? "50px" : "25%", height: "100%", minHeight: 0, position: "relative", transition: "all 0.3s ease" }}>
            {/* Toggle Button */}
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
                title={isLeftPanelCollapsed ? "Show Input Panel" : "Hide Input Panel"}
              >
                {isLeftPanelCollapsed ? "►" : "◄"}
              </button>
            </div>

            {/* Form */}
            {!isLeftPanelCollapsed && (
              <div style={{ height: "100%", overflowY: "auto", paddingRight: "4px", minHeight: 0 }}>
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
              </div>
            )}
          </div>

          {/* Chart area */}
          <div className="d-flex flex-column" style={{ flex: 1, height: "100%", minWidth: 0, minHeight: 0, transition: "all 0.3s ease" }}>
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
                    <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm15 2h-4v3h4V4zm0 4h-4v3h4V8zm0 4h-4v3h3a1 1 0 0 0 1-1v-2zm-5 3v-3H6v3h4zm-5 0v-3H1v2a1 1 0 0 0 1 1h3zm-4-4h4V8H1v3zm0-4h4V4H1v3zm5-3v3h4V4H6zm4 4H6v3h4V8z" />
                  </svg>
                </Button>
              </CardHeader>
              <CardBody className="flex-fill" style={{ padding: "10px", minHeight: 0, flex: 1 }}>
                <BreakevenBarChart data={chartData} comparisonData={comparisonChartData} />
              </CardBody>
            </Card>
          </div>

          {/* KPI Cards - narrower width, stays in place */}
          <div style={{ width: "300px", minWidth: "300px", maxWidth: "300px", height: "calc(100% - 8px)", minHeight: 0, display: "flex", flexDirection: "column", gap: "12px", marginBottom: "8px" }}>
            {/* Consolidated KPI Cards - Mutually Exclusive Maximized Views */}
            {Object.entries(kpiGroups).map(([groupKey, group]) => {
              const isMaximized = maximizedKPI === groupKey;
              const cardHeight = isMaximized ? "67%" : "33%";

              return (
                <Card
                  small
                  key={groupKey}
                  style={{
                    height: cardHeight,
                    transition: "height 0.3s ease",
                    display: "flex",
                    flexDirection: "column"
                  }}
                >
                  <CardHeader
                    className="border-bottom p-3"
                    onClick={() => setMaximizedKPI(groupKey)}
                    style={{
                      backgroundColor: group.color,
                      color: "white",
                      borderLeft: "none",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <h6 className="m-0" style={{ fontSize: "0.95rem", fontWeight: "700", letterSpacing: "0.5px" }}>
                      {group.title}
                    </h6>
                    <i className="material-icons" style={{ fontSize: "1.2rem" }}>
                      {isMaximized ? "unfold_less" : "unfold_more"}
                    </i>
                  </CardHeader>
                  <CardBody className="p-3" style={{ flex: 1, overflowY: "auto" }}>
                    {group.stats.map((stat, idx) => {
                      const hasDetails = Array.isArray(stat.details) && stat.details.length > 0;
                      const detailKey = `${groupKey}:${stat.label}`;
                      const isDetailOpen = hasDetails && expandedStatDetails[detailKey];
                      const isConsumptionCards = stat.type === "consumptionCards";

                      return (
                        <div
                          key={idx}
                          style={{
                            marginBottom: idx < group.stats.length - 1 ? "1rem" : "0",
                            paddingBottom: idx < group.stats.length - 1 ? "1rem" : "0",
                            borderBottom: idx < group.stats.length - 1 ? `1px solid ${colors.border}` : "none"
                          }}
                        >
                          {/* Output Header */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: "0.5rem"
                            }}
                          >
                            <h6
                              style={{
                                margin: 0,
                                fontSize: "0.8rem",
                                fontWeight: "600",
                                color: colors.text,
                                textTransform: "uppercase",
                                letterSpacing: "0.5px"
                              }}
                            >
                              {stat.label}
                            </h6>
                            {hasDetails && (
                              <Button
                                size="sm"
                                theme="light"
                                style={{ fontSize: "0.7rem", padding: "2px 8px" }}
                                onClick={() => toggleStatDetail(detailKey)}
                              >
                                {isDetailOpen ? "Hide" : "Details"}
                              </Button>
                            )}
                          </div>

                          {/* Output Value */}
                          {isConsumptionCards ? (
                            stat.cards && stat.cards.length ? (
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
                                  gap: "8px",
                                }}
                              >
                                {stat.cards.map((card) => (
                                  <div
                                    key={card.key || card.label}
                                    style={{
                                      backgroundColor: colors.background,
                                      borderRadius: "6px",
                                      padding: "8px",
                                      textAlign: "center",
                                      border: `1px solid ${colors.border}`,
                                    }}
                                  >
                                    <div style={{ fontSize: "0.7rem", fontWeight: 600, color: colors.textSecondary, marginBottom: "4px" }}>
                                      {card.label}
                                    </div>
                                    <div style={{ fontSize: "1rem", fontWeight: 700, color: colors.text }}>
                                      {card.value ?? "N/A"}
                                    </div>
                                    <div style={{ fontSize: "0.7rem", color: colors.textSecondary, marginTop: "2px" }}>{card.unit}</div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={{ fontSize: "0.9rem", fontWeight: 600, color: colors.textSecondary, textAlign: "center" }}>
                                N/A
                              </div>
                            )
                          ) : (
                            <>
                              <div
                                style={{
                                  fontSize: "1.3rem",
                                  fontWeight: "700",
                                  color: colors.text,
                                  marginBottom: hasDetails && isDetailOpen ? "0.75rem" : "0"
                                }}
                              >
                                {stat.value || "N/A"}
                              </div>

                              {/* Details sub-section */}
                              {hasDetails && isDetailOpen && (
                                <div style={{ marginTop: "0.5rem", paddingLeft: "0.5rem", borderLeft: `3px solid ${colors.border}` }}>
                                  {stat.details.map((detail, dIdx) => {
                                    return (
                                      <div
                                        key={dIdx}
                                        style={{
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          fontSize: '0.8rem',
                                          fontWeight: 500,
                                          color: colors.textSecondary,
                                          padding: '4px 0'
                                        }}
                                      >
                                        <span>{detail.label}</span>
                                        <span style={{ fontWeight: 600, color: colors.text }}>{detail.value}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Cash Flow Modal */}
        <Modal open={openTable} toggle={() => setOpenTable(!openTable)} size="lg">
          <ModalBody>
            <CashFlowTable tableData={table} />
          </ModalBody>
        </Modal>
      </Container>
    </>
  );
};

export default AnalysisDashboard;
