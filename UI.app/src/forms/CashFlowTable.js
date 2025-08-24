import React from "react";
import PropTypes from "prop-types";
import { Card, CardHeader, CardBody } from "shards-react";

// ✅ helper for formatting numbers with commas
const formatNumber = (num, decimals = 2) => {
  if (num === null || num === undefined || isNaN(num)) return "-";
  return Number(num).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const CashFlowTable = ({ tableData }) => (
  <Card small className="mb-4">
    <CardHeader className="border-bottom">
      <h6 className="m-0">Cash Flow Table</h6>
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

CashFlowTable.propTypes = {
  tableData: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default CashFlowTable;
