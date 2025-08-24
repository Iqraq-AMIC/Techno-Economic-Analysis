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
  Nav,
  NavItem,
  NavLink,
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
  TCI_2023,
  handleSliderChange,
  setTCI_2023,
  onProcessChange,
  onFeedstockChange,
}) => {
  const [processes, setProcesses] = useState([]);
  const [feedstocks, setFeedstocks] = useState([]);
  const [selectedProcess, setSelectedProcess] = useState("");
  const [selectedFeedstock, setSelectedFeedstock] = useState("");
  const [activeTab, setActiveTab] = useState("plant");

  // 🔹 Fetch processes
  useEffect(() => {
    axios.get("http://127.0.0.1:8000/processes").then((res) => {
      setProcesses(res.data);
    });
  }, []);

  // 🔹 Fetch feedstocks when process selected
  useEffect(() => {
    if (selectedProcess) {
      axios
        .get(`http://127.0.0.1:8000/feedstocks/${selectedProcess}`)
        .then((res) => setFeedstocks(res.data));
    }
  }, [selectedProcess]);

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
    <FormGroup className="mb-3">
      <Row form className="align-items-center">
        <Col xs="7">
          <label
            htmlFor={id}
            className="mb-0"
            style={{ fontSize: "0.9rem", fontWeight: 600 }}
          >
            {label}
          </label>
        </Col>
        <Col xs="5">
          <FormInput
            id={id}
            type="text"
            value={value}
            size="sm"
            className="text-right"
            style={{ fontSize: "0.9rem", backgroundColor: "#f8f9fa" }}
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
    <Card small className="mb-3 flex-fill d-flex flex-column h-100">
      <CardHeader className="border-bottom py-2">
        <h6 className="m-0">Scenario Inputs</h6>
      </CardHeader>

      <CardBody className="p-3 d-flex flex-column flex-grow-1" style={{ minHeight: 0 }}>
        <Form className="d-flex flex-column flex-grow-1" style={{ minHeight: 0 }}>
          {/* 🔹 Process & Feedstock */}
          <Row form>
            <Col md="6">
              <FormGroup>
                <label htmlFor="process_technology">Process Technology</label>
                <FormSelect
                  id="process_technology"
                  value={selectedProcess}
                  onChange={handleProcessSelect}
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
            <Col md="6">
              {selectedProcess && (
                <FormGroup>
                  <label htmlFor="feedstock">Feedstock</label>
                  <FormSelect
                    id="feedstock"
                    value={selectedFeedstock}
                    onChange={handleFeedstockSelect}
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
          </Row>

          {/* 🔹 Tabs */}
          <Nav tabs>
            <NavItem>
              <NavLink active={activeTab === "plant"} onClick={() => setActiveTab("plant")}>
                Plant Parameters
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink active={activeTab === "costs"} onClick={() => setActiveTab("costs")}>
                Costs
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink active={activeTab === "finance"} onClick={() => setActiveTab("finance")}>
                Finance
              </NavLink>
            </NavItem>
          </Nav>

          {/* 🔹 Tab Panels */}
          <div className="flex-grow-1 mt-3 d-flex flex-column" style={{ minHeight: 0 }}>
            {activeTab === "plant" && (
              <div className="flex-grow-1" style={{ overflowY: "auto", paddingRight: "6px" }}>
                {renderSlider("production_capacity", "Production Capacity (tons/year)", inputs.production_capacity,
                  { min: 100, max: 10000 }, 100, handleSliderChange("production_capacity"))}
                {renderSlider("CEPCI", "CEPCI Index", inputs.CEPCI,
                  { min: 500, max: 1000 }, 1, handleSliderChange("CEPCI"))}
                {renderSlider("plant_lifetime", "Plant Lifetime (years)", inputs.plant_lifetime,
                  { min: 5, max: 50 }, 1, (vals) => {
                    const value = Number(vals[0]);
                    if (!isNaN(value)) handleSliderChange("plant_lifetime")([value]);
                  })}
              </div>
            )}

            {activeTab === "costs" && (
              <div className="flex-grow-1" style={{ overflowY: "auto", paddingRight: "6px" }}>
                {renderSlider("biomass_price", "Biomass Price ($/ton)", inputs.biomass_price,
                  { min: 50, max: 500 }, 5, handleSliderChange("biomass_price"))}
                {renderSlider("hydrogen_price", "Hydrogen Price ($/kg)", inputs.hydrogen_price,
                  { min: 1, max: 10 }, 0.1, handleSliderChange("hydrogen_price"), 2)}
                {renderSlider("electricity_rate", "Electricity Rate ($/kWh)", inputs.electricity_rate,
                  { min: 0.05, max: 0.5 }, 0.01, handleSliderChange("electricity_rate"), 3)}
                {renderSlider("yearly_wage_operator", "Yearly Wage Operator ($/year)", inputs.yearly_wage_operator,
                  { min: 50000, max: 150000 }, 1000, handleSliderChange("yearly_wage_operator"))}
                {renderSlider("product_price", "Product Price ($/ton)", inputs.product_price,
                  { min: 500, max: 5000 }, 10, handleSliderChange("product_price"))}
                {renderSlider("land_cost", "Land Cost ($)", inputs.land_cost,
                  { min: 100000, max: 5000000 }, 50000, handleSliderChange("land_cost"))}
              </div>
            )}

            {activeTab === "finance" && (
              <div className="flex-grow-1" style={{ overflowY: "auto", paddingRight: "6px" }}>
                {renderSlider("discount_factor", "Discount Factor (%)", inputs.discount_factor,
                  { min: 0.01, max: 0.2 }, 0.01, handleSliderChange("discount_factor"), 2)}

                {renderSlider("TCI_2023", "TCI 2023 ($)", TCI_2023,
                  { min: 100000, max: 50000000 }, 100000, (vals) => setTCI_2023(Number(vals[0])))}
              </div>
            )}
          </div>
        </Form>
      </CardBody>
    </Card>
  );
};

BiofuelForm.propTypes = {
  inputs: PropTypes.object.isRequired,
  TCI_2023: PropTypes.number.isRequired,
  handleSliderChange: PropTypes.func.isRequired,
  setTCI_2023: PropTypes.func.isRequired,
  onProcessChange: PropTypes.func.isRequired,
  onFeedstockChange: PropTypes.func.isRequired,
};

export default BiofuelForm;
