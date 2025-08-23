import React, { useState } from "react";
import PropTypes from "prop-types";
import { Container, Row, Col } from "shards-react";
import axios from "axios"; // Ensure you have this import

import MainNavbar from "../components/layout/MainNavbar/MainNavbar";
import MainFooter from "../components/layout/MainFooter";
import UserInputsForm from "../forms/UserInputsForm";
import BiofuelSelector from "../forms/BiofuelSelector"; 

const DefaultLayout = ({ children, noNavbar, noFooter }) => {
  // User input states
  const [inputs, setInputs] = useState({
    production_capacity: 1000,
    CEPCI: 650,
    biomass_price: 150,
    hydrogen_price: 3,
    electricity_rate: 0.1,
    yearly_wage_operator: 80000,
    product_price: 1500,
    land_cost: 200000,
    plant_lifetime: 40,
    discount_factor: 0.1
  });
  const [TCI_2023, setTCI_2023] = useState(1000000);

  // Biofuel selector states
  const [selectedProcess, setSelectedProcess] = useState("");
  const [selectedFeedstock, setSelectedFeedstock] = useState("");
 

  // UserInputsForm handlers
const handleSliderChange = (name) => (value) => {
  // value comes in as an array from shards-react Slider, e.g. [30]
  setInputs({ ...inputs, [name]: Number(value[0]) });
  };

  // BiofuelSelector handlers
  const handleProcessChange = (process) => {
    setSelectedProcess(process);
    setSelectedFeedstock(""); // Reset feedstock when process changes
  };

  const handleFeedstockChange = (feedstock) => {
    setSelectedFeedstock(feedstock);

  };

  // Main handler for the Calculate button
  const handleCalculate = () => {
    // Combine all data into a single object
    const finalData = {
      inputs: inputs, 
      TCI_2023: TCI_2023,
      process_technology: selectedProcess,
      feedstock: selectedFeedstock,

    };

    console.log("Combined JSON object to be sent to backend:", finalData);
    
    // This is the code that sends the data to the backend.
    axios.post("http://127.0.0.1:8000/calculate", finalData)
      .then(response => console.log(response.data))
      .catch(error => console.error(error));
  };

  return (
    <Container fluid>
      <Row>
        <Col
          className="main-content p-0"
          lg="12"
          md="12"
          sm="12"
          tag="main"
        >
          {!noNavbar && <MainNavbar />}

          <Row>
            <Col lg="3" md="12">
              <UserInputsForm
                inputs={inputs}
                TCI_2023={TCI_2023}
                handleSliderChange={handleSliderChange}
                setTCI_2023={setTCI_2023}
                handleCalculate={handleCalculate} // Pass the new combined handler
              />
            </Col>
            
            <Col lg="9" md="12" className="pb-4">
              <BiofuelSelector
                onProcessChange={handleProcessChange}
                onFeedstockChange={handleFeedstockChange}
              /> 
              {children}
            </Col>
          </Row>
          
          {!noFooter && <MainFooter />}
        </Col>
      </Row>
    </Container>
  );
};

DefaultLayout.propTypes = {
  noNavbar: PropTypes.bool,
  noFooter: PropTypes.bool
};

DefaultLayout.defaultProps = {
  noNavbar: false,
  noFooter: false
};

export default DefaultLayout;