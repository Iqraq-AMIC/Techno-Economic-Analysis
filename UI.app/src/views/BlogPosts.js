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
  ModalHeader,
  ModalFooter,
} from "shards-react";
import PageTitle from "../components/common/PageTitle";
import axios from "axios";
import BreakevenBarChart from "../components/charts/BreakevenBarChart";

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

const BlogPosts = ({ inputs, TCI_2023, selectedProcess, selectedFeedstock }) => {
  const [apiData, setApiData] = useState(null);
  const [table, setTable] = useState(mockCashFlowTable);
  const [openTable, setOpenTable] = useState(false); // ✅ modal state

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchData = async () => {
      try {
        const payload = {
          inputs,
          process_technology: selectedProcess,
          feedstock: selectedFeedstock,
          TCI_2023,
        };

        const res = await axios.post("http://127.0.0.1:8000/calculate", payload, { signal });
        setApiData(res.data);

        if (res.data?.financials?.cashFlowTable?.length) {
          setTable(res.data.financials.cashFlowTable);
        }
      } catch (error) {
        console.warn("Backend failed, using mock data");
        setTable(mockCashFlowTable);
      }
    };

    fetchData();
    return () => controller.abort();
  }, [inputs, TCI_2023, selectedProcess, selectedFeedstock]);

  // ✅ Chart data
  const chartData = table.map((row) => ({
    "Plant Lifetime": row.year,
    "Present Value": row.presentValue ?? row.netCashFlow,
  }));

  const smallStats = [
    {
      label: "Total Capital Investment (TCI) ($)",
      value: apiData?.technoEconomics?.TCI ?? "Loading...",
    },
    {
      label: "Net Present Value (NPV) ($)",
      value: apiData?.financials?.npv ?? "Loading...",
    },
    {
      label: "Internal Rate of Return (IRR) (%)",
      value: apiData?.financials?.irr ?? "Loading...",
    },
    {
      label: "Payback Period (years)",
      value: apiData?.financials?.paybackPeriod ?? "Loading...",
    },
  ];

  return (
    <Container fluid className="main-content-container px-4">
      {/* Header */}
      <Row noGutters className="page-header py-4">
        <PageTitle
          sm="4"
          title="Techno-Economic Analysis"
          subtitle="Dashboard"
          className="text-sm-left"
        />
      </Row>

      {/* Main Content Row */}
      <Row>
        {/* Chart in the center */}
        <Col lg="9" md="12">
          <Card small className="mb-4 h-100">
            <CardHeader className="border-bottom d-flex justify-content-between align-items-center">
              <h6 className="m-0">Breakeven Analysis</h6>
              <Button size="sm" theme="primary" onClick={() => setOpenTable(true)}>
                View Cash Flow Table
              </Button>
            </CardHeader>
            <CardBody>
              <BreakevenBarChart data={chartData} />
            </CardBody>
          </Card>
        </Col>

        {/* KPI cards stacked on the right */}
        <Col lg="3" md="12" className="d-flex flex-column">
          {smallStats.map((stats, idx) => (
            <Card small className="flex-fill mb-3" key={idx}>
              <CardHeader className="border-bottom text-center p-2">
                <h6 className="m-0">{stats.label}</h6>
              </CardHeader>
              <CardBody className="d-flex align-items-center justify-content-center">
                <h5>{stats.value}</h5>
              </CardBody>
            </Card>
          ))}
        </Col>
      </Row>

      {/* ✅ Modal for Cash Flow Table */}
      <Modal open={openTable} toggle={() => setOpenTable(!openTable)} size="lg">
        <ModalHeader>Cash Flow Table</ModalHeader>
        <ModalBody>
          <table className="table mb-0">
            <thead className="bg-light">
              <tr>
                <th>Year</th>
                <th>Cash Inflow ($)</th>
                <th>Cash Outflow ($)</th>
                <th>Net Cash Flow ($)</th>
                <th>Present Value ($)</th>
              </tr>
            </thead>
            <tbody>
              {table.map((row, index) => (
                <tr key={index}>
                  <td>{row.year}</td>
                  <td>{row.cashInflow}</td>
                  <td>{row.cashOutflow}</td>
                  <td>{row.netCashFlow}</td>
                  <td>{row.presentValue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ModalBody>
        <ModalFooter>
          <Button theme="secondary" onClick={() => setOpenTable(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </Container>
  );
};

export default BlogPosts;
