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
  Button,
  Slider,
  Row,
  Col
} from "shards-react";

const BiofuelForm = ({
  inputs,
  TCI_2023,
  handleSliderChange,
  setTCI_2023,
  handleCalculate,
  onProcessChange,
  onFeedstockChange
}) => {
  const [processes, setProcesses] = useState([]);
  const [feedstocks, setFeedstocks] = useState([]);
  const [selectedProcess, setSelectedProcess] = useState("");
  const [selectedFeedstock, setSelectedFeedstock] = useState("");

  // Fetch processes
  useEffect(() => {
    axios.get("http://127.0.0.1:8000/processes").then((res) => {
      setProcesses(res.data);
    });
  }, []);

  // Fetch feedstocks when process changes
  useEffect(() => {
    if (selectedProcess) {
      axios.get(`http://127.0.0.1:8000/feedstocks/${selectedProcess}`).then((res) => {
        setFeedstocks(res.data);
      });
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

  // Helper for sliders
  const renderSlider = (id, label, value, range, step, handler) => (
    <FormGroup className="mb-3">
      <Row form className="align-items-center">
        <Col xs="7">
          <label
            htmlFor={id}
            className="mb-0"
            style={{ fontSize: "0.95rem", fontWeight: 600 }}
          >
            {label}
          </label>
        </Col>
        <Col xs="5">
          <FormInput
            id={id}
            type="number"
            value={value}
            readOnly
            size="sm"
            className="text-right font-weight-bold"
            style={{ fontSize: "0.95rem", backgroundColor: "#f8f9fa" }}
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

  return (
    <Card small className="mb-3">
      <CardHeader className="border-bottom py-2">
        <h6 className="m-0">Biofuel Selector & User Inputs</h6>
      </CardHeader>
      <CardBody className="p-3">
        <Form>
          {/* Process & Feedstock */}
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

          {/* Example slider */}
          {renderSlider("production_capacity", "Production Capacity (tons/year)", inputs.production_capacity, { min: 100, max: 10000 }, 100, handleSliderChange("production_capacity"))}

          {/* TCI + Button */}
          <Row form className="align-items-end mt-2">
            <Col xs="8">
              <label htmlFor="tci" className="mb-0" style={{ fontSize: "0.95rem", fontWeight: 600 }}>
                TCI 2023 ($)
              </label>
              <FormInput
                id="tci"
                type="number"
                value={TCI_2023}
                readOnly
                size="sm"
                className="text-right font-weight-bold mb-1"
                style={{ fontSize: "0.95rem", backgroundColor: "#f8f9fa" }}
              />
            </Col>
            <Col xs="4" className="d-flex align-items-end">
              <Button onClick={handleCalculate} block>
                Calculate
              </Button>
            </Col>
          </Row>
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
  handleCalculate: PropTypes.func.isRequired,
  onProcessChange: PropTypes.func.isRequired,
  onFeedstockChange: PropTypes.func.isRequired,
};

export default BiofuelForm;