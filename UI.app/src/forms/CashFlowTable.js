import React from "react";
import PropTypes from "prop-types";
import {
  Card,
  CardHeader,
  CardBody
} from "shards-react";

const CashFlowTable = ({ tableData }) => (
  <Card small className="mb-4">
    <CardHeader className="border-bottom">
      <h6 className="m-0">Cash Flow Table</h6>
    </CardHeader>
    <CardBody>
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
          {tableData.map((row) => (
            <tr key={row.Year}>
              <td>{row.Year}</td>
              <td>{row.Revenue.toFixed(2)}</td>
              <td>{row.OPEX.toFixed(2)}</td>
              <td>{row["Net Cash Flow"].toFixed(2)}</td>
              <td>{row["Discount Factor"].toFixed(4)}</td>
              <td>{row["Present Value"].toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </CardBody>
  </Card>
);

CashFlowTable.propTypes = {
  tableData: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default CashFlowTable;