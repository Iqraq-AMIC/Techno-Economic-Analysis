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
import LcopCostChart from "../components/charts/LcopCostChart";
import BiofuelForm from "../forms/BiofuelForm";
import CashFlowTable from "../forms/CashFlowTable";
import { useTheme } from "../contexts/ThemeContext";
import { useAccess } from "../contexts/AccessContext";
import { useProject } from "../contexts/ProjectContext";
import ProjectStartupModal from "../components/project/ProjectStartupModal";
import { calculateScenario } from "../api/projectApi";

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

const AnalysisDashboard = ({ selectedCurrency = "USD" }) => {
  const { colors } = useTheme();
  const { selectedAccess } = useAccess();
  const { currentProject, currentScenario, scenarios, comparisonScenarios } = useProject();

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
    }
  }, [currentProject]);

  useEffect(() => {
    console.log("🎭 showProjectModal changed to:", showProjectModal);
  }, [showProjectModal]);

  // Load inputs and outputs from current scenario when it changes
  useEffect(() => {
    if (currentScenario) {
      console.log("🔄 Loading data from scenario:", currentScenario.scenario_name);

      // Load inputs if they exist in scenario
      if (currentScenario.inputs && Object.keys(currentScenario.inputs).length > 0) {
        console.log("📥 Loading inputs from scenario");
        setInputs(currentScenario.inputs);
        setSelectedProcess(currentScenario.inputs.selected_process || "");
        setSelectedFeedstock(currentScenario.inputs.selected_feedstock || "");
      }

      // Load outputs if they exist in scenario
      if (currentScenario.outputs && Object.keys(currentScenario.outputs).length > 0) {
        console.log("📥 Loading outputs from scenario");
        if (currentScenario.outputs.apiData) {
          setApiData(currentScenario.outputs.apiData);
        }
        if (currentScenario.outputs.table) {
          setTable(currentScenario.outputs.table);
          setChartData(buildChartData(currentScenario.outputs.table));
        }
      }
    }
  }, [currentScenario?.scenario_id]);

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
    feedstock_ci_unit: "gCO\u2082/kg",
    feedstock_energy_content: 18,
    feedstock_energy_unit: "MJ/kg",
    feedstock_yield: 1.5,
    feedstock_yield_unit: "kg/kg",
    hydrogen_yield: 0.042,
    hydrogen_yield_unit: "kg/kg",
    electricity_yield: 0.12,
    electricity_yield_unit: "kWh/kg",
    hydrogen_carbon_intensity: 0,
    hydrogen_ci_unit: "gCO\u2082/kg",
    electricity_carbon_intensity: 0,
    electricity_ci_unit: "gCO\u2082/kWh",
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
        priceSensitivityUnit: "USD/gCO\u2082",
        carbonContent: 0.7,
        energyContent: 43,
        energyUnit: "MJ/kg",
        density: 820,
        yield: 0.4,
        yieldUnit: "kg/kg",
        // massFraction: 70,
      },
      {
        name: "Diesel",
        price: 2000,
        priceUnit: "USD/t",
        priceSensitivity: 0,
        priceSensitivityUnit: "USD/gCO\u2082",
        carbonContent: 0.75,
        energyContent: 42,
        energyUnit: "MJ/kg",
        density: 830,
        yield: 0.2,
        yieldUnit: "kg/kg",
        // massFraction: 20,
      },
      {
        name: "Naphtha",
        price: 1500,
        priceUnit: "USD/t",
        priceSensitivity: 0,
        priceSensitivityUnit: "USD/gCO\u2082",
        carbonContent: 0.65,
        energyContent: 40,
        energyUnit: "MJ/kg",
        density: 750,
        yield: 0.1,
        yieldUnit: "kg/kg",
        // massFraction: 10,
      },
    ],
  });

  // Start with empty strings - will be populated by BiofuelForm when it loads from API
  const [selectedProcess, setSelectedProcess] = useState("");
  const [selectedFeedstock, setSelectedFeedstock] = useState("");

  // Master data for ID lookups (processes and feedstocks with IDs)
  const [masterData, setMasterData] = useState({ processes: [], feedstocks: [] });

  const [apiData, setApiData] = useState(null);
  const [table, setTable] = useState(mockCashFlowTable);
  const [chartData, setChartData] = useState(buildChartData(mockCashFlowTable));
  const [comparisonChartData, setComparisonChartData] = useState([]);
  const [comparisonLcopData, setComparisonLcopData] = useState([]);
  const [openTable, setOpenTable] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [expandedStatDetails, setExpandedStatDetails] = useState({});
  const [maximizedKPI, setMaximizedKPI] = useState('processOutputs'); // 'processOutputs' or 'economicOutputs'
  const [chartView, setChartView] = useState('breakeven'); // 'breakeven' or 'lcop'

  // Update ref when table changes (after table is declared)
  useEffect(() => {
    tableRef.current = table;
  }, [table]);

  // NOTE: Auto-save removed - calculation only happens when user clicks "Calculate" button

  // Handle master data loaded from BiofuelForm (processes and feedstocks with IDs)
  const handleMasterDataLoaded = React.useCallback((data) => {
    setMasterData(prev => ({ ...prev, ...data }));
  }, []);

  // Fetch comparison data when scenarios are selected for comparison
  useEffect(() => {
    const fetchComparisonData = async () => {
      if (!comparisonScenarios || comparisonScenarios.length === 0) {
        setComparisonChartData([]);
        return;
      }

      console.log("📊 Fetching comparison data for scenarios:", comparisonScenarios);
      console.log("📊 Available scenarios:", scenarios);

      try {
        const comparisonData = await Promise.all(
          comparisonScenarios.map(async (scenarioId) => {
            const scenario = scenarios.find(s => s.scenario_id === scenarioId);
            console.log(`📊 Found scenario ${scenarioId}:`, scenario);

            if (!scenario) {
              console.log(`❌ Scenario ${scenarioId} not found`);
              return null;
            }

            // Get outputs from scenario
            const outputs = scenario.outputs;
            console.log(`📊 Outputs for ${scenario.scenario_name}:`, outputs);

            // Try different possible locations for the cash flow table
            let cashFlowData = null;

            if (outputs) {
              // Try cash_flow_table first
              if (outputs.cash_flow_table && outputs.cash_flow_table.length > 0) {
                cashFlowData = outputs.cash_flow_table;
                console.log(`✅ Found cash_flow_table for ${scenario.scenario_name}`);
              }
              // Try table property
              else if (outputs.table && outputs.table.length > 0) {
                cashFlowData = outputs.table;
                console.log(`✅ Found table for ${scenario.scenario_name}`);
              }
            }

            // If still no data and this is the current scenario, use current table
            if (!cashFlowData && scenarioId === currentScenario?.scenario_id && tableRef.current && tableRef.current.length > 0) {
              cashFlowData = tableRef.current;
              console.log(`✅ Using current table for ${scenario.scenario_name}`);
            }

            if (!cashFlowData) {
              console.log(`❌ No cash flow data found for ${scenario.scenario_name}`);
              return null;
            }

            return {
              name: scenario.scenario_name,
              data: cashFlowData,
            };
          })
        );

        // Filter out null values
        const validComparisons = comparisonData.filter(d => d !== null);
        console.log("📊 Valid comparison data:", validComparisons);
        setComparisonChartData(validComparisons);
      } catch (error) {
        console.error("Error fetching comparison data:", error);
        setComparisonChartData([]);
      }
    };

    fetchComparisonData();
  }, [comparisonScenarios, scenarios, currentScenario?.scenario_id]);

  // Fetch LCOP comparison data for cost chart
  useEffect(() => {
    if (!comparisonScenarios || comparisonScenarios.length === 0) {
      setComparisonLcopData([]);
      return;
    }

    const lcopComparisonData = comparisonScenarios.map(scenarioId => {
      const scenario = scenarios.find(s => s.scenario_id === scenarioId);
      if (!scenario || !scenario.outputs) return null;

      const outputs = scenario.outputs;

      return {
        scenarioName: scenario.scenario_name,
        lcopData: {
          capital: outputs.lcopCapital || 0,
          feedstock: outputs.lcopFeedstock || 0,
          hydrogen: outputs.lcopHydrogen || 0,
          electricity: outputs.lcopElectricity || 0,
          indirect: outputs.lcopIndirect || 0,
          total: outputs.LCOP || outputs.lcop || 0
        }
      };
    }).filter(d => d !== null);

    setComparisonLcopData(lcopComparisonData);
  }, [comparisonScenarios, scenarios]);

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
          priceSensitivityUnit: "USD/gCO\u2082",
          carbonContent: 0.6,
          energyContent: 35,
          energyUnit: "MJ/kg",
          density: "",
          yield: 0.1,
          yieldUnit: "kg/kg",
          // massFraction: 0,
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
      feedstock_ci_unit: "gCO\u2082/kg",
      feedstock_energy_content: 0,
      feedstock_energy_unit: "MJ/kg",
      feedstock_yield: 0,
      feedstock_yield_unit: "kg/kg",
      hydrogen_yield: 0,
      hydrogen_yield_unit: "kg/kg",
      electricity_yield: 0,
      electricity_yield_unit: "kWh/kg",
      hydrogen_carbon_intensity: 0,
      hydrogen_ci_unit: "gCO\u2082/kg",
      electricity_carbon_intensity: 0,
      electricity_ci_unit: "gCO\u2082/kWh",
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
          priceSensitivityUnit: "USD/gCO\u2082",
          carbonContent: 0,
          energyContent: 0,
          energyUnit: "MJ/kg",
          density: "",
          yield: 0,
          yieldUnit: "kg/kg",
          // massFraction: 0,
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
      // csvRows.push(`Hydrogen Consumption,${te.hydrogen_consumption || 'N/A'},kg/yr`);
      csvRows.push(`Hydrogen Consumption,${te.hydrogen_consumption || 'N/A'},ton/year`);
      csvRows.push(`Electricity Consumption,${te.electricity_consumption || 'N/A'},MWh/yr`);
      csvRows.push(`Total OPEX,${te.total_opex || 'N/A'},${selectedCurrency}/yr`);
      csvRows.push(`Total Direct OPEX,${te.total_direct_opex || 'N/A'},${selectedCurrency}/yr`);
      csvRows.push(`Total Indirect OPEX,${te.total_indirect_opex || 'N/A'},${selectedCurrency}/yr`);
      csvRows.push(`Feedstock Cost,${te.feedstock_cost || 'N/A'},${selectedCurrency}/yr`);
      csvRows.push(`Hydrogen Cost,${te.hydrogen_cost || 'N/A'},${selectedCurrency}/yr`);
      csvRows.push(`Electricity Cost,${te.electricity_cost || 'N/A'},${selectedCurrency}/yr`);
      csvRows.push(`LCOP,${te.LCOP || te.lcop || 'N/A'},${selectedCurrency}/t`);
      csvRows.push(`LCCA,${te.LCCA || te.lcca || 'N/A'},${selectedCurrency}/tCO\u2082`);
      csvRows.push(`Carbon Intensity,${te.carbon_intensity || 'N/A'},gCO\u2082e/MJ`);
      csvRows.push(`Total CO\u2082 Emissions,${te.total_co2_emissions || 'N/A'},tCO\u2082/yr`);
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

  const applyTableData = (tableData) => {
    setTable(tableData);
    setChartData(buildChartData(tableData));
  };

  const calculateOutputs = async () => {
    if (!selectedProcess || !selectedFeedstock) {
      console.warn("Process and feedstock must be selected before calculation.");
      return;
    }

    if (!currentScenario?.scenario_id) {
      console.warn("No scenario selected. Please select or create a project first.");
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

    // Look up IDs from master data
    const processObj = masterData.processes.find(p => p.name === selectedProcess);
    const feedstockObj = masterData.feedstocks.find(f => f.name === selectedFeedstock);

    if (!processObj || !feedstockObj) {
      console.warn("Could not find process or feedstock ID. Please re-select process and feedstock.");
      return;
    }

    // Default country ID (will need to be updated when country selection is implemented)
    const countryId = 1; // Placeholder - should come from country selection

    setIsCalculating(true);
    try {
      // Build payload matching backend UserInputsSchema
      const payload = {
        processId: processObj.id,
        feedstockId: feedstockObj.id,
        countryId: countryId,
        conversionPlant: {
          plantCapacity: {
            value: inputs.production_capacity || 100,
            unitId: 1 // ktpa unit ID
          },
          annualLoadHours: inputs.annual_load_hours || 8000,
          ciProcessDefault: inputs.conversion_process_ci_default || 0
        },
        economicParameters: {
          projectLifetimeYears: inputs.plant_lifetime || 20,
          discountRatePercent: inputs.discount_factor || 10,
          tciRefMusd: inputs.tci_ref || null,
          referenceCapacityKtpa: inputs.capacity_ref || null,
          tciScalingExponent: inputs.tci_scaling_exponent || 0.6,
          workingCapitalTciRatio: inputs.wc_to_tci_ratio || 0.05,
          indirectOpexTciRatio: inputs.indirect_opex_to_tci_ratio || 0.04
        },
        feedstockData: [{
          name: selectedFeedstock,
          price: { value: inputs.feedstock_price || 0, unitId: 2 },
          carbonContent: inputs.feedstock_carbon_content || 0,
          carbonIntensity: { value: inputs.feedstock_carbon_intensity || 0, unitId: 3 },
          energyContent: inputs.feedstock_energy_content || 0,
          yieldPercent: inputs.feedstock_yield || 0
        }],
        utilityData: [
          {
            name: "Hydrogen",
            price: { value: inputs.hydrogen_price || 0, unitId: 4 },
            carbonContent: 0,
            carbonIntensity: { value: inputs.hydrogen_carbon_intensity || 0, unitId: 5 },
            energyContent: 0,
            yieldPercent: inputs.hydrogen_yield || 0
          },
          {
            name: "Electricity",
            price: { value: inputs.electricity_rate || 0, unitId: 6 },
            carbonContent: 0,
            carbonIntensity: { value: inputs.electricity_carbon_intensity || 0, unitId: 7 },
            energyContent: 0,
            yieldPercent: inputs.electricity_yield || 0
          }
        ],
        productData: (inputs.products || []).map(product => ({
          name: product.name,
          price: { value: Number(product.price) || 0, unitId: 8 },
          priceSensitivityToCi: Number(product.priceSensitivity) || 0,
          carbonContent: Number(product.carbonContent) || 0,
          energyContent: Number(product.energyContent) || 0,
          yieldPercent: Number(product.yield) || 0,
          productDensity: Number(product.density) || 0
        }))
      };

      console.log("=== API Request ===");
      console.log("Scenario ID:", currentScenario.scenario_id);
      console.log("Payload:", payload);

      // Use the calculateScenario API function
      const result = await calculateScenario(currentScenario.scenario_id, payload);

      console.log("=== API Response ===");
      console.log("Result:", result);

      if (!result.success) {
        console.error("Calculation failed:", result.error);
        applyTableData(mockCashFlowTable);
        setApiData(null);
        return;
      }

      const resData = result.data;
      setApiData(resData);

      if (resData?.outputs?.cashFlowTable?.length) {
        applyTableData(resData.outputs.cashFlowTable);
        console.log("Table updated with", resData.outputs.cashFlowTable.length, "rows of API data");
      } else if (resData?.financials?.cashFlowTable?.length) {
        applyTableData(resData.financials.cashFlowTable);
        console.log("Table updated with", resData.financials.cashFlowTable.length, "rows of API data");
      } else {
        console.warn("No cash flow table in response, using mock data");
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
  const totalDirectOpex = toFiniteNumber(apiData?.technoEconomics?.total_direct_opex);
  const annualCapacity = toFiniteNumber(apiData?.technoEconomics?.production) || inputs?.production_capacity || 0;
  const safeCapacity = annualCapacity > 0 ? annualCapacity : null;
  const lcopValue = toFiniteNumber(apiData?.technoEconomics?.lcop ?? apiData?.technoEconomics?.LCOP);
  const totalCapitalInvestment = toFiniteNumber(apiData?.technoEconomics?.total_capital_investment);
  const feedstockCostValue = toFiniteNumber(apiData?.technoEconomics?.feedstock_cost);
  const totalIndirectOpexValue = toFiniteNumber(apiData?.technoEconomics?.total_indirect_opex);
  const totalOpexValue = toFiniteNumber(apiData?.technoEconomics?.total_opex);

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

  // Prepare LCOP chart data for single scenario
  const lcopChartData = {
    capital: lcopCapital || 0,
    feedstock: lcopFeedstock || 0,
    hydrogen: lcopHydrogen || 0,
    electricity: lcopElectricity || 0,
    indirect: lcopIndirect || 0,
    total: lcopValue || 0
  };

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
      value: formatNumber(hydrogenConsumption / 1000, 2),
      unit: "ton/yr",
    });
  }
  if (electricityConsumption !== null) {
    consumptionCards.push({
      key: "electricity",
      label: "Electricity",
      value: formatNumber(electricityConsumption / 1000, 2),
      unit: "MWh/yr",
    });
  }

  // Build per-product output details for KPI cards
  const productOutputDetails = (apiData?.technoEconomics?.products || []).map((p) => ({
    label: `${p.name}`,
    value: `${formatNumber(p.amount_of_product, 2)} t/yr`,
  }));

  const productCarbonEfficiencyDetails = (apiData?.technoEconomics?.products || []).map((p) => ({
    label: p.name || "Product",
    value: `${formatNumber(p.carbon_conversion_efficiency_percent ?? 0, 2)}%`,
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
          label: "Carbon Intensity (kg CO\u2082e/t product)",
          value: formatNumber(carbonIntensityPerProduct, 3),
        },
        {
          label: "Carbon Conversion Efficiency (%)",
          value: formatNumber(apiData?.technoEconomics?.carbon_conversion_efficiency_percent, 2),
          details: productCarbonEfficiencyDetails,
        },
        {
          label: "Total CO\u2082 Emissions (tons/year)",
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
          label: `Levelized Cost Of Carbon Abatement (${currSymbol}/t CO\u2082)`,
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
          value: apiData?.financials?.paybackPeriod ? apiData.financials.paybackPeriod.toFixed(1) : 'N/A',
        },
      ].filter(stat => isStatVisible(stat.label)),
    },
  };

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

      <Container fluid className="main-content-container px-2" style={{ filter: showProjectModal ? "blur(4px)" : "none", transition: "filter 0.3s ease", display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Project Header with Switch Button */}
      {currentProject && (
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
              {currentProject.project_name}
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
      )}

      {/* Main Layout */}
      {/* Tighten gap between scenario inputs (left) and chart (right) */}
      <div style={{ display: "flex", flexDirection: "row", gap: "12px", width: "100%", flex: 1, minHeight: 0, paddingBottom: "8px" }}>
        {/* Left Form - always show but with different width */}
        <div
          style={{
            width: isLeftPanelCollapsed ? "50px" : "25%",
            minWidth: isLeftPanelCollapsed ? "50px" : "25%",
            maxWidth: isLeftPanelCollapsed ? "50px" : "25%",
            height: "100%",
            minHeight: 0,
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
                onMasterDataLoaded={handleMasterDataLoaded}
              />
            </div>
          )}
        </div>

        {/* Chart area - expands when sidebar collapses */}
        <div className="d-flex flex-column" style={{ flex: 1, height: "100%", minWidth: 0, minHeight: 0, transition: "all 0.3s ease" }}>
              <Card small className="flex-fill d-flex flex-column">
                <CardHeader className="border-bottom d-flex justify-content-between align-items-center p-2">
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <h6 className="m-0" style={{ fontSize: "0.85rem", fontWeight: "600" }}>
                        {chartView === 'breakeven' ? 'Breakeven Analysis' : 'LCOP Cost Breakdown'}
                      </h6>
                      {selectedAccess === 'ROADSHOW' && (
                        <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                          <Button
                            size="sm"
                            onClick={() => setChartView('breakeven')}
                            style={{
                              fontSize: '0.7rem',
                              padding: '2px 8px',
                              backgroundColor: chartView === 'breakeven' ? colors.oxfordBlue : colors.background,
                              color: chartView === 'breakeven' ? '#fff' : colors.text,
                              borderColor: colors.border,
                              transition: 'all 0.2s'
                            }}
                          >
                            Breakeven
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => setChartView('lcop')}
                            style={{
                              fontSize: '0.7rem',
                              padding: '2px 8px',
                              backgroundColor: chartView === 'lcop' ? colors.oxfordBlue : colors.background,
                              color: chartView === 'lcop' ? '#fff' : colors.text,
                              borderColor: colors.border,
                              transition: 'all 0.2s'
                            }}
                          >
                            Cost
                          </Button>
                        </div>
                      )}
                    </div>
                    <small style={{ fontSize: '0.7rem', fontWeight: '400', color: colors.textSecondary }}>
                      {chartView === 'breakeven'
                        ? 'Cumulative discounted cash flow across project lifetime; breakeven occurs where the curve first crosses zero.'
                        : 'Breakdown of levelized cost of production by component (TCI, feedstock, utilities, indirect OPEX).'}
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
                <CardBody className="flex-fill" style={{ padding: "10px", minHeight: 0, flex: 1 }}>
                  {chartView === 'breakeven' ? (
                    <BreakevenBarChart data={chartData} comparisonData={comparisonChartData} />
                  ) : (
                    <LcopCostChart
                      lcopData={lcopChartData}
                      comparisonData={comparisonLcopData}
                      isComparison={comparisonScenarios.length > 0}
                      colors={colors}
                    />
                  )}
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
                                {stat.details.map((detail, dIdx) => (
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
                                ))}
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
