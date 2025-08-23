import React from "react";
import PropTypes from "prop-types";
import {
  Card,
  CardHeader,
  CardBody,
  Form,
  FormGroup,
  FormInput,
  Button,
  Slider
} from "shards-react";

const UserInputsForm = ({
  title,
  inputs,
  TCI_2023,
  handleSliderChange,
  setTCI_2023,
  handleCalculate
}) => {
  return (
    <Card small className="mb-4">
      <CardHeader className="border-bottom">
        <h6 className="m-0">{title}</h6>
      </CardHeader>
      <CardBody>
        <Form>
          <FormGroup className="mb-3">
            <label htmlFor="production_capacity">Production Capacity (tons/year)</label>
            <FormInput
              id="production_capacity"
              type="text"
              value={inputs.production_capacity}
              readOnly
            />
            <Slider
              connect={[true, false]}
              start={[inputs.production_capacity]}
              range={{ min: 100, max: 10000 }}
              onSlide={handleSliderChange("production_capacity")}
            />
          </FormGroup>
    
          <FormGroup className="mb-3">
            <label htmlFor="cepci">CEPCI Index</label>
            <FormInput
              id="cepci"
              type="text"
              value={inputs.CEPCI}
              readOnly
            />
            <Slider
              connect={[true, false]}
              start={[inputs.CEPCI]}
              range={{ min: 500, max: 1000 }}
              onSlide={handleSliderChange("CEPCI")}
            />
          </FormGroup>
    
          <FormGroup className="mb-3">
            <label htmlFor="biomass_price">Biomass Price ($/ton)</label>
            <FormInput
              id="biomass_price"
              type="text"
              value={inputs.biomass_price}
              readOnly
            />
            <Slider
              connect={[true, false]}
              start={[inputs.biomass_price]}
              range={{ min: 50, max: 500 }}
              onSlide={handleSliderChange("biomass_price")}
            />
          </FormGroup>
          
          <FormGroup className="mb-3">
            <label htmlFor="hydrogen_price">Hydrogen Price ($/kg)</label>
            <FormInput
              id="hydrogen_price"
              type="text"
              value={inputs.hydrogen_price}
              readOnly
            />
            <Slider
              connect={[true, false]}
              start={[inputs.hydrogen_price]}
              range={{ min: 1, max: 10 }}
              onSlide={handleSliderChange("hydrogen_price")}
            />
          </FormGroup>
    
          <FormGroup className="mb-3">
            <label htmlFor="electricity_rate">Electricity Rate ($/kWh)</label>
            <FormInput
              id="electricity_rate"
              type="text"
              value={inputs.electricity_rate}
              readOnly
            />
            <Slider
              connect={[true, false]}
              start={[inputs.electricity_rate]}
              range={{ min: 0.05, max: 0.50 }}
              onSlide={handleSliderChange("electricity_rate")}
            />
          </FormGroup>
    
          <FormGroup className="mb-3">
            <label htmlFor="yearly_wage_operator">Yearly Wage Operator ($/year)</label>
            <FormInput
              id="yearly_wage_operator"
              type="text"
              value={inputs.yearly_wage_operator}
              readOnly
            />
            <Slider
              connect={[true, false]}
              start={[inputs.yearly_wage_operator]}
              range={{ min: 50000, max: 150000 }}
              onSlide={handleSliderChange("yearly_wage_operator")}
            />
          </FormGroup>
    
          <FormGroup className="mb-3">
            <label htmlFor="product_price">Product Price ($/ton)</label>
            <FormInput
              id="product_price"
              type="text"
              value={inputs.product_price}
              readOnly
            />
            <Slider
              connect={[true, false]}
              start={[inputs.product_price]}
              range={{ min: 500, max: 5000 }}
              onSlide={handleSliderChange("product_price")}
            />
          </FormGroup>
    
          <FormGroup className="mb-3">
            <label htmlFor="land_cost">Land Cost ($)</label>
            <FormInput
              id="land_cost"
              type="text"
              value={inputs.land_cost}
              readOnly
            />
            <Slider
              connect={[true, false]}
              start={[inputs.land_cost]}
              range={{ min: 100000, max: 5000000 }}
              onSlide={handleSliderChange("land_cost")}
            />
          </FormGroup>
    
          <FormGroup className="mb-3">
            <label htmlFor="plant_lifetime">Plant Lifetime (years)</label>
            <FormInput
              id="plant_lifetime"
              type="text"
              value={inputs.plant_lifetime}
              readOnly
            />
            <Slider
              connect={[true, false]}
              start={[inputs.plant_lifetime]}
              range={{ min: 10, max: 40 }}
              onSlide={(vals) => handleSliderChange("plant_lifetime")(Number(vals[0]))}
            />
          </FormGroup>
    
          <FormGroup className="mb-3">
            <label htmlFor="discount_factor">Discount Factor</label>
            <FormInput
              id="discount_factor"
              type="text"
              value={inputs.discount_factor}
              readOnly
            />
            <Slider
              connect={[true, false]}
              start={[inputs.discount_factor]}
              range={{ min: 0.01, max: 0.20 }}
              onSlide={handleSliderChange("discount_factor")}
            />
          </FormGroup>
          
          <FormGroup className="mb-3">
            <label htmlFor="tci">TCI 2023</label>
            <FormInput
              id="tci"
              type="number"
              value={TCI_2023}
              onChange={(e) => setTCI_2023(parseFloat(e.target.value))}
            />
          </FormGroup>

          <Button onClick={handleCalculate} theme="primary" className="mt-3">
            Calculate
          </Button>
        </Form>
      </CardBody>
    </Card>
  );
};

UserInputsForm.propTypes = {
  title: PropTypes.string,
  inputs: PropTypes.object.isRequired,
  TCI_2023: PropTypes.number.isRequired,
  handleSliderChange: PropTypes.func.isRequired,
  setTCI_2023: PropTypes.func.isRequired,
  handleCalculate: PropTypes.func.isRequired,
};

UserInputsForm.defaultProps = {
  title: "User Inputs",
};

export default UserInputsForm;