import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Container, Row, Col, Button, Collapse } from "shards-react";

import PageTitle from "../components/common/PageTitle";
import SmallStats from "../components/common/SmallStats";
import UsersOverview from "../components/blog/UsersOverview";
import CashFlowTable from "../forms/CashFlowTable"; // Import the CashFlowTable component

const BlogOverview = () => {
  const [cashFlowData, setCashFlowData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false); // for collapsible

  // Mock API data (replace with real backend call later)
  const apiData = {
    financials: {
      cashFlowTable: [
        {
          Year: 0,
          Revenue: 0.0,
          OPEX: 0.0,
          "Net Cash Flow": -9366010.24,
          "Discount Factor": 1.0,
          "Present Value": -9366010.24,
        },
        {
          Year: 1,
          Revenue: 395114500.0,
          OPEX: 80187404.0,
          "Net Cash Flow": 305561085.75,
          "Discount Factor": 0.91,
          "Present Value": 277782805.23,
        },
        {
          Year: 2,
          Revenue: 395114500.0,
          OPEX: 80187404.0,
          "Net Cash Flow": 305561085.75,
          "Discount Factor": 0.83,
          "Present Value": 252530192.53,
        },
        // add more rows from backend later...
      ],
    },
  };

  // Convert cashflow table → chart data
  const cashflowToChart = (cashFlowTable) => {
    if (!cashFlowTable.length)
      return { labels: [], datasets: [], breakevenYear: null, finalValue: 0 };

    const labels = cashFlowTable.map((row) => row.Year);
    const presentValues = cashFlowTable.map((row) => row["Present Value"]);

    // cumulative PV
    let cumulative = 0;
    const cumulativePV = presentValues.map((pv) => {
      cumulative += pv;
      return cumulative;
    });

    // breakeven index
    const breakevenIndex = cumulativePV.findIndex((val) => val >= 0);

    return {
      labels,
      datasets: [
        {
          label: "Cumulative PV",
          data: cumulativePV,
          fill: false,
          borderColor: "#007bff",
          borderWidth: 2,
          pointRadius: labels.map((_, i) => (i === breakevenIndex ? 6 : 0)),
          pointBackgroundColor: labels.map((_, i) =>
            i === breakevenIndex ? "red" : "transparent"
          ),
        },
      ],
      breakevenYear: breakevenIndex >= 0 ? labels[breakevenIndex] : null,
      finalValue: cumulativePV[cumulativePV.length - 1],
    };
  };

  useEffect(() => {
    // Simulate backend call
    setTimeout(() => {
      setCashFlowData(apiData.financials.cashFlowTable);
      setLoading(false);
    }, 1000);
  }, []);

  const chart = cashflowToChart(cashFlowData);

  return (
    <Container fluid className="main-content-container px-4">
      {/* Page Header */}
      <Row noGutters className="page-header py-4">
        <PageTitle
          title="Plant Lifetime"
          subtitle="Dashboard"
          className="text-sm-left mb-3"
        />
      </Row>

      {/* Small Stats Block with Cashflow Chart */}
      <Row>
        {cashFlowData.length > 0 && (
          <Col lg="12" md="12" sm="12" className="mb-4">
            <SmallStats
              id="cashflow-stats"
              variation="1"
              chartData={chart.datasets}
              chartLabels={chart.labels}
              label="Cumulative PV"
              value={`$${(chart.finalValue / 1e6).toFixed(2)}M`}
              percentage={
                chart.breakevenYear
                  ? `Breakeven: Year ${chart.breakevenYear}`
                  : "No Breakeven"
              }
              increase={chart.breakevenYear !== null}
            />
          </Col>
        )}
      </Row>

      {/* Users Overview (still here if needed) */}
      <Row>
        <Col lg="12" md="12" sm="12" className="mb-4">
          <UsersOverview />
        </Col>
      </Row>

      {/* Toggle Button for Cash Flow Table */}
      <Row>
        <Col lg="12" md="12" sm="12" className="mb-2 text-right">
          <Button theme="primary" onClick={() => setOpen(!open)}>
            {open ? "Hide Cash Flow Table" : "Show Cash Flow Table"}
          </Button>
        </Col>
      </Row>

      {/* Collapsible Cash Flow Table */}
      <Collapse open={open}>
        <Row>
          <Col lg="12" md="12" sm="12" className="mb-4">
            {loading ? (
              <p>Loading cash flow data...</p>
            ) : (
              <CashFlowTable tableData={cashFlowData} />
            )}
          </Col>
        </Row>
      </Collapse>
    </Container>
  );
};

BlogOverview.propTypes = {
  smallStats: PropTypes.array,
};

BlogOverview.defaultProps = {
  smallStats: [],
};

export default BlogOverview;
