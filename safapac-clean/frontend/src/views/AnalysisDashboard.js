import React, { useState, useEffect } from "react";
import {
  Container,
  Card,
  CardBody,
  CardHeader,
  Button,
  Modal,
  ModalBody,
  ButtonGroup
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
import { convertUnit, UNIT_TO_VALUE_FIELD, FIELD_TO_CONVERSION_TYPE, PRODUCT_UNIT_TO_VALUE_FIELD, PRODUCT_FIELD_TO_CONVERSION_TYPE } from "../utils/unitConversions";

// Compare Scenarios Dropdown Component
const CompareDropdown = ({ scenarios, currentScenario, comparisonScenarios, toggleComparisonScenario, clearComparison, colors }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const selectedCount = comparisonScenarios.length;

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <Button
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          backgroundColor: selectedCount > 0 ? "#006D7C" : colors.oxfordBlue,
          borderColor: selectedCount > 0 ? "#006D7C" : colors.oxfordBlue,
          color: "#fff",
          padding: "0.25rem 0.75rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.8rem",
          transition: "all 0.2s ease",
        }}
        title="Compare Scenarios"
      >
        <i className="material-icons" style={{ fontSize: "1rem" }}>
          compare_arrows
        </i>
        Compare
        {selectedCount > 0 && (
          <span style={{
            backgroundColor: "rgba(255,255,255,0.3)",
            borderRadius: "10px",
            padding: "0 0.4rem",
            fontSize: "0.7rem",
            fontWeight: 600,
          }}>
            {selectedCount}
          </span>
        )}
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: "0.25rem",
            backgroundColor: colors.cardBackground,
            border: `1px solid ${colors.border}`,
            borderRadius: "6px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 1000,
            minWidth: "240px",
            maxWidth: "280px",
          }}
        >
          {/* Header */}
          <div style={{
            padding: "0.75rem",
            borderBottom: `1px solid ${colors.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: colors.text }}>
              Select Scenarios to Compare
            </span>
            {selectedCount > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearComparison();
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#c4183c",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  padding: 0,
                }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Scenario List */}
          <div style={{ padding: "0.5rem" }}>
            {scenarios.map((scenario) => {
              const isSelected = comparisonScenarios.includes(scenario.scenario_id);
              const isCurrent = currentScenario?.scenario_id === scenario.scenario_id;

              return (
                <div
                  key={scenario.scenario_id}
                  onClick={() => toggleComparisonScenario(scenario.scenario_id)}
                  style={{
                    padding: "0.5rem 0.75rem",
                    borderRadius: "4px",
                    cursor: "pointer",
                    backgroundColor: isSelected ? "rgba(0, 109, 124, 0.1)" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "0.25rem",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = colors.hoverBackground;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    style={{
                      width: "16px",
                      height: "16px",
                      cursor: "pointer",
                      accentColor: "#006D7C",
                    }}
                  />
                  <span style={{
                    fontSize: "0.8rem",
                    color: colors.text,
                    fontWeight: isCurrent ? 600 : 400,
                  }}>
                    {scenario.scenario_name}
                  </span>
                  {isCurrent && (
                    <i className="material-icons" style={{ fontSize: "0.9rem", color: "#006D7C", marginLeft: "auto" }}>
                      check_circle
                    </i>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          {selectedCount > 0 && (
            <div style={{
              padding: "0.5rem 0.75rem",
              borderTop: `1px solid ${colors.border}`,
              fontSize: "0.75rem",
              color: colors.textSecondary,
              textAlign: "center",
            }}>
              {selectedCount} scenario{selectedCount !== 1 ? 's' : ''} selected
            </div>
          )}
        </div>
      )}
    </div>
  );
};

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

// HEFA default inputs constant (reusable for initial state and reset)
const HEFA_DEFAULT_INPUTS = {
  production_capacity: 500000,
  plant_capacity_unit: "t/yr",
  average_liquid_density: 800,
  average_liquid_density_unit: "kg/m3",
  annual_load_hours: 8000,
  conversion_process_ci_default: 20,
  feedstock_price: 930,
  feedstock_price_unit: "USD/t",
  hydrogen_price: 5.4,
  hydrogen_price_unit: "USD/kg",
  electricity_rate: 0.055,
  electricity_rate_unit: "USD/kWh",
  feedstock_carbon_intensity: 46.526,
  feedstock_ci_unit: "gCO₂/kg",
  feedstock_energy_content: 0,
  feedstock_energy_unit: "MJ/kg",
  feedstock_yield: 1.21,
  feedstock_yield_unit: "kg/kg",
  hydrogen_yield: 0.042,
  hydrogen_yield_unit: "kg/kg",
  electricity_yield: 0.12,
  electricity_yield_unit: "kWh/kg",
  hydrogen_carbon_intensity: 0,
  hydrogen_ci_unit: "gCO₂/kg",
  electricity_carbon_intensity: 20,
  electricity_ci_unit: "gCO₂/kWh",
  feedstock_carbon_content: 0.78,
  plant_lifetime: 20,
  discount_factor: 0.07,
  land_cost: 0,
  tci_ref: 400_000_000,
  tci_ref_unit: "USD",
  capacity_ref: 500000,
  capacity_ref_unit: "t/yr",
  tci_scaling_exponent: 0.6,
  wc_to_tci_ratio: 0.15,
  indirect_opex_to_tci_ratio: 0.077,
  products: [
    {
      name: "JET",
      price: 3000,
      priceUnit: "USD/t",
      priceSensitivity: 0.5,
      priceSensitivityUnit: "USD/gCO₂",
      carbonContent: 0.847,
      energyContent: 43.8,
      energyUnit: "MJ/kg",
      density: 810,
      yield: 0.64,
      yieldUnit: "kg/kg",
    },
    {
      name: "DIESEL",
      price: 1500,
      priceUnit: "USD/t",
      priceSensitivity: 0.5,
      priceSensitivityUnit: "USD/gCO₂",
      carbonContent: 0.85,
      energyContent: 42.6,
      energyUnit: "MJ/kg",
      density: 830,
      yield: 0.15,
      yieldUnit: "kg/kg",
    },
    {
      name: "Naphtha",
      price: 1000,
      priceUnit: "USD/t",
      priceSensitivity: 0.5,
      priceSensitivityUnit: "USD/gCO₂",
      carbonContent: 0.84,
      energyContent: 43.4,
      energyUnit: "MJ/kg",
      density: 700,
      yield: 0.21,
      yieldUnit: "kg/kg",
    },
  ],
};

// Convert backend userInputs format to frontend inputs format
const convertBackendInputsToFrontend = (backendInputs) => {
  if (!backendInputs || !backendInputs.conversionPlant) {
    return null; // Return null if backend inputs are empty/invalid
  }

  const cp = backendInputs.conversionPlant || {};
  const ep = backendInputs.economicParameters || {};
  const feedstock = backendInputs.feedstockData?.[0] || {};
  const hydrogen = backendInputs.utilityData?.find(u => u.name?.toLowerCase() === 'hydrogen') || {};
  const electricity = backendInputs.utilityData?.find(u => u.name?.toLowerCase() === 'electricity') || {};
  const products = backendInputs.productData || [];

  // Convert capacity from KTA to t/yr (backend stores KTA, frontend uses t/yr)
  const capacityKTA = cp.plantCapacity?.value || 500;
  const capacityTYr = capacityKTA * 1000;

  // Convert TCI from MUSD to USD
  const tciMUSD = ep.tciRefMusd || 400;
  const tciUSD = tciMUSD * 1_000_000;

  // Convert reference capacity from KTA to t/yr
  const refCapKTA = ep.referenceCapacityKtpa || 500;
  const refCapTYr = refCapKTA * 1000;

  // Convert electricity price from USD/MWh to USD/kWh
  const elecPriceMWh = electricity.price?.value || 55;
  const elecPriceKWh = elecPriceMWh / 1000;

  // Convert hydrogen price from USD/t to USD/kg
  const hydrogenPricePerTon = hydrogen.price?.value || 5400;
  const hydrogenPricePerKg = hydrogenPricePerTon / 1000;

  // Convert feedstock yield (backend stores as percent if >1, need to check)
  let feedstockYield = feedstock.yieldPercent || 121;
  if (feedstockYield > 10) feedstockYield = feedstockYield / 100; // Convert from 121 to 1.21

  // Convert utility yields (backend stores as percent)
  let hydrogenYield = hydrogen.yieldPercent || 4.2;
  if (hydrogenYield > 1) hydrogenYield = hydrogenYield / 100; // Convert from 4.2 to 0.042

  let electricityYield = electricity.yieldPercent || 12000;
  if (electricityYield > 100) electricityYield = electricityYield / 100000; // Convert from 12000 to 0.12

  return {
    production_capacity: capacityTYr,
    plant_capacity_unit: "t/yr",
    average_liquid_density: 800,
    average_liquid_density_unit: "kg/m3",
    annual_load_hours: cp.annualLoadHours || 8000,
    conversion_process_ci_default: cp.ciProcessDefault || 20,
    feedstock_price: feedstock.price?.value || 930,
    feedstock_price_unit: "USD/t",
    hydrogen_price: hydrogenPricePerKg,
    hydrogen_price_unit: "USD/kg",
    electricity_rate: elecPriceKWh,
    electricity_rate_unit: "USD/kWh",
    feedstock_carbon_intensity: feedstock.carbonIntensity?.value || 46.526,
    feedstock_ci_unit: "gCO₂/kg",
    feedstock_energy_content: feedstock.energyContent || 0,
    feedstock_energy_unit: "MJ/kg",
    feedstock_yield: feedstockYield,
    feedstock_yield_unit: "kg/kg",
    hydrogen_yield: hydrogenYield,
    hydrogen_yield_unit: "kg/kg",
    electricity_yield: electricityYield,
    electricity_yield_unit: "kWh/kg",
    hydrogen_carbon_intensity: hydrogen.carbonIntensity?.value || 0,
    hydrogen_ci_unit: "gCO₂/kg",
    electricity_carbon_intensity: electricity.carbonIntensity?.value || 20,
    electricity_ci_unit: "gCO₂/kWh",
    feedstock_carbon_content: feedstock.carbonContent || 0.78,
    plant_lifetime: ep.projectLifetimeYears || 20,
    discount_factor: (ep.discountRatePercent || 7) / 100, // Convert from 7 to 0.07
    land_cost: 0,
    tci_ref: tciUSD,
    tci_ref_unit: "USD",
    capacity_ref: refCapTYr,
    capacity_ref_unit: "t/yr",
    tci_scaling_exponent: ep.tciScalingExponent || 0.6,
    wc_to_tci_ratio: ep.workingCapitalTciRatio || 0.15,
    indirect_opex_to_tci_ratio: ep.indirectOpexTciRatio || 0.077,
    products: products.map(p => {
      let productYield = p.yieldPercent || 0;
      if (productYield > 1) productYield = productYield / 100; // Convert from 64 to 0.64
      return {
        name: p.name,
        price: p.price?.value || 0,
        priceUnit: "USD/t",
        priceSensitivity: p.priceSensitivityToCi || 0,
        priceSensitivityUnit: "USD/gCO₂",
        carbonContent: p.carbonContent || 0,
        energyContent: p.energyContent || 0,
        energyUnit: "MJ/kg",
        density: (p.productDensity || 810), // Backend stores in kg/m³
        yield: productYield,
        yieldUnit: "kg/kg",
      };
    }),
  };
};

const AnalysisDashboard = ({ selectedCurrency = "USD" }) => {
  const { colors } = useTheme();
  const { selectedAccess } = useAccess();
  const { currentProject, currentScenario, scenarios, comparisonScenarios, updateScenarioOutputs, toggleComparisonScenario, clearComparison } = useProject();

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
      console.log("🔄 Scenario inputs (backend format):", currentScenario.inputs);
      console.log("🔄 Scenario outputs:", currentScenario.outputs);
      console.log("🔄 Scenario financials:", currentScenario.financials);

      // Check if scenario has backend-format inputs (from a previous calculation)
      const hasBackendInputs = currentScenario.inputs &&
        currentScenario.inputs.conversionPlant &&
        Object.keys(currentScenario.inputs).length > 0;

      if (hasBackendInputs) {
        // Convert backend inputs to frontend format
        console.log("📥 Converting backend inputs to frontend format");
        const frontendInputs = convertBackendInputsToFrontend(currentScenario.inputs);
        if (frontendInputs) {
          setInputs(frontendInputs);
          console.log("✅ Loaded converted inputs:", frontendInputs);
        } else {
          // Conversion failed, use defaults
          console.log("⚠️ Conversion failed, using HEFA defaults");
          setInputs({ ...HEFA_DEFAULT_INPUTS });
        }
      } else {
        // No inputs saved yet (new scenario), use HEFA defaults
        console.log("📥 No saved inputs, using HEFA defaults");
        setInputs({ ...HEFA_DEFAULT_INPUTS });
      }

      // Reset process/feedstock selection - let BiofuelForm set defaults
      setSelectedProcess("");
      setSelectedFeedstock("");

      // Load outputs from scenario - outputs contains technoEconomics, financials is separate
      const hasOutputs = currentScenario.outputs && Object.keys(currentScenario.outputs).length > 0;
      const hasFinancials = currentScenario.financials && Object.keys(currentScenario.financials).length > 0;

      if (hasOutputs || hasFinancials) {
        console.log("📥 Loading outputs from scenario");

        // Build apiData structure that the dashboard expects
        const loadedApiData = {
          technoEconomics: currentScenario.outputs || {},
          financials: currentScenario.financials || {}
        };
        setApiData(loadedApiData);

        // Load cash flow table from financials
        const cashFlowTable = currentScenario.financials?.cashFlowTable;
        if (cashFlowTable && cashFlowTable.length > 0) {
          console.log("📥 Loading cash flow table:", cashFlowTable.length, "rows");
          setTable(cashFlowTable);
          setChartData(buildChartData(cashFlowTable));
        }
      } else {
        // No outputs yet, clear apiData and chart
        console.log("📥 No outputs, clearing display");
        setApiData(null);
        setChartData({ labels: [], pv: [], breakevenIndex: -1 });
      }
    }
  }, [currentScenario?.scenario_id]);

  // Use HEFA defaults for initial state
  const [inputs, setInputs] = useState({ ...HEFA_DEFAULT_INPUTS });

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

            // Try different possible locations for the cash flow table
            let cashFlowData = null;

            // Check financials.cashFlowTable first (correct location from API)
            if (scenario.financials?.cashFlowTable?.length > 0) {
              cashFlowData = scenario.financials.cashFlowTable;
              console.log(`✅ Found financials.cashFlowTable for ${scenario.scenario_name}`);
            }
            // Try outputs.cashFlowTable as fallback
            else if (scenario.outputs?.cashFlowTable?.length > 0) {
              cashFlowData = scenario.outputs.cashFlowTable;
              console.log(`✅ Found outputs.cashFlowTable for ${scenario.scenario_name}`);
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
  }, [comparisonScenarios, scenarios, currentScenario?.scenario_id, table]);

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
      const opexBreakdown = outputs.opex_breakdown || {};
      const production = outputs.production || 1;
      const tci = outputs.total_capital_investment || 0;

      // Calculate LCOP components (cost per ton)
      // For capital, we need to annualize TCI using a simplified approach
      const discountRate = 0.07; // Default discount rate
      const lifetime = 25; // Default lifetime
      const crf = (discountRate * Math.pow(1 + discountRate, lifetime)) / (Math.pow(1 + discountRate, lifetime) - 1);
      const annualizedCapital = tci * crf;

      return {
        scenarioName: scenario.scenario_name,
        lcopData: {
          capital: production > 0 ? annualizedCapital / production : 0,
          feedstock: production > 0 ? (opexBreakdown.feedstock || 0) / production : 0,
          hydrogen: production > 0 ? (opexBreakdown.hydrogen || 0) / production : 0,
          electricity: production > 0 ? (opexBreakdown.electricity || 0) / production : 0,
          indirect: production > 0 ? (opexBreakdown.indirect_opex || 0) / production : 0,
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

    setInputs((prev) => {
      // Check if this is a unit field change that requires automatic value conversion
      const valueField = UNIT_TO_VALUE_FIELD[key];

      if (valueField && prev[valueField] !== undefined && prev[key] !== undefined) {
        // This is a unit change - convert the value
        const oldUnit = prev[key];
        const newUnit = value;
        const oldValue = prev[valueField];
        const conversionType = FIELD_TO_CONVERSION_TYPE[valueField];

        if (conversionType && oldUnit !== newUnit) {
          const convertedValue = convertUnit(oldValue, oldUnit, newUnit, conversionType);

          return {
            ...prev,
            [key]: value,
            [valueField]: convertedValue,
          };
        }
      }

      // Regular value change (not a unit change)
      return {
        ...prev,
        [key]: value,
      };
    });
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
      // Check if this is a product unit field change that requires automatic value conversion
      const valueField = PRODUCT_UNIT_TO_VALUE_FIELD[key];
      const currentProduct = prev.products[index];

      if (valueField && currentProduct && currentProduct[valueField] !== undefined && currentProduct[key] !== undefined) {
        // This is a unit change - convert the value
        const oldUnit = currentProduct[key];
        const newUnit = value;
        const oldValue = currentProduct[valueField];
        const conversionType = PRODUCT_FIELD_TO_CONVERSION_TYPE[valueField];

        if (conversionType && oldUnit !== newUnit) {
          const convertedValue = convertUnit(oldValue, oldUnit, newUnit, conversionType);

          const products = prev.products.map((product, idx) =>
            idx === index ? { ...product, [key]: value, [valueField]: convertedValue } : product
          );
          return { ...prev, products };
        }
      }

      // Regular value change (not a unit change)
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
    const productName = inputs.products[index]?.name || `Product ${index + 1}`;
    const confirmRemove = window.confirm(
      `Are you sure you want to remove "${productName}"? This action cannot be undone.`
    );

    if (!confirmRemove) return;

    setInputs((prev) => {
      if (prev.products.length <= 1) return prev;
      const products = prev.products.filter((_, idx) => idx !== index);
      return { ...prev, products };
    });
  };

  const handleReset = () => {
    // Reset to HEFA default values
    setInputs({ ...HEFA_DEFAULT_INPUTS });
    // Reset chart data
    setChartData({ labels: [], pv: [], breakevenIndex: -1 });
    // Clear apiData
    setApiData(null);
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
      // TCI is in MUSD from backend, convert to USD for export
      const tciUSD = te.total_capital_investment ? te.total_capital_investment * 1_000_000 : 'N/A';
      csvRows.push(`Total Capital Investment,${tciUSD},${selectedCurrency}`);
      csvRows.push(`Annual Production,${te.production || 'N/A'},t/yr`);
      csvRows.push(`Feedstock Consumption,${te.feedstock_consumption || 'N/A'},t/yr`);
      csvRows.push(`Hydrogen Consumption,${te.hydrogen_consumption || 'N/A'},ton/year`);
      // Electricity is in kWh from backend, convert to MWh for export
      const elecMWh = te.utility_consumption?.electricity ? te.utility_consumption.electricity / 1000 : 'N/A';
      csvRows.push(`Electricity Consumption,${elecMWh},MWh/yr`);
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
    // Note: Removed strict 100% check to allow calculation even if slightly off, 
    // relying on backend normalization or user discretion.
    
    // Look up IDs from master data
    const processObj = masterData.processes.find(p => p.name === selectedProcess);
    const feedstockObj = masterData.feedstocks.find(f => f.name === selectedFeedstock);

    if (!processObj || !feedstockObj) {
      console.warn("Could not find process or feedstock ID. Please re-select process and feedstock.");
      return;
    }

    const countryId = 1; // Placeholder

    setIsCalculating(true);
    try {
      // === UNIT CONVERSIONS FOR BACKEND ===
      // Convert all inputs to the units that the backend expects

      // 1. Capacity: Convert to KTA (backend expects unitId: 3)
      const capacityKTA = convertUnit(
        inputs.production_capacity || 0,
        inputs.plant_capacity_unit || "t/yr",
        "KTA",
        "capacity"
      );

      // 2. TCI Ref: Always in USD, convert to MUSD
      const tciRefMUSD = (inputs.tci_ref || 0) / 1_000_000;

      // 3. Capacity Ref: Convert to KTA
      const capacityRefKTA = convertUnit(
        inputs.capacity_ref || 0,
        inputs.capacity_ref_unit || "t/yr",
        "KTA",
        "capacity"
      );

      // 4. Feedstock Price: Convert to USD/t (backend expects unitId: 6)
      const feedstockPriceUSDPerTon = convertUnit(
        inputs.feedstock_price || 0,
        inputs.feedstock_price_unit || "USD/t",
        "USD/t",
        "price"
      );

      // 5. Hydrogen Price: Convert to USD/t (backend expects unitId: 6)
      const hydrogenPricePerTon = convertUnit(
        inputs.hydrogen_price || 0,
        inputs.hydrogen_price_unit || "USD/kg",
        "USD/t",
        "price"
      );

      // 6. Electricity Rate: Convert to USD/MWh (backend expects unitId: 10)
      const electricityPriceMWh = convertUnit(
        inputs.electricity_rate || 0,
        inputs.electricity_rate_unit || "USD/kWh",
        "USD/MWh",
        "electricity_rate"
      );

      // 7. Feedstock CI: gCO₂/kg is same as kgCO₂/t (backend expects unitId: 11)
      const feedstockCI = inputs.feedstock_carbon_intensity || 0;

      // 8. Hydrogen CI: gCO₂/kg is same as kgCO₂/t (backend expects unitId: 11)
      const hydrogenCI = inputs.hydrogen_carbon_intensity || 0;

      // 9. Electricity CI: gCO₂/kWh is same as kgCO₂/MWh (backend expects unitId: 13)
      const electricityCI = inputs.electricity_carbon_intensity || 0;

      // 10. Yields: Backend expects specific formats
      // Feedstock Yield: Backend expects percent (121 for 1.21 ratio)
      let feedstockYieldPayload = inputs.feedstock_yield || 0;
      if (feedstockYieldPayload > 1.0 && feedstockYieldPayload < 100) {
         feedstockYieldPayload = feedstockYieldPayload * 100;
      }

      // Hydrogen Yield: Backend expects percent (4.2 for 0.042 ratio)
      let hydrogenYieldPayload = inputs.hydrogen_yield || 0;
      if (hydrogenYieldPayload < 1) {
         hydrogenYieldPayload = hydrogenYieldPayload * 100;
      }

      // Electricity Yield: Convert to kWh, then scale per ton (12000 for 0.12 kWh/kg)
      let electricityYieldPayload = convertUnit(
        inputs.electricity_yield || 0,
        inputs.electricity_yield_unit || "kWh/kg",
        "kWh/kg",
        "yield"
      );
      if (electricityYieldPayload < 100) {
         electricityYieldPayload = electricityYieldPayload * 100000; // Scale to per-ton
      }

      const payload = {
        processId: processObj.id,
        feedstockId: feedstockObj.id,
        countryId: countryId,
        conversionPlant: {
          plantCapacity: {
            value: capacityKTA, // <--- CHANGED: Sent as KTA (500 for 500,000 t/yr)
            unitId: 3 // UnitId 3 = KTA (Kilo Tons per Annum)
          },
          annualLoadHours: inputs.annual_load_hours || 8000,
          ciProcessDefault: inputs.conversion_process_ci_default || 0
        },
        economicParameters: {
          projectLifetimeYears: inputs.plant_lifetime || 20,
          discountRatePercent: (inputs.discount_factor || 0) * 100, // Send as percent (e.g. 7 for 0.07)
          tciRefMusd: tciRefMUSD, // <--- CHANGED: Sent as MUSD
          referenceCapacityKtpa: capacityRefKTA, // <--- CHANGED: Sent as KTA
          tciScalingExponent: inputs.tci_scaling_exponent || 0.6,
          workingCapitalTciRatio: inputs.wc_to_tci_ratio || 0.05,
          indirectOpexTciRatio: inputs.indirect_opex_to_tci_ratio || 0.04
        },
        feedstockData: [{
          name: selectedFeedstock,
          price: { value: feedstockPriceUSDPerTon, unitId: 6 }, // UnitId 6 = USD/t
          carbonContent: inputs.feedstock_carbon_content || 0,
          carbonIntensity: { value: feedstockCI, unitId: 11 }, // UnitId 11 = gCO2/kg
          energyContent: inputs.feedstock_energy_content || 0,
          yieldPercent: feedstockYieldPayload // Scaled to percent
        }],
        utilityData: [
          {
            name: "Hydrogen",
            price: { value: hydrogenPricePerTon, unitId: 6 }, // UnitId 6 = USD/t
            carbonContent: 0,
            carbonIntensity: { value: hydrogenCI, unitId: 11 }, // UnitId 11 = gCO2/kg
            energyContent: 0,
            yieldPercent: hydrogenYieldPayload // Scaled to percent
          },
          {
            name: "electricity",
            price: { value: electricityPriceMWh, unitId: 10 }, // UnitId 10 = USD/MWh
            carbonContent: 0,
            carbonIntensity: { value: electricityCI, unitId: 13 }, // UnitId 13 = gCO2/kWh
            energyContent: 0,
            yieldPercent: electricityYieldPayload // Scaled to per-ton
          }
        ],
        productData: (inputs.products || []).map(product => {
          // Convert product price to USD/t (backend expects unitId: 6)
          const productPriceUSDPerTon = convertUnit(
            Number(product.price) || 0,
            product.priceUnit || "USD/t",
            "USD/t",
            "price"
          );

          // Convert product price sensitivity to USD/gCO₂
          const productPriceSensitivity = convertUnit(
            Number(product.priceSensitivity) || 0,
            product.priceSensitivityUnit || "USD/gCO₂",
            "USD/gCO₂",
            "price_sensitivity"
          );

          // Convert product yield to decimal (backend expects percent like 64 for 64%)
          let productYield = Number(product.yield) || 0;
          // If yield is in kg/kg format (0.64), convert to percent (64)
          if (productYield < 1) {
            productYield = productYield * 100;
          }

          // Product density: Frontend stores as kg/m³ (810), backend expects t/m³ (0.81)
          const productDensity = (Number(product.density) || 0) / 1000;

          return {
            name: product.name,
            price: { value: productPriceUSDPerTon, unitId: 6 }, // UnitId 6 = USD/t
            priceSensitivityToCi: productPriceSensitivity,
            carbonContent: Number(product.carbonContent) || 0,
            energyContent: Number(product.energyContent) || 0,
            yieldPercent: productYield,
            productDensity: productDensity
          };
        })
      };

      console.log("=== API Request Payload (Corrected Units) ===");
      console.log(JSON.stringify(payload, null, 2));

      // Use the calculateScenario API function
      const result = await calculateScenario(currentScenario.scenario_id, payload);

      if (!result.success) {
        console.error("Calculation failed:", result.error);
        applyTableData(mockCashFlowTable);
        setApiData(null);
        return;
      }

      const resData = result.data;
      setApiData(resData);

      // Update the scenario in context so comparison mode can access the outputs
      if (currentScenario?.scenario_id) {
        updateScenarioOutputs(
          currentScenario.scenario_id,
          resData.technoEconomics,
          resData.financials
        );
      }

      if (resData?.financials?.cashFlowTable?.length) {
        applyTableData(resData.financials.cashFlowTable);
      } else {
        console.warn("No cash flow table in response, using mock data");
        applyTableData(mockCashFlowTable);
      }
    } catch (error) {
      console.error("=== API Error ===");
      console.error("Error:", error.message);
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

  const toFiniteNumber = (val) => (typeof val === "number" && Number.isFinite(val) ? val : null);
  const rawTotalCO2 = toFiniteNumber(apiData?.technoEconomics?.total_co2_emissions);
  const totalCO2Tonnes = rawTotalCO2 !== null ? rawTotalCO2 / 1_000_000 : null;

  // Extract OPEX breakdown from nested object
  const opexBreakdown = apiData?.technoEconomics?.opex_breakdown || {};
  const hydrogenCost = toFiniteNumber(opexBreakdown.hydrogen);
  const electricityCost = toFiniteNumber(opexBreakdown.electricity);
  const feedstockCostValue = toFiniteNumber(opexBreakdown.feedstock);
  const totalIndirectOpexValue = toFiniteNumber(opexBreakdown.indirect_opex);

  // Calculate total direct opex (feedstock + hydrogen + electricity)
  const totalDirectOpex = (feedstockCostValue || 0) + (hydrogenCost || 0) + (electricityCost || 0);

  const annualCapacity = toFiniteNumber(apiData?.technoEconomics?.production) || inputs?.production_capacity || 0;
  const safeCapacity = annualCapacity > 0 ? annualCapacity : null;
  const lcopValue = toFiniteNumber(apiData?.technoEconomics?.lcop ?? apiData?.technoEconomics?.LCOP);
  const totalCapitalInvestment = toFiniteNumber(apiData?.technoEconomics?.total_capital_investment);
  const totalOpexValue = toFiniteNumber(apiData?.technoEconomics?.total_opex);

  // Extract utility consumption from nested object
  const utilityConsumption = apiData?.technoEconomics?.utility_consumption || {};

  // Calculate annualized capital using Capital Recovery Factor (CRF)
  // Note: totalCapitalInvestment is in MUSD from backend, convert to USD for calculations
  const tciInUSD = totalCapitalInvestment !== null ? totalCapitalInvestment * 1_000_000 : null;
  const discountRate = inputs?.discount_factor || 0.07;
  const plantLifetime = inputs?.plant_lifetime || 20;
  const crf = discountRate > 0
    ? (discountRate * Math.pow(1 + discountRate, plantLifetime)) / (Math.pow(1 + discountRate, plantLifetime) - 1)
    : 1 / plantLifetime;
  const annualizedCapital = tciInUSD !== null ? tciInUSD * crf : null;

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

  // Build consumption cards from feedstock_consumption and utility_consumption
  const consumptionCards = [];
  const feedstockConsumption = toFiniteNumber(apiData?.technoEconomics?.feedstock_consumption);
  const hydrogenConsumption = toFiniteNumber(utilityConsumption.hydrogen);
  const electricityConsumption = toFiniteNumber(utilityConsumption.electricity);

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
      unit: "tons/yr",
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

  // Build per-product output details for KPI cards from product_breakdown
  const productBreakdown = apiData?.technoEconomics?.product_breakdown || {};
  const productOutputDetails = Object.entries(productBreakdown).map(([name, amount]) => ({
    label: name,
    value: `${formatNumber(amount, 2)} t/yr`,
  }));

  // Build product CO2 emissions details
  const productCO2Emissions = apiData?.technoEconomics?.product_co2_emissions || {};
  const productCO2Details = Object.entries(productCO2Emissions).map(([name, value]) => ({
    label: name,
    value: `${formatNumber(value, 2)} kg/yr`,
  }));

  // Build product carbon intensity details
  const productCarbonIntensity = apiData?.technoEconomics?.product_carbon_intensity || {};
  const productCarbonIntensityDetails = Object.entries(productCarbonIntensity).map(([name, value]) => ({
    label: name,
    value: `${formatNumber(value, 3)} kgCO₂/t`,
  }));

  // Build product carbon conversion efficiency details
  const productCarbonEfficiency = apiData?.technoEconomics?.product_carbon_conversion_efficiency || {};
  const productCarbonEfficiencyDetails = Object.entries(productCarbonEfficiency).map(([name, value]) => ({
    label: name,
    value: `${formatNumber(value, 2)}%`,
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
          label: "Carbon Intensity (kg CO₂e/t product)",
          value: formatNumber(apiData?.technoEconomics?.carbon_intensity, 3),
          details: productCarbonIntensityDetails,
        },
        {
          label: "Carbon Conversion Efficiency (%)",
          value: formatNumber(apiData?.technoEconomics?.carbon_conversion_efficiency, 2),
          details: productCarbonEfficiencyDetails,
        },
        {
          label: "Total CO₂ Emissions (kg/year)",
          value: formatNumber(rawTotalCO2, 2),
          details: productCO2Details,
        },
      ],
    },
    economicOutputs: {
      title: "Economic Outputs",
      color: "#92400e",
      stats: [
        {
          label: `Total Capital Investment (${currSymbol})`,
          value: formatValue(totalCapitalInvestment !== null ? totalCapitalInvestment * 1_000_000 : null, 2, selectedCurrency),
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
          label: `Total Annual Revenue (${currSymbol}/yr)`,
          value: formatValue(apiData?.technoEconomics?.total_revenue, 2, selectedCurrency),
          details: Object.entries(apiData?.technoEconomics?.product_revenue_breakdown || {}).map(([name, value]) => ({
            label: name.charAt(0).toUpperCase() + name.slice(1), // Capitalize first letter
            value: formatValue(value, 2, selectedCurrency)
          })),
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
          value: apiData?.financials?.payback_period != null ? apiData.financials.payback_period.toFixed(1) : 'N/A',
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
          <div style={{ position: "absolute", right: isLeftPanelCollapsed ? "7px" : "12px", top: "10px", zIndex: 10, width: "30px", height: "30px" }}>
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
          <div className="d-flex flex-column" style={{ flex: 1, height: "100%", minWidth: 0, minHeight: 0, transition: "all 0.3s ease" }}>
            <Card small className="flex-fill d-flex flex-column">
              <CardHeader className="border-bottom d-flex justify-content-between align-items-center p-2">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  
                  {/* ✅ Toggle Switch */}
                  <ButtonGroup size="sm" style={{ boxShadow: "none" }}>
                    <Button 
                      theme={chartView === 'breakeven' ? "primary" : "white"} 
                      onClick={() => setChartView('breakeven')}
                      style={{ 
                          backgroundColor: chartView === 'breakeven' ? colors.oxfordBlue : '#fff',
                          borderColor: colors.oxfordBlue,
                          color: chartView === 'breakeven' ? '#fff' : colors.oxfordBlue 
                      }}
                    >
                      Cash Flow
                    </Button>
                    <Button 
                      theme={chartView === 'lcop' ? "primary" : "white"} 
                      onClick={() => setChartView('lcop')}
                      style={{ 
                          backgroundColor: chartView === 'lcop' ? colors.oxfordBlue : '#fff',
                          borderColor: colors.oxfordBlue,
                          color: chartView === 'lcop' ? '#fff' : colors.oxfordBlue 
                      }}
                    >
                      Cost Breakdown
                    </Button>
                  </ButtonGroup>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <h6 className="m-0" style={{ fontSize: "0.95rem", fontWeight: "700", letterSpacing: "0.5px" }}>
                      {chartView === 'breakeven' ? "Breakeven Analysis" : "Levelized Cost of Production"}
                    </h6>
                    <small style={{ fontSize: '0.7rem', fontWeight: 400, color: colors.textSecondary }}>
                      {chartView === 'breakeven' 
                        ? "Cumulative discounted cash flow across project lifetime." 
                        : "Breakdown of production costs per unit."}
                    </small>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  {/* Cash Flow Table Button - only for breakeven view */}
                  {chartView === 'breakeven' && (
                    <Button
                      size="sm" className="table-icon-btn"
                      style={{ backgroundColor: colors.oxfordBlue, borderColor: colors.oxfordBlue, color: "#fff", padding: "0.3rem 0.75rem", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease", position: "relative" }}
                      onClick={() => setOpenTable(true)} title="Cash Flow Table"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ display: "block" }}>
                        <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm15 2h-4v3h4V4zm0 4h-4v3h4V8zm0 4h-4v3h3a1 1 0 0 0 1-1v-2zm-5 3v-3H6v3h4zm-5 0v-3H1v2a1 1 0 0 0 1 1h3zm-4-4h4V8H1v3zm0-4h4V4H1v3zm5-3v3h4V4H6zm4 4H6v3h4V8z"/>
                      </svg>
                    </Button>
                  )}

                  {/* Compare Scenarios Dropdown - available for both chart views */}
                  <CompareDropdown
                    scenarios={scenarios}
                    currentScenario={currentScenario}
                    comparisonScenarios={comparisonScenarios}
                    toggleComparisonScenario={toggleComparisonScenario}
                    clearComparison={clearComparison}
                    colors={colors}
                  />
                </div>
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
        <div style={{ width: "300px", minWidth: "300px", maxWidth: "300px", height: "calc(100% - 12px)", minHeight: 0, display: "flex", flexDirection: "column", gap: "12px", marginBottom: "8px" }}>
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
