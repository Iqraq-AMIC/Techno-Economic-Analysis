import React, { useState } from "react";
import PropTypes from "prop-types";
import { Container, Row, Col } from "shards-react";
import axios from "axios";

import MainNavbar from "../components/layout/MainNavbar/MainNavbar";
import MainFooter from "../components/layout/MainFooter";   // ✅ keep only this footer
import BiofuelForm from "../forms/BiofuelForm";

// Helper function for sliders
const handleSliderChange = (setter, key) => (vals) => {
  setter((prev) => ({
    ...prev,
    [key]: Number(vals[0]),
  }));
};

const DefaultLayout = ({ children, noNavbar, noFooter }) => {
  const [inputs, setInputs] = useState({
    production_capacity: 5000,
    CEPCI: 750,
    biomass_price: 250,
    hydrogen_price: 5.5,
    electricity_rate: 0.275,
    yearly_wage_operator: 100000,
    product_price: 2750,
    land_cost: 2550000,
    plant_lifetime: 25,
    discount_factor: 0.105,
  });

  const [TCI_2023, setTCI_2023] = useState(2500000);
  const [selectedProcess, setSelectedProcess] = useState("Fischer-Tropsch");
  const [selectedFeedstock, setSelectedFeedstock] = useState("Palm Kernel Shell");

  const onProcessChange = (process) => setSelectedProcess(process);
  const onFeedstockChange = (feedstock) => setSelectedFeedstock(feedstock);

  const handleCalculate = () => {
    const finalData = {
      inputs,
      TCI_2023,
      process_technology: selectedProcess,
      feedstock: selectedFeedstock,
    };

    console.log("Sending data to backend:", finalData);

    axios
      .post("http://127.0.0.1:8000/calculate", finalData)
      .then((res) => console.log("Backend response:", res.data))
      .catch((err) => console.error("Error:", err));
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      {/* Main content wrapper */}
      <Container fluid className="flex-grow-1">
        <Row>
          <Col className="main-content p-0" lg="12" md="12" sm="12" tag="main">
            {!noNavbar && <MainNavbar />}

            <Row>
              {/* LEFT SIDE → Biofuel Selector & User Inputs */}
              <Col lg="3" md="12">
                <BiofuelForm
                  inputs={inputs}
                  TCI_2023={TCI_2023}
                  handleSliderChange={(key) => handleSliderChange(setInputs, key)}
                  setTCI_2023={setTCI_2023}
                  handleCalculate={handleCalculate}
                  onProcessChange={onProcessChange}
                  onFeedstockChange={onFeedstockChange}
                  selectedProcess={selectedProcess}
                  selectedFeedstock={selectedFeedstock}
                />
              </Col>

              {/* RIGHT SIDE → Dashboard */}
              <Col lg="9" md="12" className="pb-4">
                {React.cloneElement(children, {
                  inputs,
                  TCI_2023,
                  selectedProcess,
                  selectedFeedstock,
                })}
              </Col>
            </Row>
          </Col>
        </Row>
      </Container>

      {/* ✅ Footer fixed, thin, and aligned right */}
      {!noFooter && (
        <MainFooter
          contained={false}
          copyright="Copyright © 2025 Aerospace Malaysia Innovation Centre"
        />
      )}
    </div>
  );
};

DefaultLayout.propTypes = {
  noNavbar: PropTypes.bool,
  noFooter: PropTypes.bool,
};

DefaultLayout.defaultProps = {
  noNavbar: true,
  noFooter: false,
};

export default DefaultLayout;
