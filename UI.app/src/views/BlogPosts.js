import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Badge,
  FormSelect,
} from "shards-react";
import PageTitle from "../components/common/PageTitle";
import axios from "axios";

const BlogPosts = ({ inputs, TCI_2023, selectedProcess, selectedFeedstock }) => {
  const [apiData, setApiData] = useState(null);
  const [table, setTable] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchData = async () => {
      try {
        const payload = {
          inputs: inputs,
          process_technology: selectedProcess,
          feedstock: selectedFeedstock,
          TCI_2023: TCI_2023
        };

        const res = await axios.post("http://127.0.0.1:8000/calculate", payload, { signal });
        setApiData(res.data);
      } catch (error) {
        if (axios.isCancel(error)) {
          console.log('Request canceled:', error.message);
        } else {
          console.error("Error fetching data:", error);
        }
      }
    };

    fetchData();

    return () => {
      // Cleanup function to abort the request
      controller.abort();
    };
  }, [inputs, TCI_2023, selectedProcess, selectedFeedstock]);

  useEffect(() => {
    if (apiData && apiData.financials && apiData.financials.cashFlowTable) {
      setTable(apiData.financials.cashFlowTable);
    }
  }, [apiData]);

  // Data for SmallStats
  const smallStats = [
    {
      label: "Total Capital Investment (TCI) ($)",
      // The original line was: value: apiData ? apiData.technoEconomics.TCI : "Loading...",
      // The updated line checks if apiData and technoEconomics are defined before accessing TCI
      value: apiData && apiData.technoEconomics ? apiData.technoEconomics.TCI : "Loading...",
      attrs: { md: "6", sm: "6" },
      chart: {
        labels: ["Label"],
        data: [0],
      },
    },
    {
      label: "Net Present Value (NPV) ($)",
      // The original line was: value: apiData ? apiData.financials.npv : "Loading...",
      // The updated line checks if apiData and financials are defined before accessing npv
      value: apiData && apiData.financials ? apiData.financials.npv : "Loading...",
      attrs: { md: "6", sm: "6" },
      chart: {
        labels: ["Label"],
        data: [0],
      },
    },
    {
      label: "Internal Rate of Return (IRR) (%)",
      // The original line was: value: apiData ? apiData.financials.irr : "Loading...",
      // The updated line checks if apiData and financials are defined before accessing irr
      value: apiData && apiData.financials ? apiData.financials.irr : "Loading...",
      attrs: { md: "6", sm: "6" },
      chart: {
        labels: ["Label"],
        data: [0],
      },
    },
    {
      label: "Payback Period (years)",
      // The original line was: value: apiData ? apiData.financials.paybackPeriod : "Loading...",
      // The updated line checks if apiData and financials are defined before accessing paybackPeriod
      value: apiData && apiData.financials ? apiData.financials.paybackPeriod : "Loading...",
      attrs: { md: "6", sm: "6" },
      chart: {
        labels: ["Label"],
        data: [0],
      },
    },
  ];

  return (
    <Container fluid className="main-content-container px-4">
      <Row noGutters className="page-header py-4">
        <PageTitle
          sm="4"
          title="Techno-Economic Analysis"
          subtitle="Dashboard"
          className="text-sm-left"
        />
      </Row>

      <Row>
        {smallStats.map((stats, idx) => (
          <Col className="col-lg mb-4" {...stats.attrs} key={idx}>
            <Card small className="card-post card-post--1">
              <div
                className="card-post__image"
                style={{
                  backgroundImage:
                    "url('https://c4.wallpaperflare.com/wallpaper/47/1000/989/digital-art-artwork-futuristic-city-city-wallpaper-preview.jpg')",
                }}
              >
                <Badge
                  pill
                  className={`card-post__category bg-${
                    stats.label === "Total Capital Investment (TCI) ($)" ||
                    stats.label === "Net Present Value (NPV) ($)"
                      ? "info"
                      : "danger"
                  }`}
                >
                  {stats.label}
                </Badge>
              </div>
              <CardBody>
                <h5 className="card-title text-center text-light">
                  <a href="#npv" className="text-light">
                    {stats.value}
                  </a>
                </h5>
              </CardBody>
            </Card>
          </Col>
        ))}
      </Row>



      <Row>
        <Col lg="9" md="12">
          <Card small className="mb-4">
            <CardHeader className="border-bottom">
              <h6 className="m-0">Cash Flow Table</h6>
            </CardHeader>
            <CardBody className="p-0 pb-3">
              <table className="table mb-0">
                <thead className="bg-light">
                  <tr>
                    <th scope="col" className="border-0">
                      Year
                    </th>
                    <th scope="col" className="border-0">
                      Cash Inflow ($)
                    </th>
                    <th scope="col" className="border-0">
                      Cash Outflow ($)
                    </th>
                    <th scope="col" className="border-0">
                      Net Cash Flow ($)
                    </th>
                    <th scope="col" className="border-0">
                      Cumulative Net Cash Flow ($)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {table.map((row, index) => (
                    <tr key={index}>
                      <td>{row.year}</td>
                      <td>{row.cashInflow}</td>
                      <td>{row.cashOutflow}</td>
                      <td>{row.netCashFlow}</td>
                      <td>{row.cumulativeNetCashFlow}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
            <CardFooter className="border-top text-right">
              {/* Links here if needed */}
            </CardFooter>
          </Card>
        </Col>
      </Row>

     
    </Container>
  );
};

export default BlogPosts;