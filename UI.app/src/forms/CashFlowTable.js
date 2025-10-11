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
    const headers = ["Year", "Revenue ($)", "OPEX ($)", "Net Cash Flow ($)", "Discount Factor", "Present Value ($)"];
    const csvContent = [
      headers.join(","),
      ...tableData.map(row => [
        row.Year ?? row.year ?? 0,
        row.Revenue ?? row.revenue ?? 0,
        row.OPEX ?? row.opex ?? 0,
        row["Net Cash Flow"] ?? row.netCashFlow ?? 0,
        row["Discount Factor"] ?? row.discountFactor ?? 0,
        row["Present Value"] ?? row.presentValue ?? 0
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
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
      <div style={{ maxHeight: "350px", overflowY: "auto" }}>
        <table className="table mb-0">
          <thead className="bg-light">
            <tr>
              <th scope="col" className="border-0">Year</th>
              <th scope="col" className="border-0">Revenue ($)</th>
              <th scope="col" className="border-0">OPEX ($)</th>
              <th scope="col" className="border-0">Net Cash Flow ($)</th>
              <th scope="col" className="border-0">Discount Factor</th>
              <th scope="col" className="border-0">Present Value ($)</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, idx) => (
              <tr key={idx}>
                <td>{row.Year ?? row.year ?? idx}</td>
                <td>{formatNumber(row.Revenue ?? row.revenue)}</td>
                <td>{formatNumber(row.OPEX ?? row.opex)}</td>
                <td>{formatNumber(row["Net Cash Flow"] ?? row.netCashFlow)}</td>
                <td>{formatNumber(row["Discount Factor"] ?? row.discountFactor, 6)}</td>
                <td>{formatNumber(row["Present Value"] ?? row.presentValue)}</td>
              </tr>
            ))}
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
