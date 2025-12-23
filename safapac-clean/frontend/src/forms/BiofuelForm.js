import React, { useEffect, useMemo, useState } from "react";
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
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Badge,
} from "shards-react";
import { useTheme } from "../contexts/ThemeContext";
import ScenarioTabs from "../components/project/ScenarioTabs";

const formatNumber = (num, decimals = 0) => {
  if (num === null || num === undefined || Number.isNaN(num)) {
    return "";
  }
  return Number(num).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

// newly added
// Editable number input component that allows free-form typing
const EditableNumberInput = ({ value, decimals = 2, onChange, id, colors, style, size = "sm", className = "" }) => {
  const [localValue, setLocalValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  // Update local value when external value changes (but only when not focused)
  useEffect(() => {
    if (!isFocused) {
      setLocalValue(formatNumber(value, decimals));
    }
  }, [value, decimals, isFocused]);

  const handleChange = (e) => {
    setLocalValue(e.target.value);
  };

  const handleBlur = () => {
    setIsFocused(false);
    const raw = localValue.replace(/,/g, "");
    const num = Number(raw);
    if (!Number.isNaN(num) && Number.isFinite(num)) {
      onChange([num]);
    } else {
      // Reset to the original formatted value if invalid or empty
      setLocalValue(formatNumber(value, decimals));
    }
  };

  const handleFocus = (e) => {
    setIsFocused(true);
    // Remove formatting when focused to allow easier editing
    const raw = localValue.replace(/,/g, "");
    setLocalValue(raw);
    e.target.select(); // Select all text for easier replacement
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur(); // Trigger blur to save the value
    }
  };

  return (
    <FormInput
      id={id}
      type="text"
      size={size}
      className={className}
      style={style}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
    />
  );
};

const UNIT_OPTIONS = {
  plant_capacity_unit: [
    { value: "t/yr", label: "tons/yr" },
    { value: "KTA", label: "KTA" },
    { value: "MGPY", label: "MGPY" },
    { value: "BPD", label: "BPD" },
  ],
  average_liquid_density_unit: [
    { value: "kg/m3", label: "kg/m3" },
  ],
  feedstock_price_unit: [
    { value: "USD/t", label: "USD/ton" },
    { value: "USD/kg", label: "USD/kg" },
  ],
  hydrogen_price_unit: [
    { value: "USD/kg", label: "USD/kg" },
    { value: "USD/t", label: "USD/ton" },
  ],
  electricity_rate_unit: [
    { value: "USD/kWh", label: "USD/kWh" },
    { value: "USD/MWh", label: "USD/MWh" },
  ],
  feedstock_ci_unit: [
    { value: "gCO\u2082/kg", label: "gCO\u2082/kg" },
    { value: "kgCO\u2082/t", label: "kgCO\u2082/ton" },
  ],
  feedstock_energy_unit: [
    { value: "MJ/kg", label: "MJ/kg" },
  ],
  feedstock_yield_unit: [
    { value: "kg/kg", label: "kg/kg fuel" },
    { value: "ton/ton", label: "ton/ton" },
  ],
  hydrogen_yield_unit: [
    { value: "kg/kg", label: "kg/kg fuel" },
  ],
  electricity_yield_unit: [
    { value: "kWh/kg", label: "kWh/kg fuel" },
    { value: "MWh/kg", label: "MWh/kg fuel" },
  ],
  hydrogen_ci_unit: [
    { value: "gCO\u2082/kg", label: "gCO\u2082/kg" },
    { value: "kgCO\u2082/t", label: "kgCO\u2082/ton" },
  ],
  electricity_ci_unit: [
    { value: "gCO\u2082/kWh", label: "gCO\u2082/kWh" },
    { value: "kgCO\u2082/MWh", label: "kgCO\u2082/MWh" },
  ],
  tci_ref_unit: [
    { value: "USD", label: "USD" },
  ],
  capacity_ref_unit: [
    { value: "t/yr", label: "tons/yr" },
    { value: "KTA", label: "KTA" },
    { value: "MGPY", label: "MGPY" },
    { value: "BPD", label: "BPD" },
  ],
};

const PRODUCT_UNIT_OPTIONS = {
  priceUnit: [
    { value: "USD/t", label: "USD/ton" },
    { value: "USD/kg", label: "USD/kg" },
    { value: "USD/kt", label: "USD/kilo-ton" },
  ],
  priceSensitivityUnit: [
    { value: "USD/gCO\u2082", label: "USD/gCO\u2082" },
    { value: "USD/kgCO\u2082", label: "USD/kgCO\u2082" },
  ],
  energyUnit: [
    { value: "MJ/kg", label: "MJ/kg" },
  ],
  yieldUnit: [
    { value: "kg/kg", label: "kg/kg fuel" },
    { value: "ton/ton", label: "ton/ton fuel" },
  ],
};

const COUNTRIES = [
  "Malaysia",
  "United States",
  "Canada",
  "United Kingdom",
  "Germany",
  "France",
  "Italy",
  "Spain",
  "Netherlands",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
  "Australia",
  "New Zealand",
  "Japan",
  "South Korea",
  "China",
  "India",
  "Brazil",
  "Mexico",
  "Argentina",
  "Chile",
  "South Africa",
  "Nigeria",
  "Kenya",
  "Egypt",
  "Thailand",
  "Indonesia",
  "Singapore",
  "Philippines",
];

const BiofuelForm = ({
  inputs,
  selectedProcess = "",
  selectedFeedstock = "",
  handleSliderChange,
  handleInputChange,
  handleProductSliderChange,
  handleProductInputChange,
  onAddProduct,
  onRemoveProduct,
  onProcessChange,
  onFeedstockChange,
  onCalculate,
  onReset,
  onSave,
  isCalculating,
  onMasterDataLoaded,
}) => {
  const { colors } = useTheme();
  const [processes, setProcesses] = useState([]);
  const [feedstocks, setFeedstocks] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState("Malaysia");
  const [showDataNotAvailableModal, setShowDataNotAvailableModal] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({
    conversionPlant: true,
    feedstockUtilities: true,
    productData: true,
    economicParameters: true,
  });
  const [collapsedProducts, setCollapsedProducts] = useState({});

  const API_URL = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) || "http://127.0.0.1:8000/api/v1";

  // Initialize all products as collapsed by default
  useEffect(() => {
    if (inputs.products && inputs.products.length > 0) {
      setCollapsedProducts(prev => {
        const newState = { ...prev };
        inputs.products.forEach((_, index) => {
          // Only set to collapsed if not already in state (preserves user interaction)
          if (newState[index] === undefined) {
            newState[index] = true;
          }
        });
        return newState;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs.products]);

  useEffect(() => {
    let isMounted = true;
    axios
      .get(`${API_URL}/process-technologies`)
      .then((res) => {
        if (isMounted) {
          // Backend returns array of objects with 'id' and 'name' fields
          const processData = res.data || [];
          setProcesses(processData);
          // Notify parent of loaded master data
          if (onMasterDataLoaded) {
            onMasterDataLoaded({ processes: processData });
          }
        }
      })
      .catch((err) => {
        console.error("Failed to fetch processes:", err);
      });
    return () => {
      isMounted = false;
    };
  }, [API_URL, onMasterDataLoaded]);

  useEffect(() => {
    if (!selectedProcess) {
      setFeedstocks([]);
      return;
    }
    let isMounted = true;
    axios
      .get(`${API_URL}/feedstocks`)
      .then((res) => {
        if (isMounted) {
          // Backend returns array of objects with 'id' and 'name' fields
          const feedstockData = res.data || [];
          setFeedstocks(feedstockData);
          // Notify parent of loaded master data
          if (onMasterDataLoaded) {
            onMasterDataLoaded({ feedstocks: feedstockData });
          }
        }
      })
      .catch((err) => {
        console.error("Failed to fetch feedstocks:", err);
      });
    return () => {
      isMounted = false;
    };
  }, [API_URL, selectedProcess, onMasterDataLoaded]);

  // const totalMassFraction = useMemo(
  //   () =>
  //     (inputs.products || []).reduce(
  //       (acc, product) => acc + (Number(product.massFraction) || 0),
  //       0
  //     ),
  //   [inputs.products]
  // );
  const totalMassFraction = useMemo(() => {
    const products = inputs.products || [];
    const totalYield = products.reduce((sum, p) => sum + (Number(p.yield) || 0), 0);
    return totalYield > 0 ? 100 : 0; // Always 100% when yields exist
  }, [inputs.products]);

  const calculatedMassFractions = useMemo(() => {
    const products = inputs.products || [];
    if (products.length === 0) return [];

    const totalYield = products.reduce((sum, p) => {
      const yield_ = Number(p.yield) || 0;
      return sum + yield_;
    }, 0);

    if (totalYield === 0) {
      return products.map(() => 0);
    }

    return products.map(product => {
      const yield_ = Number(product.yield) || 0;
      return (yield_ / totalYield) * 100;
    });
  }, [inputs.products]);

  const massFractionExceeded = totalMassFraction > 100 + 1e-6;
  const massFractionShort = totalMassFraction < 100 - 1e-6;
  const { allHaveDensity: allProductsHaveDensity, average: productDensityAverage } = useMemo(() => {
    const densities = (inputs.products || []).map((product) => {
      if (product.density === "" || product.density === null || product.density === undefined) {
        return null;
      }
      const val = Number(product.density);
      return Number.isFinite(val) ? val : null;
    });
    const filled = densities.filter((val) => val !== null);
    const allHaveDensity = filled.length === densities.length && filled.length > 0;
    const average = allHaveDensity ? filled.reduce((sum, val) => sum + val, 0) / filled.length : null;
    return { allHaveDensity, average };
  }, [inputs.products]);

  useEffect(() => {
    if (allProductsHaveDensity && productDensityAverage !== inputs.average_liquid_density) {
      handleInputChange("average_liquid_density")(productDensityAverage);
    }
  }, [allProductsHaveDensity, productDensityAverage, inputs.average_liquid_density, handleInputChange]);

  const handleProcessSelect = (event) => {
    const value = event.target.value;
    onProcessChange(value);
    onFeedstockChange("");
  };

  const handleFeedstockSelect = (event) => {
    const value = event.target.value;
    onFeedstockChange(value);
  };

  const handleCountrySelect = (event) => {
    const value = event.target.value;
    if (value && value !== "Malaysia") {
      setShowDataNotAvailableModal(true);
      return;
    }
    setSelectedCountry(value);
  };

  const toggleSection = (sectionKey) => {
    setCollapsedSections((prev) => {
      const isCurrentlyCollapsed = prev[sectionKey];

      // If the section is currently collapsed, expand it and collapse all others
      if (isCurrentlyCollapsed) {
        return {
          conversionPlant: true,
          feedstockUtilities: true,
          productData: true,
          economicParameters: true,
          [sectionKey]: false, // Expand only this section
        };
      }

      // If the section is currently expanded, just collapse it
      return {
        ...prev,
        [sectionKey]: true,
      };
    });
  };

  const renderUnitSelect = (unitKey, options, size = "sm") => (
    <FormSelect
      size={size}
      value={inputs[unitKey]}
      onChange={(e) => handleInputChange(unitKey)(e)}
      style={{ fontSize: "0.7rem", minWidth: 120 }}
    >
      {(options || []).map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </FormSelect>
  );

  const renderSection = (sectionKey, title, subtitle, children, icon = null) => {
    const isCollapsed = !!collapsedSections[sectionKey];
    return (
      <div
        style={{
          border: `1px solid ${colors.border}`,
          borderRadius: "4px",
          padding: "6px",
          marginBottom: "6px",
          backgroundColor: colors.cardBackground,
        }}
      >
        <button
          type="button"
          onClick={() => toggleSection(sectionKey)}
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "transparent",
            border: "none",
            padding: "0",
            marginBottom: subtitle ? "2px" : "4px",
            cursor: "pointer",
          }}
        >
          <div style={{ textAlign: "left" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              {icon && (
                <span aria-hidden="true" style={{ color: colors.text, lineHeight: 0, fontSize: "0.9rem" }}>
                  {icon}
                </span>
              )}
              <span style={{ fontSize: "0.7rem", fontWeight: 600, color: colors.text }}>{title}</span>
            </div>
            {subtitle && (
              <div style={{ fontSize: "0.6rem", fontWeight: 400, color: colors.textSecondary }}>{subtitle}</div>
            )}
          </div>
          <span
            style={{
              fontSize: "0.9rem",
              fontWeight: 600,
              color: colors.text,
              lineHeight: 1,
            }}
          >
            {isCollapsed ? "+" : "-"}
          </span>
        </button>
        {!isCollapsed && <div>{children}</div>}
      </div>
    );
  };

  const renderSlider = (
    id,
    label,
    value,
    range,
    step,
    handler,
    decimals = 2,
    unitKey = null,
    unitOptions = [],
    sliderClass = ""
  ) => {
    const hasUnit = Boolean(unitKey && unitOptions.length);
    const startValue = Number.isFinite(value) ? Number(value) : 0;
    return (
      <FormGroup className="mb-1">
        <Row form className="align-items-center">
          <Col xs={hasUnit ? "4" : "7"}>
            <label
              htmlFor={id}
              className="mb-0"
              style={{ fontSize: "0.65rem", fontWeight: 600 }}
            >
              {label}
            </label>
          </Col>
          <Col xs={hasUnit ? "4" : "5"}>
            <EditableNumberInput
              id={id}
              value={startValue}
              decimals={decimals}
              onChange={handler}
              colors={colors}
              className="text-right"
              style={{ fontSize: "0.65rem", backgroundColor: colors.inputBackground, padding: "2px 6px" }}
            />
          </Col>
          {hasUnit && (
            <Col xs="4">
              {renderUnitSelect(unitKey, unitOptions)}
            </Col>
          )}
        </Row>
        <Slider
          connect={[true, false]}
          start={[startValue]}
          range={range}
          step={step}
          onSlide={handler}
          className={`mt-1 ${sliderClass}`}
        />
      </FormGroup>
    );
  };

  const toggleProduct = (index) => {
    setCollapsedProducts((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const renderProductCard = (product, index, totalMassFraction = 0, massFractionExceeded = false, massFractionShort = false) => {
    const canRemove = (inputs.products || []).length > 1;
    const isCollapsed = collapsedProducts[index] !== false; // Default to collapsed (true)

    return (
      <div
        key={`product-${index}`}
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: "4px",
          padding: "4px",
          marginBottom: "4px",
          backgroundColor: colors.cardBackground,
        }}
      >
        <div
          className="d-flex justify-content-between align-items-center"
          style={{ marginBottom: isCollapsed ? "0" : "4px", cursor: "pointer" }}
          onClick={() => toggleProduct(index)}
        >
          <div className="d-flex align-items-center" style={{ flex: 1 }}>
            <strong style={{ fontSize: "0.7rem", marginRight: "6px" }}>
              {product.name || `Product ${index + 1}`}
            </strong>
            <span style={{ fontSize: "0.6rem", color: colors.textSecondary }}>
              {/* ({formatNumber(product.massFraction, 1)}%) */}
              ({formatNumber(calculatedMassFractions[index], 1)}%)
            </span>
          </div>
          <div className="d-flex align-items-center">
            <Button
              size="sm"
              theme="light"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveProduct(index);
              }}
              disabled={!canRemove}
              style={{ fontSize: "0.65rem", marginRight: "6px" }}
            >
              Remove
            </Button>
            <span style={{ fontSize: "0.9rem" }}>
              {isCollapsed ? '▼' : '▲'}
            </span>
          </div>
        </div>

        {!isCollapsed && (
          <div style={{ marginTop: "8px" }}>
            <Row form>
          <Col xs="12" className="mb-2">
            <FormGroup className="mb-1">
              <label style={{ fontSize: "0.7rem", fontWeight: 600 }}>Product Name</label>
              <FormInput
                size="sm"
                value={product.name}
                onChange={(e) => handleProductInputChange(index, "name")(e)}
                style={{ fontSize: "0.75rem" }}
              />
            </FormGroup>
          </Col>

          {/* Price slider with direct input */}
          <Col xs="12" className="mb-2">
            <FormGroup className="mb-1">
              <label style={{ fontSize: "0.7rem", fontWeight: 600 }}>Price</label>
              <Row form className="align-items-center mb-1">
                <Col xs="6">
                  <EditableNumberInput
                    value={product.price}
                    decimals={2}
                    onChange={(val) => handleProductInputChange(index, "price")(val[0])}
                    colors={colors}
                    style={{ fontSize: "0.75rem" }}
                  />
                </Col>
                <Col xs="6">
                  <FormSelect
                    size="sm"
                    value={product.priceUnit}
                    onChange={(e) =>
                      handleProductInputChange(index, "priceUnit")(e.target.value)
                    }
                    style={{ fontSize: "0.7rem", minWidth: 120 }}
                  >
                    {PRODUCT_UNIT_OPTIONS.priceUnit.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </FormSelect>
                </Col>
              </Row>
              <Slider
                connect={[true, false]}
                start={[Number(product.price) || 0]}
                range={{ min: 0, max: 10000 }}
                step={5}
                onSlide={handleProductSliderChange(index, "price")}
                className="slider-product"
              />
            </FormGroup>
          </Col>

          {/* Mass Fraction slider with direct input - RIGHT UNDER PRICE */}
          {/* <Col xs="12" className="mb-2">
            <FormGroup className="mb-1">
              <label style={{ fontSize: "0.7rem", fontWeight: 600 }}>Mass Fraction (%)</label>
              <Row form className="align-items-center mb-1">
                <Col xs="12">
                  <FormInput
                    size="sm"
                    type="text"
                    value={product.massFraction}
                    onChange={(e) => {
                      const val = e.target.value;
                      // Allow typing decimal numbers
                      if (val === '' || val === '-' || !isNaN(val)) {
                        handleProductInputChange(index, "massFraction")(val === '' ? 0 : val);
                      }
                    }}
                    onBlur={(e) => {
                      const num = Number(e.target.value);
                      if (!isNaN(num)) {
                        handleProductInputChange(index, "massFraction")(num);
                      }
                    }}
                    style={{ fontSize: "0.75rem" }}
                  />
                </Col>
              </Row>
              <Slider
                connect={[true, false]}
                start={[Number(product.massFraction) || 0]}
                range={{ min: 0, max: 100 }}
                step={0.5}
                onSlide={handleProductSliderChange(index, "massFraction")}
                className="slider-product"
              />
            </FormGroup>
          </Col> */}

          <Col sm="6" className="mb-2">
            <FormGroup className="mb-1">
              <label style={{ fontSize: "0.7rem", fontWeight: 600 }}>Price Sensitivity</label>
              <Row form>
                <Col xs="6">
                  <EditableNumberInput
                    value={product.priceSensitivity}
                    decimals={3}
                    onChange={(val) => handleProductInputChange(index, "priceSensitivity")(val[0])}
                    colors={colors}
                    style={{ fontSize: "0.75rem" }}
                  />
                </Col>
                <Col xs="6">
                  <FormSelect
                    size="sm"
                    value={product.priceSensitivityUnit}
                    onChange={(e) =>
                      handleProductInputChange(index, "priceSensitivityUnit")(e.target.value)
                    }
                    style={{ fontSize: "0.7rem", minWidth: 120 }}
                  >
                    {PRODUCT_UNIT_OPTIONS.priceSensitivityUnit.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </FormSelect>
                </Col>
              </Row>
            </FormGroup>
          </Col>
          <Col sm="6" className="mb-2">
            <FormGroup className="mb-1">
              <label style={{ fontSize: "0.7rem", fontWeight: 600 }}>Carbon Content (fraction)</label>
              <EditableNumberInput
                value={product.carbonContent}
                decimals={3}
                onChange={(val) => handleProductInputChange(index, "carbonContent")(val[0])}
                colors={colors}
                style={{ fontSize: "0.75rem" }}
              />
            </FormGroup>
          </Col>

          <Col sm="6" className="mb-2">
            <FormGroup className="mb-1">
              <label style={{ fontSize: "0.7rem", fontWeight: 600 }}>Product Density (kg/m3)</label>
              <EditableNumberInput
                value={product.density ?? 0}
                decimals={2}
                onChange={(val) => handleProductInputChange(index, "density")(val[0])}
                colors={colors}
                style={{ fontSize: "0.75rem" }}
              />
            </FormGroup>
          </Col>

          {/* Energy Content with direct input */}
          <Col sm="6" className="mb-2">
            <FormGroup className="mb-1">
              <label style={{ fontSize: "0.7rem", fontWeight: 600 }}>Energy Content</label>
              <Row form>
                <Col xs="6">
                  <EditableNumberInput
                    value={product.energyContent}
                    decimals={2}
                    onChange={(val) => handleProductInputChange(index, "energyContent")(val[0])}
                    colors={colors}
                    style={{ fontSize: "0.75rem" }}
                  />
                </Col>
                <Col xs="6">
                  <FormSelect
                    size="sm"
                    value={product.energyUnit}
                    onChange={(e) =>
                      handleProductInputChange(index, "energyUnit")(e.target.value)
                    }
                    style={{ fontSize: "0.7rem", minWidth: 120 }}
                  >
                    {PRODUCT_UNIT_OPTIONS.energyUnit.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </FormSelect>
                </Col>
              </Row>
            </FormGroup>
          </Col>

          {/* Yield with direct input */}
          <Col sm="6" className="mb-2">
            <FormGroup className="mb-1">
              <label style={{ fontSize: "0.7rem", fontWeight: 600 }}>Yield</label>
              <Row form>
                <Col xs="6">
                  <EditableNumberInput
                    value={product.yield}
                    decimals={3}
                    onChange={(val) => handleProductInputChange(index, "yield")(val[0])}
                    colors={colors}
                    style={{ fontSize: "0.75rem" }}
                  />
                </Col>
                <Col xs="6">
                  <FormSelect
                    size="sm"
                    value={product.yieldUnit}
                    onChange={(e) =>
                      handleProductInputChange(index, "yieldUnit")(e.target.value)
                    }
                    style={{ fontSize: "0.7rem", minWidth: 120 }}
                  >
                    {PRODUCT_UNIT_OPTIONS.yieldUnit.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </FormSelect>
                </Col>
              </Row>
            </FormGroup>
          </Col>
        </Row>
          </div>
        )}
      </div>
    );
  };

  const handleFormSubmit = (event) => {
    event.preventDefault();
    if (massFractionExceeded || !selectedProcess || !selectedFeedstock) {
      return;
    }
    onCalculate();
  };

  const calculateDisabled =
    isCalculating || massFractionExceeded || !selectedProcess || !selectedFeedstock;

  const feedstockUtilitiesForm = (
    <div style={{ display: "grid", gap: "6px" }}>
      <div
        style={{
          backgroundColor: colors.cardBackground,
          borderRadius: "4px",
          padding: "4px",
        }}
      >
        <div
          style={{
            fontSize: "0.65rem",
            fontWeight: 600,
            color: colors.text,
            marginBottom: "2px",
          }}
        >
          Feedstock
        </div>
        {renderSlider(
          "feedstock_price",
          "Feedstock Price",
          inputs.feedstock_price,
          { min: 0, max: 1000 },
          5,
          handleSliderChange("feedstock_price"),
          2,
          "feedstock_price_unit",
          UNIT_OPTIONS.feedstock_price_unit,
          "slider-feedstock"
        )}

        {renderSlider(
          "feedstock_carbon_intensity",
          "Feedstock Carbon Intensity",
          inputs.feedstock_carbon_intensity,
          { min: 0, max: 200 },
          1,
          handleSliderChange("feedstock_carbon_intensity"),
          2,
          "feedstock_ci_unit",
          UNIT_OPTIONS.feedstock_ci_unit,
          "slider-feedstock"
        )}

        {renderSlider(
          "feedstock_energy_content",
          "Feedstock Energy Content",
          inputs.feedstock_energy_content,
          { min: 10, max: 60 },
          0.5,
          handleSliderChange("feedstock_energy_content"),
          2,
          "feedstock_energy_unit",
          UNIT_OPTIONS.feedstock_energy_unit,
          "slider-feedstock"
        )}

        {renderSlider(
          "feedstock_carbon_content",
          "Feedstock Carbon Content (fraction)",
          inputs.feedstock_carbon_content,
          { min: 0, max: 1 },
          0.01,
          handleSliderChange("feedstock_carbon_content"),
          3,
          null,
          [],
          "slider-feedstock"
        )}

        {renderSlider(
          "feedstock_yield",
          "Feedstock Yield",
          inputs.feedstock_yield,
          { min: 0, max: 10 },
          0.05,
          handleSliderChange("feedstock_yield"),
          3,
          "feedstock_yield_unit",
          UNIT_OPTIONS.feedstock_yield_unit,
          "slider-feedstock"
        )}
      </div>

      <div
        style={{
          backgroundColor: colors.cardBackground,
          border: "1px solid #e2e8f0",
          borderRadius: "4px",
          padding: "4px",
        }}
      >
        <div
          style={{
            fontSize: "0.65rem",
            fontWeight: 600,
            color: colors.text,
            marginBottom: "2px",
          }}
        >
          Hydrogen
        </div>
        {renderSlider(
          "hydrogen_price",
          "Hydrogen Price",
          inputs.hydrogen_price,
          { min: 0, max: 20 },
          0.1,
          handleSliderChange("hydrogen_price"),
          2,
          "hydrogen_price_unit",
          UNIT_OPTIONS.hydrogen_price_unit,
          "slider-feedstock"
        )}
        {renderSlider(
          "hydrogen_carbon_intensity",
          "Hydrogen Carbon Intensity",
          inputs.hydrogen_carbon_intensity,
          { min: 0, max: 500 },
          1,
          handleSliderChange("hydrogen_carbon_intensity"),
          1,
          "hydrogen_ci_unit",
          UNIT_OPTIONS.hydrogen_ci_unit,
          "slider-feedstock"
        )}
        {renderSlider(
          "hydrogen_yield",
          "Hydrogen Yield",
          inputs.hydrogen_yield,
          { min: 0, max: 1 },
          0.005,
          handleSliderChange("hydrogen_yield"),
          3,
          "hydrogen_yield_unit",
          UNIT_OPTIONS.hydrogen_yield_unit,
          "slider-feedstock"
        )}
      </div>

      <div
        style={{
          backgroundColor: colors.cardBackground,
          border: "1px solid #e2e8f0",
          borderRadius: "4px",
          padding: "4px",
        }}
      >
        <div
          style={{
            fontSize: "0.65rem",
            fontWeight: 600,
            color: colors.text,
            marginBottom: "2px",
          }}
        >
          Electricity
        </div>
        {renderSlider(
          "electricity_rate",
          "Electricity Price",
          inputs.electricity_rate,
          { min: 0, max: 1 },
          0.01,
          handleSliderChange("electricity_rate"),
          3,
          "electricity_rate_unit",
          UNIT_OPTIONS.electricity_rate_unit,
          "slider-feedstock"
        )}
        {renderSlider(
          "electricity_carbon_intensity",
          "Electricity Carbon Intensity",
          inputs.electricity_carbon_intensity,
          { min: 0, max: 800 },
          5,
          handleSliderChange("electricity_carbon_intensity"),
          1,
          "electricity_ci_unit",
          UNIT_OPTIONS.electricity_ci_unit,
          "slider-feedstock"
        )}
        {renderSlider(
          "electricity_yield",
          "Electricity Yield",
          inputs.electricity_yield,
          { min: 0, max: 2 },
          0.01,
          handleSliderChange("electricity_yield"),
          3,
          "electricity_yield_unit",
          UNIT_OPTIONS.electricity_yield_unit,
          "slider-feedstock"
        )}
      </div>
    </div>
  );

  const feedstockUtilitiesSubtitle = "Describe the primary feedstock and supporting utilities.";

  const feedstockUtilitiesContent = feedstockUtilitiesForm;

  return (
    <Card small className="d-flex flex-column" style={{ height: "100%" }}>
      <CardHeader className="p-1" style={{ flexShrink: 0 }}>
        <h6 className="m-0" style={{ fontSize: "0.75rem", fontWeight: 600 }}>
          Scenario Inputs
        </h6>
      </CardHeader>

      <CardBody className="p-1 d-flex flex-column" style={{ flex: 1, minHeight: 0, overflow: "hidden", height: "100%", paddingBottom: "8px" }}>
        {/* Scenario Tabs - for switching between scenarios */}
        <div style={{ flexShrink: 0, marginBottom: "0.5rem" }}>
          <ScenarioTabs />
        </div>

        <Form
          className="d-flex flex-column"
          style={{ flex: 1, minHeight: 0, overflow: "hidden" }}
          onSubmit={handleFormSubmit}
        >
          <div style={{ flexShrink: 0 }}>
            <Row form>
              <Col md="4" className="mb-1">
                <FormGroup className="mb-0">
                  <label style={{ fontSize: "0.7rem", fontWeight: 600, marginBottom: "2px" }}>Process Technology</label>
                  <FormSelect
                    size="sm"
                    value={selectedProcess}
                    onChange={handleProcessSelect}
                    style={{ fontSize: "0.7rem", fontWeight: "400", padding: "0.25rem 0.5rem" }}
                  >
                    <option value="">-- Select Process --</option>
                    {processes.map((process) => (
                      <option key={process.id} value={process.name}>
                        {process.name}
                      </option>
                    ))}
                  </FormSelect>
                </FormGroup>
              </Col>
              <Col md="4" className="mb-1">
                {selectedProcess && (
                  <FormGroup className="mb-0">
                    <label style={{ fontSize: "0.7rem", fontWeight: 600, marginBottom: "2px" }}>Feedstock</label>
                    <FormSelect
                      size="sm"
                      value={selectedFeedstock}
                      onChange={handleFeedstockSelect}
                      style={{ fontSize: "0.7rem", fontWeight: "400", padding: "0.25rem 0.5rem" }}
                    >
                      <option value="">-- Select Feedstock --</option>
                      {feedstocks.map((feedstock) => (
                        <option key={feedstock.id} value={feedstock.name}>
                          {feedstock.name}
                        </option>
                      ))}
                    </FormSelect>
                  </FormGroup>
                )}
              </Col>
              <Col md="4" className="mb-1">
                {selectedProcess && (
                  <FormGroup className="mb-0">
                    <label style={{ fontSize: "0.7rem", fontWeight: 600, marginBottom: "2px" }}>Country</label>
                    <FormSelect
                      size="sm"
                      value={selectedCountry}
                      onChange={handleCountrySelect}
                      style={{ fontSize: "0.7rem", fontWeight: "400", padding: "0.25rem 0.5rem" }}
                    >
                      <option value="">-- Select Country --</option>
                      {COUNTRIES.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </FormSelect>
                  </FormGroup>
                )}
              </Col>
            </Row>
          </div>

          {/* Scrollable input sections container - grouped parameters */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              overflowX: "hidden",
              marginTop: "4px",
              paddingRight: "4px",
            }}
          >
            {renderSection(
              "conversionPlant",
              "Conversion Plant",
              "Define core plant-level parameters.",
              <>
                {renderSlider(
                  "production_capacity",
                  "Plant Total Liquid Fuel Capacity",
                  inputs.production_capacity,
                  { min: 50, max: 15000 },
                  50,
                  handleSliderChange("production_capacity"),
                  0,
                  "plant_capacity_unit",
                  UNIT_OPTIONS.plant_capacity_unit,
                  "slider-conversion"
                )}

                {renderSlider(
                  "annual_load_hours",
                  "Plant Annual Load Hours",
                  inputs.annual_load_hours,
                  { min: 0, max: 8760 },
                  100,
                  handleSliderChange("annual_load_hours"),
                  0,
                  null,
                  [],
                  "slider-conversion"
                )}

                {renderSlider(
                  "conversion_process_ci_default",
                  "Conversion Process CI Default (gCO\u2082/MJ)",
                  inputs.conversion_process_ci_default,
                  { min: 0, max: 200 },
                  1,
                  handleSliderChange("conversion_process_ci_default"),
                  1,
                  null,
                  [],
                  "slider-conversion"
                )}
              </>,
              
            )}

            {renderSection(
              "feedstockUtilities",
              "Feedstock & Utilities Data",
              feedstockUtilitiesSubtitle,
              feedstockUtilitiesContent
            )}

            {renderSection(
              "productData",
              "Product Data",
              "Configure product slate, yields, and pricing.",
              <>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="m-0" style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                    Product Slate
                  </h6>
                  <Button
                    size="sm"
                    theme="secondary"
                    onClick={onAddProduct}
                    style={{ fontSize: "0.7rem" }}
                  >
                    Add Product
                  </Button>
                </div>
                <div className="mb-1">
                  <Badge theme={massFractionExceeded ? "danger" : massFractionShort ? "warning" : "success"} style={{ fontSize: "0.65rem", padding: "0.2rem 0.4rem" }}>
                    Total mass fraction: {formatNumber(totalMassFraction, 1)}%
                  </Badge>
                </div>
                <div style={{ fontSize: "0.6rem", color: colors.textSecondary, marginBottom: "4px" }}>
                  Product average density (auto):{" "}
                  {allProductsHaveDensity
                    ? `${formatNumber(productDensityAverage, 1)} kg/m3`
                    : "Enter density for each product to calculate"}
                </div>
                {massFractionExceeded && (
                  <div style={{ color: "#b91c1c", fontSize: "0.6rem", marginBottom: "4px" }}>
                    Total product mass fractions exceed 100%. Adjust the sliders before calculating.
                  </div>
                )}
                {massFractionShort && !massFractionExceeded && (
                  <div style={{ color: "#92400e", fontSize: "0.6rem", marginBottom: "4px" }}>
                    Total mass fraction is below 100%. Remaining fraction will be treated as unassigned.
                  </div>
                )}
                {(inputs.products || []).map((product, index) =>
                  renderProductCard(
                    product,
                    index,
                    totalMassFraction,
                    massFractionExceeded,
                    massFractionShort
                  )
                )}
              </>,

            )}

            {renderSection(
              "economicParameters",
              "Economic Parameters",
              "Set financial assumptions for the techno-economic model.",
              <>
                {renderSlider(
                  "plant_lifetime",
                  "Project Lifetime (years)",
                  inputs.plant_lifetime,
                  { min: 5, max: 60 },
                  1,
                  handleSliderChange("plant_lifetime"),
                  0,
                  null,
                  [],
                  "slider-economic"
                )}

                {renderSlider(
                  "discount_factor",
                  "Discount Rate (%)",
                  (inputs.discount_factor || 0) * 100,
                  { min: 0, max: 30 },
                  0.25,
                  (vals) => handleSliderChange("discount_factor")([vals[0] / 100]),
                  2,
                  null,
                  [],
                  "slider-economic"
                )}

                {renderSlider(
                  "tci_ref",
                  "Reference TCI",
                  inputs.tci_ref,
                  { min: 0, max: 5_000_000_000 },
                  1_000_000,
                  handleSliderChange("tci_ref"),
                  0,
                  "tci_ref_unit",
                  UNIT_OPTIONS.tci_ref_unit,
                  "slider-economic"
                )}

                {renderSlider(
                  "capacity_ref",
                  "Reference Capacity",
                  inputs.capacity_ref,
                  { min: 0, max: 150000 },
                  100,
                  handleSliderChange("capacity_ref"),
                  0,
                  "capacity_ref_unit",
                  UNIT_OPTIONS.capacity_ref_unit,
                  "slider-economic"
                )}

                {renderSlider(
                  "tci_scaling_exponent",
                  "TCI Scaling Exponent",
                  inputs.tci_scaling_exponent,
                  { min: 0.1, max: 1.0 },
                  0.01,
                  handleSliderChange("tci_scaling_exponent"),
                  2,
                  null,
                  [],
                  "slider-economic"
                )}

                {renderSlider(
                  "wc_to_tci_ratio",
                  "Working Capital / TCI Ratio",
                  inputs.wc_to_tci_ratio,
                  { min: 0, max: 1 },
                  0.01,
                  handleSliderChange("wc_to_tci_ratio"),
                  2,
                  null,
                  [],
                  "slider-economic"
                )}

                {renderSlider(
                  "indirect_opex_to_tci_ratio",
                  "Indirect OPEX / TCI Ratio",
                  inputs.indirect_opex_to_tci_ratio,
                  { min: 0, max: 1 },
                  0.01,
                  handleSliderChange("indirect_opex_to_tci_ratio"),
                  2,
                  null,
                  [],
                  "slider-economic"
                )}
              </>,
            
            )}
          </div>

          {/* Fixed buttons footer - always visible */}
          <div style={{ flexShrink: 0, paddingTop: "4px", borderTop: `1px solid ${colors.border}`, backgroundColor: colors.cardBackground }}>
            <Row style={{ margin: 0 }}>
              <Col style={{ padding: "0 2px 0 0" }}>
                <Button
                  block
                  disabled={calculateDisabled}
                  type="submit"
                  style={{
                    backgroundColor: colors.oxfordBlue,
                    borderColor: colors.oxfordBlue,
                    fontSize: "0.7rem",
                    padding: "0.35rem"
                  }}
                >
                  {isCalculating ? "Calculating..." : "Calculate"}
                </Button>
              </Col>
              <Col style={{ padding: "0 1px" }}>
                <Button
                  block
                  type="button"
                  onClick={onReset}
                  style={{
                    backgroundColor: "#6c757d",
                    borderColor: "#6c757d",
                    fontSize: "0.7rem",
                    padding: "0.35rem"
                  }}
                >
                  Reset
                </Button>
              </Col>
              <Col style={{ padding: "0 0 0 2px" }}>
                <Button
                  block
                  type="button"
                  onClick={onSave}
                  style={{
                    backgroundColor: "#28a745",
                    borderColor: "#28a745",
                    fontSize: "0.7rem",
                    padding: "0.35rem"
                  }}
                >
                  Save
                </Button>
              </Col>
            </Row>
          </div>
        </Form>
      </CardBody>

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
  selectedProcess: PropTypes.string,
  selectedFeedstock: PropTypes.string,
  handleSliderChange: PropTypes.func.isRequired,
  handleInputChange: PropTypes.func.isRequired,
  handleProductSliderChange: PropTypes.func.isRequired,
  handleProductInputChange: PropTypes.func.isRequired,
  onAddProduct: PropTypes.func.isRequired,
  onRemoveProduct: PropTypes.func.isRequired,
  onProcessChange: PropTypes.func.isRequired,
  onFeedstockChange: PropTypes.func.isRequired,
  onCalculate: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  isCalculating: PropTypes.bool,
  onMasterDataLoaded: PropTypes.func,
};

export default BiofuelForm;
