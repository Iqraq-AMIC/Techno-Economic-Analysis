import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import {
  Card,
  CardHeader,
  CardBody,
  Form,
  FormGroup,
  FormInput,
  FormSelect,
  Slider,
  Row,
  Col,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "shards-react";

// ✅ Number formatter with commas + decimals
const formatNumber = (num, decimals = 0) => {
  if (num === null || num === undefined || isNaN(num)) return "-";
  return Number(num).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const BiofuelForm = ({
  inputs,
  handleSliderChange,
  onProcessChange,
  onFeedstockChange,
}) => {
  const [processes, setProcesses] = useState([]);
  const [feedstocks, setFeedstocks] = useState([]);
  const [countries, setCountries] = useState([]);
  const [selectedProcess, setSelectedProcess] = useState("");
  const [selectedFeedstock, setSelectedFeedstock] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("Malaysia");
  const [showDataNotAvailableModal, setShowDataNotAvailableModal] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL;
  // 🔹 Fetch processes
useEffect(() => {
  axios.get(`${API_URL}/processes`)
    .then(res => setProcesses(res.data))
    .catch(err => console.error("Failed to fetch processes:", err));
}, [API_URL]);

  // 🔹 Fetch countries
  useEffect(() => {
    const countriesList = [
      "Malaysia", "United States", "Canada", "United Kingdom", "Germany", "France",
      "Italy", "Spain", "Netherlands", "Sweden", "Norway", "Denmark",
      "Finland", "Australia", "New Zealand", "Japan", "South Korea",
      "China", "India", "Brazil", "Mexico", "Argentina", "Chile",
      "South Africa", "Nigeria", "Kenya", "Egypt", "Thailand",
      "Indonesia", "Singapore", "Philippines"
    ];
    setCountries(countriesList);
  }, []);

  // 🔹 Fetch feedstocks when process selected
  useEffect(() => {
    if (selectedProcess) {
      axios
        .get(`${API_URL}/feedstocks/${selectedProcess}`)
        .then((res) => setFeedstocks(res.data))
        .catch(err => {
          console.error("Failed to fetch feedstocks:", err);
        });
    }
  }, [selectedProcess, API_URL]);

  const handleProcessSelect = (e) => {
    const process = e.target.value;
    setSelectedProcess(process);
    setSelectedFeedstock("");
    onProcessChange(process);
    onFeedstockChange("");
  };

  const handleFeedstockSelect = (e) => {
    const feedstock = e.target.value;
    setSelectedFeedstock(feedstock);
    onFeedstockChange(feedstock);
  };

  const handleCountrySelect = (e) => {
    const country = e.target.value;
    if (country !== "Malaysia" && country !== "") {
      setShowDataNotAvailableModal(true);
      // Keep Malaysia selected
      return;
    }
    setSelectedCountry(country);
  };

  // 🔹 Slider helper
const renderSlider = (id, label, value, range, step, handler, decimals = 2) => {
  // helper
  const formatNumber = (num, decimals = 2) => {
    if (num === null || num === undefined || isNaN(num)) return "";
    return Number(num).toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  return (
    <FormGroup className="mb-2">
      <Row form className="align-items-center">
        <Col xs="7">
          <label
            htmlFor={id}
            className="mb-0"
            style={{ fontSize: "0.75rem", fontWeight: 600 }}
          >
            {label}
          </label>
        </Col>
        <Col xs="5">
          <FormInput
            id={id}
            type="text"
            value={formatNumber(value, decimals)}
            size="sm"
            className="text-right"
            style={{ fontSize: "0.75rem", backgroundColor: "#f8f9fa", padding: "4px 8px" }}
            onChange={(e) => {
              // strip commas when typing
              const raw = e.target.value.replace(/,/g, "");
              const num = Number(raw);
              if (!isNaN(num)) {
                handler([num]);
              }
            }}
            onBlur={(e) => {
              // format only when leaving the input
              const raw = e.target.value.replace(/,/g, "");
              const num = Number(raw);
              if (!isNaN(num)) {
                handler([num]);
                e.target.value = formatNumber(num, decimals);
              }
            }}
          />
        </Col>
      </Row>
      <Slider
        connect={[true, false]}
        start={[value]}
        range={range}
        step={step}
        onSlide={handler}
        className="mt-1"
      />
    </FormGroup>
  );
};

  return (
    <Card small className="d-flex flex-column" style={{ height: "100%" }}>
      <CardHeader className="p-2" style={{ flexShrink: 0 }}>
        <h6 className="m-0" style={{ fontSize: "0.85rem", fontWeight: "600" }}>Scenario Inputs</h6>
      </CardHeader>

      <CardBody className="p-2 d-flex flex-column" style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        <Form className="d-flex flex-column" style={{ height: "100%" }}>
          {/* 🔹 Process & Feedstock & Country */}
          <div style={{ flexShrink: 0 }}>
            <Row form className="align-items-end">
              <Col md="4">
                <FormGroup className="mb-2">
                  <label htmlFor="process_technology" style={{ fontSize: "0.75rem", fontWeight: 600 }}>Process Technology</label>
                  <FormSelect
                    id="process_technology"
                    value={selectedProcess}
                    onChange={handleProcessSelect}
                    size="sm"
                    style={{ fontSize: "0.75rem" }}
                  >
                    <option value="">-- Select Process --</option>
                    {processes.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </FormSelect>
                </FormGroup>
              </Col>
              <Col md="4">
                {selectedProcess && (
                  <FormGroup className="mb-2">
                    <label htmlFor="feedstock" style={{ fontSize: "0.75rem", fontWeight: 600 }}>Feedstock</label>
                    <FormSelect
                      id="feedstock"
                      value={selectedFeedstock}
                      onChange={handleFeedstockSelect}
                      size="sm"
                      style={{ fontSize: "0.75rem" }}
                    >
                      <option value="">-- Select Feedstock --</option>
                      {feedstocks.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </FormSelect>
                  </FormGroup>
                )}
              </Col>
              <Col md="4">
                {selectedProcess && (
                  <FormGroup className="mb-2">
                    <label htmlFor="country" style={{ fontSize: "0.75rem", fontWeight: 600 }}>Country</label>
                    <FormSelect
                      id="country"
                      value={selectedCountry}
                      onChange={handleCountrySelect}
                      size="sm"
                      style={{ fontSize: "0.75rem" }}
                    >
                      <option value="">-- Select Country --</option>
                      {countries.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </FormSelect>
                  </FormGroup>
                )}
              </Col>
            </Row>
          </div>

          {/* 🔹 Input Sliders - Scrollable Section */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              marginTop: "12px",
              paddingRight: "6px"
            }}
          >
            {renderSlider("production_capacity", "Plant Total Liquid Fuel Capacity (tons/year)", inputs.production_capacity,
              { min: 100, max: 10000 }, 100, handleSliderChange("production_capacity"), 0)}
            {renderSlider("feedstock_price", "Feedstock Price ($/ton)", inputs.feedstock_price,
              { min: 50, max: 500 }, 5, handleSliderChange("feedstock_price"), 2)}
            {renderSlider("hydrogen_price", "Hydrogen Price ($/kg)", inputs.hydrogen_price,
              { min: 0, max: 10 }, 0.1, handleSliderChange("hydrogen_price"), 2)}
            {renderSlider("electricity_rate", "Electricity Rate ($/kWh)", inputs.electricity_rate,
              { min: 0, max: 0.5 }, 0.01, handleSliderChange("electricity_rate"), 3)}
            {renderSlider("feedstock_carbon_intensity", "Feedstock Carbon Intensity (gCO2/MJ)", inputs.feedstock_carbon_intensity,
              { min: 0, max: 200 }, 1, handleSliderChange("feedstock_carbon_intensity"), 2)}
            {renderSlider("product_energy_content", "Product Energy Content (MJ/kg)", inputs.product_energy_content,
              { min: 20, max: 50 }, 0.5, handleSliderChange("product_energy_content"), 2)}
            {renderSlider("feedstock_carbon_content", "Feedstock Carbon Content", inputs.feedstock_carbon_content,
              { min: 0, max: 1 }, 0.01, handleSliderChange("feedstock_carbon_content"), 3)}
            {renderSlider("product_price", "Product Price ($/ton)", inputs.product_price,
              { min: 500, max: 5000 }, 10, handleSliderChange("product_price"), 0)}
            {renderSlider("plant_lifetime", "Project Lifetime (years)", inputs.plant_lifetime,
              { min: 5, max: 50 }, 1, handleSliderChange("plant_lifetime"), 0)}
            {renderSlider("land_cost","Land Cost ($)",inputs.land_cost,
            { min: 0, max: 5000000 }, 10000, handleSliderChange("land_cost"), 0)}
            {renderSlider("discount_factor", "Discount Rate (%)", inputs.discount_factor * 100,
              { min: 1, max: 20 }, 0.5, (vals) => handleSliderChange("discount_factor")([vals[0] / 100]), 2)}
          </div>
        </Form>
      </CardBody>

      {/* 🔹 Data Not Available Modal */}
      <Modal
        open={showDataNotAvailableModal}
        toggle={() => setShowDataNotAvailableModal(false)}
        centered
      >
        <ModalHeader>Data Not Available</ModalHeader>
        <ModalBody>
          Sorry, data for this country is not available just yet. Currently, only Malaysia data is supported.
        </ModalBody>
        <ModalFooter>
          <Button theme="secondary" onClick={() => setShowDataNotAvailableModal(false)}>
            OK
          </Button>
        </ModalFooter>
      </Modal>
    </Card>
  );
};

BiofuelForm.propTypes = {
  inputs: PropTypes.object.isRequired,
  handleSliderChange: PropTypes.func.isRequired,
  onProcessChange: PropTypes.func.isRequired,
  onFeedstockChange: PropTypes.func.isRequired,
};

export default BiofuelForm;
