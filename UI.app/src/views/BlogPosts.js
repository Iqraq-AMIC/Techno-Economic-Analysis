import React, { useState, useEffect } from "react";
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

const BlogPosts = ({ selectedCurrency = "USD" }) => {
  const [inputs, setInputs] = useState({
    production_capacity: 5000,
    feedstock_price: 250,
    hydrogen_price: 2.5,
    electricity_rate: 0.12,
    feedstock_carbon_intensity: 50,
    product_energy_content: 43,
    feedstock_carbon_content: 0.5,
    product_price: 2750,
    plant_lifetime: 25,
    discount_factor: 0.105,
    land_cost: 1026898.876,
  });

  // Start with empty strings - will be populated by BiofuelForm when it loads from API
  const [selectedProcess, setSelectedProcess] = useState("FT-BtL");
  const [selectedFeedstock, setSelectedFeedstock] = useState("MSW");

  const [apiData, setApiData] = useState(null);
  const [table, setTable] = useState(mockCashFlowTable);
  const [openTable, setOpenTable] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({
    financial: false,
    production: false,
    cost: false,
    environmental: false,
  });
  const API_URL = process.env.REACT_APP_API_URL;

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
      return {
        financial: false,
        production: false,
        cost: false,
        environmental: false,
        [groupKey]: true,
      };
    });
  };

  const handleSliderChange = (key) => (vals) => {
    setInputs((prev) => ({
      ...prev,
      [key]: Number(vals[0]),
    }));
  };

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchData = async () => {
      try {
        const payload = {
          inputs,
          process_technology: selectedProcess,
          feedstock: selectedFeedstock,
        };
        console.log("=== API Request ===");
        console.log("API_URL:", API_URL);
        console.log("Payload:", payload);

        const res = await axios.post(`${API_URL}/calculate`, payload, { signal });

        console.log("=== API Response ===");
        console.log("Status:", res.status);
        console.log("Full response data:", res.data);
        console.log("Has financials?", res.data?.financials);
        console.log("Has error?", res.data?.error);
        console.log("Cash Flow Table length:", res.data?.financials?.cashFlowTable?.length);
        console.log("First 3 rows:", res.data?.financials?.cashFlowTable?.slice(0, 3));

        setApiData(res.data);

        if (res.data?.error) {
          console.error("❌ Backend returned error:", res.data.error);
          setTable(mockCashFlowTable);
        } else if (res.data?.financials?.cashFlowTable?.length) {
          setTable(res.data.financials.cashFlowTable);
          console.log("✓ Table updated with", res.data.financials.cashFlowTable.length, "rows of API data");
        } else {
          console.warn("⚠ No cash flow table in response, using mock data");
          console.warn("Response structure:", Object.keys(res.data));
          setTable(mockCashFlowTable);
        }
      } catch (error) {
        console.error("=== API Error ===");
        console.error("Error:", error.message);
        console.warn("⚠ Using mock cash flow table");
        setTable(mockCashFlowTable);
      }
    };

    fetchData();
    return () => controller.abort();
  }, [inputs, selectedProcess, selectedFeedstock, API_URL]);

  const chartData = table.map((row, i) => ({
    "Year": row.Year ?? row.year ?? i,
    "Cumulative DCF (USD)": Number.isFinite(row["Cumulative DCF (USD)"])
      ? row["Cumulative DCF (USD)"]
      : Number.isFinite(row.presentValue ?? row["Present Value"])
      ? (row.presentValue ?? row["Present Value"])
      : Number.isFinite(row.netCashFlow ?? row["Net Cash Flow"])
      ? (row.netCashFlow ?? row["Net Cash Flow"])
      : 0,
  }));

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
  const kpiGroups = {
    financial: {
      title: "Financial Metrics",
      color: "#07193D",
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
          label: "Carbon Intensity (gCO₂/MJ)",
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
  };

  return (
    <Container fluid className="main-content-container px-2">
      {/* Main Layout */}
      <Row>
        {/* Left Form */}
        <Col lg="3" md="12" className="mb-3" style={{ height: "calc(100vh - 100px)" }}>
          <BiofuelForm
            inputs={inputs}
            handleSliderChange={handleSliderChange}
            onProcessChange={setSelectedProcess}
            onFeedstockChange={setSelectedFeedstock}
          />
        </Col>

        {/* Right: Chart + KPIs Side by Side */}
        <Col lg="9" md="12">
          <Row>
            {/* Chart - 9 columns */}
            <Col lg="9" md="12" className="d-flex flex-column" style={{ height: "calc(100vh - 100px)" }}>
              <Card small className="flex-fill d-flex flex-column">
                <CardHeader className="border-bottom d-flex justify-content-between align-items-center p-2">
                  <h6 className="m-0" style={{ fontSize: "0.85rem", fontWeight: "600" }}>Breakeven Analysis</h6>
                  <Button
                    size="sm"
                    style={{ backgroundColor: "#07193D", borderColor: "#07193D", color: "#fff" }}
                    onClick={() => setOpenTable(true)}
                  >
                    Cash Flow Table
                  </Button>
                </CardHeader>
                <CardBody className="flex-fill" style={{ padding: "10px", minHeight: 0 }}>
                  <BreakevenBarChart data={chartData} />
                </CardBody>
              </Card>
            </Col>

            {/* KPI Cards - 3 columns, scrollable */}
            <Col lg="3" md="12">
              <div style={{ maxHeight: "calc(100vh - 100px)", overflowY: "auto", overflowX: "hidden" }}>
                {/* KPI Cards Grid - Grouped by Context with Collapsible Sections */}
                {Object.entries(kpiGroups).map(([groupKey, group]) => (
                  <div key={groupKey} className="mb-2">
                    {/* Section Header - Clickable to expand/collapse */}
                    <div
                      onClick={() => toggleGroup(groupKey)}
                      style={{
                        backgroundColor: "#fff",
                        padding: "8px 12px",
                        borderRadius: "4px",
                        border: `2px solid ${group.color}`,
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
                        {group.stats.map((stat, idx) => (
                          <Card small className="mb-2" key={idx}>
                            <CardHeader
                              className="border-bottom p-2"
                              style={{
                                borderLeftColor: group.color,
                                borderLeftWidth: "3px",
                                borderLeftStyle: "solid"
                              }}
                            >
                              <h6 className="m-0" style={{ fontSize: "0.7rem", fontWeight: "600", lineHeight: "1.2" }}>
                                {stat.label}
                              </h6>
                            </CardHeader>
                            <CardBody className="d-flex align-items-center justify-content-center p-2">
                              <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "#1f2937" }}>
                                {stat.value}
                              </div>
                            </CardBody>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Col>
          </Row>
        </Col>
      </Row>

      {/* Cash Flow Modal */}
      <Modal open={openTable} toggle={() => setOpenTable(!openTable)} size="lg">
        <ModalBody>
          <CashFlowTable tableData={table} />
        </ModalBody>
      </Modal>
    </Container>
  );
};

export default BlogPosts;
