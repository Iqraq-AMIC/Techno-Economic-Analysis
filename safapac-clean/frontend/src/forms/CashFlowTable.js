import React from "react";
import PropTypes from "prop-types";
import { Card, CardHeader, CardBody, Button, ButtonGroup } from "shards-react";

// ✅ helper for formatting numbers with commas
const formatNumber = (num, decimals = 2) => {
  if (num === null || num === undefined || isNaN(num)) return "-";
  return Number(num).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const CashFlowTable = ({ tableData }) => {
  // Export as CSV
  const exportAsCSV = () => {
    const headers = [
      "Year",
      "Capital Investment (USD)",
      "Depreciation (USD)",
      "Remaining value of Plant (USD)",
      "Revenue (USD)",
      "Loan Payment (USD)",
      "Manufacturing Cost (USD)",
      "Income tax (USD)",
      "After tax net profit (USD)",
      "After-Tax Cash flow (USD)",
      "CNDCF (USD)",
      "P/(P/F,I,n)",
      "DCF (USD)",
      "CDCF (USD)"
    ];
    const csvContent = [
      headers.join(","),
      ...tableData.map(row => [
        row.Year ?? row.year ?? 0,
        row["Capital Investment (USD)"] ?? 0,
        row["Depreciation (USD)"] ?? 0,
        row["Remaining value of Plant (USD)"] ?? 0,
        row["Revenue (USD)"] ?? 0,
        row["Loan Payment (USD)"] ?? 0,
        row["Manufacturing Cost (USD)"] ?? 0,
        row["Income Tax (USD)"] ?? 0,
        row["After-Tax Net Profit (USD)"] ?? 0,
        row["After-Tax Cash Flow (USD)"] ?? 0,
        row["After-Tax Cash Flow (USD)"] ?? 0, // CNDCF (same as cash flow)
        row["Discount Factor"] ?? 0,
        row["DCF (USD)"] ?? 0,
        row["Cumulative DCF (USD)"] ?? 0
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.download = "cashflow_table.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Export as JSON
  const exportAsJSON = () => {
    const jsonContent = JSON.stringify(tableData, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cashflow_table.json";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
  <Card small className="mb-4">
    <CardHeader className="border-bottom d-flex justify-content-between align-items-center">
      <h6 className="m-0">Cash Flow Table</h6>
      <ButtonGroup size="sm">
        <Button theme="secondary" onClick={exportAsCSV}>
          Export CSV
        </Button>
        <Button theme="secondary" onClick={exportAsJSON}>
          Export JSON
        </Button>
      </ButtonGroup>
    </CardHeader>
    <CardBody style={{ overflowX: "auto" }}>
      {/* ✅ limit visible rows (~7 rows, adjust height as needed) */}
      <div style={{ maxHeight: "400px", overflowY: "auto", overflowX: "auto" }}>
        <table className="table mb-0" style={{ fontSize: "0.85rem" }}>
          <thead className="bg-light" style={{ position: "sticky", top: 0, zIndex: 1 }}>
            <tr>
              <th scope="col" className="border-0" style={{ minWidth: "60px" }}>Year</th>
              <th scope="col" className="border-0" style={{ minWidth: "150px" }}>Capital Investment (USD)</th>
              <th scope="col" className="border-0" style={{ minWidth: "140px" }}>Depreciation (USD)</th>
              <th scope="col" className="border-0" style={{ minWidth: "180px" }}>Remaining value of Plant (USD)</th>
              <th scope="col" className="border-0" style={{ minWidth: "140px" }}>Revenue (USD)</th>
              <th scope="col" className="border-0" style={{ minWidth: "140px" }}>Loan Payment (USD)</th>
              <th scope="col" className="border-0" style={{ minWidth: "180px" }}>Manufacturing Cost (USD)</th>
              <th scope="col" className="border-0" style={{ minWidth: "150px" }}>Income tax (USD)</th>
              <th scope="col" className="border-0" style={{ minWidth: "160px" }}>After tax net profit (USD)</th>
              <th scope="col" className="border-0" style={{ minWidth: "160px" }}>After-Tax Cash flow (USD)</th>
              <th scope="col" className="border-0" style={{ minWidth: "120px" }}>CNDCF (USD)</th>
              <th scope="col" className="border-0" style={{ minWidth: "100px" }}>P/(P/F,I,n)</th>
              <th scope="col" className="border-0" style={{ minWidth: "120px" }}>DCF (USD)</th>
              <th scope="col" className="border-0" style={{ minWidth: "140px", fontWeight: "bold" }}>CDCF (USD)</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, idx) => {
              const year = row.Year ?? row.year ?? idx;
              const cumulDCF = row["Cumulative DCF (USD)"] ?? row.cumulativeDCF ?? 0;
              const isNegative = cumulDCF < 0;

              // Calculate remaining plant value (TCI - accumulated depreciation)
              // Note: This is a placeholder - backend should provide this
              const remainingValue = row["Remaining value of Plant (USD)"] ?? 0;

              // CNDCF appears to be the same as After-Tax Cash Flow based on the image
              const cndcf = row["After-Tax Cash Flow (USD)"] ?? 0;

              return (
                <tr key={idx} style={{ backgroundColor: year < 1 ? "#f8f9fa" : "white" }}>
                  <td style={{ fontWeight: year === 0 ? "bold" : "normal" }}>{year}</td>
                  <td>{formatNumber(row["Capital Investment (USD)"] ?? 0)}</td>
                  <td>{formatNumber(row["Depreciation (USD)"] ?? 0)}</td>
                  <td>{formatNumber(remainingValue)}</td>
                  <td>{formatNumber(row["Revenue (USD)"] ?? 0)}</td>
                  <td>{formatNumber(row["Loan Payment (USD)"] ?? 0)}</td>
                  <td>{formatNumber(row["Manufacturing Cost (USD)"] ?? 0)}</td>
                  <td>{formatNumber(row["Income Tax (USD)"] ?? 0)}</td>
                  <td>{formatNumber(row["After-Tax Net Profit (USD)"] ?? 0)}</td>
                  <td>{formatNumber(row["After-Tax Cash Flow (USD)"] ?? 0)}</td>
                  <td>{formatNumber(cndcf)}</td>
                  <td>{formatNumber(row["Discount Factor"] ?? 0, 4)}</td>
                  <td>{formatNumber(row["DCF (USD)"] ?? 0)}</td>
                  <td style={{
                    fontWeight: "bold",
                    color: isNegative ? "#c4183c" : "#17c671"
                  }}>
                    {formatNumber(cumulDCF)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </CardBody>
  </Card>
  );
};

CashFlowTable.propTypes = {
  tableData: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default CashFlowTable;
