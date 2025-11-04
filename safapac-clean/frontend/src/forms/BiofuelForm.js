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
// Heroicons via react-icons
// Install: npm i react-icons
// Fallback emoji icons (remove if using react-icons). If you want Heroicons,
// install `react-icons` and import from 'react-icons/hi' or 'react-icons/hi2'.
const EmojiIcon = {
  plant: <span role="img" aria-label="plant" style={{ fontSize: 16, lineHeight: 0 }}>🏭</span>,
  leaf: <span role="img" aria-label="leaf" style={{ fontSize: 16, lineHeight: 0 }}>🌿</span>,
  bolt: <span role="img" aria-label="bolt" style={{ fontSize: 16, lineHeight: 0 }}>⚡</span>,
  cube: <span role="img" aria-label="cube" style={{ fontSize: 16, lineHeight: 0 }}>📦</span>,
  trend: <span role="img" aria-label="trend" style={{ fontSize: 16, lineHeight: 0 }}>📈</span>,
};

const formatNumber = (num, decimals = 0) => {
  if (num === null || num === undefined || Number.isNaN(num)) {
    return "";
  }
  return Number(num).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
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
    { value: "gCO2/kg", label: "gCO2/kg" },
    { value: "kgCO2/t", label: "kgCO2/ton" },
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
    { value: "gCO2/kg", label: "gCO2/kg" },
    { value: "kgCO2/t", label: "kgCO2/ton" },
  ],
  electricity_ci_unit: [
    { value: "gCO2/kWh", label: "gCO2/kWh" },
    { value: "kgCO2/MWh", label: "kgCO2/MWh" },
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
    { value: "USD/gCO2", label: "USD/gCO2" },
    { value: "USD/kgCO2", label: "USD/kgCO2" },
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

  const API_URL = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) || "http://127.0.0.1:8000";

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
      .get(`${API_URL}/processes`)
      .then((res) => {
        if (isMounted) {
          setProcesses(res.data || []);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch processes:", err);
      });
    return () => {
      isMounted = false;
    };
  }, [API_URL]);

  useEffect(() => {
    if (!selectedProcess) {
      setFeedstocks([]);
      return;
    }
    let isMounted = true;
    axios
      .get(`${API_URL}/feedstocks/${selectedProcess}`)
      .then((res) => {
        if (isMounted) {
          setFeedstocks(res.data || []);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch feedstocks:", err);
      });
    return () => {
      isMounted = false;
    };
  }, [API_URL, selectedProcess]);

  const totalMassFraction = useMemo(
    () =>
      (inputs.products || []).reduce(
        (acc, product) => acc + (Number(product.massFraction) || 0),
        0
      ),
    [inputs.products]
  );

  const massFractionExceeded = totalMassFraction > 100 + 1e-6;
  const massFractionShort = totalMassFraction < 100 - 1e-6;

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
      style={{ fontSize: "0.7rem" }}
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
          borderRadius: "6px",
          padding: "10px",
          marginBottom: "12px",
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
            marginBottom: subtitle ? "4px" : "8px",
            cursor: "pointer",
          }}
        >
          <div style={{ textAlign: "left" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {icon && (
                <span aria-hidden="true" style={{ color: "#0f172a", lineHeight: 0 }}>
                  {icon}
                </span>
              )}
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#0f172a" }}>{title}</span>
            </div>
            {subtitle && (
              <div style={{ fontSize: "0.7rem", color: "#475569" }}>{subtitle}</div>
            )}
          </div>
          <span
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              color: "#0f172a",
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
      <FormGroup className="mb-2">
        <Row form className="align-items-center">
          <Col xs={hasUnit ? "5" : "7"}>
            <label
              htmlFor={id}
              className="mb-0"
              style={{ fontSize: "0.75rem", fontWeight: 600 }}
            >
              {label}
            </label>
          </Col>
          <Col xs={hasUnit ? "4" : "5"}>
            <FormInput
              id={id}
              type="text"
              size="sm"
              className="text-right"
              style={{ fontSize: "0.75rem", backgroundColor: colors.inputBackground, padding: "4px 8px" }}
              value={formatNumber(startValue, decimals)}
              onChange={(e) => {
                const raw = e.target.value.replace(/,/g, "");
                const num = Number(raw);
                if (!Number.isNaN(num)) {
                  handler([num]);
                }
              }}
              onBlur={(e) => {
                const raw = e.target.value.replace(/,/g, "");
                const num = Number(raw);
                if (!Number.isNaN(num)) {
                  handler([num]);
                }
              }}
            />
          </Col>
          {hasUnit && (
            <Col xs="3">
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
          borderRadius: "6px",
          padding: "8px",
          marginBottom: "10px",
          backgroundColor: colors.cardBackground,
        }}
      >
        <div
          className="d-flex justify-content-between align-items-center"
          style={{ marginBottom: isCollapsed ? "0" : "8px", cursor: "pointer" }}
          onClick={() => toggleProduct(index)}
        >
          <div className="d-flex align-items-center" style={{ flex: 1 }}>
            <strong style={{ fontSize: "0.8rem", marginRight: "8px" }}>
              {product.name || `Product ${index + 1}`}
            </strong>
            <span style={{ fontSize: "0.7rem", color: colors.textSecondary }}>
              ({formatNumber(product.massFraction, 1)}%)
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
                <Col xs="7">
                  <FormInput
                    size="sm"
                    type="text"
                    value={product.price}
                    onChange={(e) => {
                      const val = e.target.value;
                      // Allow typing decimal numbers
                      if (val === '' || val === '-' || !isNaN(val)) {
                        handleProductInputChange(index, "price")(val === '' ? 0 : val);
                      }
                    }}
                    onBlur={(e) => {
                      const num = Number(e.target.value);
                      if (!isNaN(num)) {
                        handleProductInputChange(index, "price")(num);
                      }
                    }}
                    style={{ fontSize: "0.75rem" }}
                  />
                </Col>
                <Col xs="5">
                  <FormSelect
                    size="sm"
                    value={product.priceUnit}
                    onChange={(e) =>
                      handleProductInputChange(index, "priceUnit")(e.target.value)
                    }
                    style={{ fontSize: "0.7rem" }}
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
          <Col xs="12" className="mb-2">
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
          </Col>

          <Col sm="6" className="mb-2">
            <FormGroup className="mb-1">
              <label style={{ fontSize: "0.7rem", fontWeight: 600 }}>Price Sensitivity</label>
              <Row form>
                <Col xs="7">
                  <FormInput
                    size="sm"
                    type="text"
                    value={product.priceSensitivity}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || val === '-' || !isNaN(val)) {
                        handleProductInputChange(index, "priceSensitivity")(val === '' ? 0 : val);
                      }
                    }}
                    onBlur={(e) => {
                      const num = Number(e.target.value);
                      if (!isNaN(num)) {
                        handleProductInputChange(index, "priceSensitivity")(num);
                      }
                    }}
                    style={{ fontSize: "0.75rem" }}
                  />
                </Col>
                <Col xs="5">
                  <FormSelect
                    size="sm"
                    value={product.priceSensitivityUnit}
                    onChange={(e) =>
                      handleProductInputChange(index, "priceSensitivityUnit")(e.target.value)
                    }
                    style={{ fontSize: "0.7rem" }}
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
              <FormInput
                size="sm"
                type="text"
                value={product.carbonContent}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || val === '-' || !isNaN(val)) {
                    handleProductInputChange(index, "carbonContent")(val === '' ? 0 : val);
                  }
                }}
                onBlur={(e) => {
                  const num = Number(e.target.value);
                  if (!isNaN(num)) {
                    handleProductInputChange(index, "carbonContent")(num);
                  }
                }}
                style={{ fontSize: "0.75rem" }}
              />
            </FormGroup>
          </Col>

          {/* Energy Content with direct input */}
          <Col sm="6" className="mb-2">
            <FormGroup className="mb-1">
              <label style={{ fontSize: "0.7rem", fontWeight: 600 }}>Energy Content</label>
              <Row form>
                <Col xs="7">
                  <FormInput
                    size="sm"
                    type="text"
                    value={product.energyContent}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || val === '-' || !isNaN(val)) {
                        handleProductInputChange(index, "energyContent")(val === '' ? 0 : val);
                      }
                    }}
                    onBlur={(e) => {
                      const num = Number(e.target.value);
                      if (!isNaN(num)) {
                        handleProductInputChange(index, "energyContent")(num);
                      }
                    }}
                    style={{ fontSize: "0.75rem" }}
                  />
                </Col>
                <Col xs="5">
                  <FormSelect
                    size="sm"
                    value={product.energyUnit}
                    onChange={(e) =>
                      handleProductInputChange(index, "energyUnit")(e.target.value)
                    }
                    style={{ fontSize: "0.7rem" }}
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
                <Col xs="7">
                  <FormInput
                    size="sm"
                    type="text"
                    value={product.yield}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || val === '-' || !isNaN(val)) {
                        handleProductInputChange(index, "yield")(val === '' ? 0 : val);
                      }
                    }}
                    onBlur={(e) => {
                      const num = Number(e.target.value);
                      if (!isNaN(num)) {
                        handleProductInputChange(index, "yield")(num);
                      }
                    }}
                    style={{ fontSize: "0.75rem" }}
                  />
                </Col>
                <Col xs="5">
                  <FormSelect
                    size="sm"
                    value={product.yieldUnit}
                    onChange={(e) =>
                      handleProductInputChange(index, "yieldUnit")(e.target.value)
                    }
                    style={{ fontSize: "0.7rem" }}
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

  return (
    <Card small className="d-flex flex-column" style={{ height: "100%" }}>
      <CardHeader className="p-2" style={{ flexShrink: 0 }}>
        <h6 className="m-0" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
          Scenario Inputs
        </h6>
      </CardHeader>

      <CardBody className="p-2 d-flex flex-column" style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        <Form
          className="d-flex flex-column"
          style={{ height: "100%" }}
          onSubmit={handleFormSubmit}
        >
          <div style={{ flexShrink: 0 }}>
            <Row form>
              <Col md="4" className="mb-2">
                <FormGroup className="mb-1">
                  <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>Process Technology</label>
                  <FormSelect
                    size="sm"
                    value={selectedProcess}
                    onChange={handleProcessSelect}
                    style={{ fontSize: "0.75rem" }}
                  >
                    <option value="">-- Select Process --</option>
                    {processes.map((process) => (
                      <option key={process} value={process}>
                        {process}
                      </option>
                    ))}
                  </FormSelect>
                </FormGroup>
              </Col>
              <Col md="4" className="mb-2">
                {selectedProcess && (
                  <FormGroup className="mb-1">
                    <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>Feedstock</label>
                    <FormSelect
                      size="sm"
                      value={selectedFeedstock}
                      onChange={handleFeedstockSelect}
                      style={{ fontSize: "0.75rem" }}
                    >
                      <option value="">-- Select Feedstock --</option>
                      {feedstocks.map((feedstock) => (
                        <option key={feedstock} value={feedstock}>
                          {feedstock}
                        </option>
                      ))}
                    </FormSelect>
                  </FormGroup>
                )}
              </Col>
              <Col md="4" className="mb-2">
                {selectedProcess && (
                  <FormGroup className="mb-1">
                    <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>Country</label>
                    <FormSelect
                      size="sm"
                      value={selectedCountry}
                      onChange={handleCountrySelect}
                      style={{ fontSize: "0.75rem" }}
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

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              marginTop: "8px",
              paddingRight: "6px",
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
                  "average_liquid_density",
                  "Average Liquid Density",
                  inputs.average_liquid_density,
                  { min: 600, max: 1000 },
                  1,
                  handleSliderChange("average_liquid_density"),
                  2,
                  "average_liquid_density_unit",
                  UNIT_OPTIONS.average_liquid_density_unit,
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
                  "Conversion Process CI Default (gCO2/MJ)",
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
              "Describe the primary feedstock and supporting utilities.",
              <>
                <div style={{ display: "grid", gap: "12px" }}>
                  <div
                    style={{
                      backgroundColor: colors.cardBackground,
                      //border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      padding: "-1px",
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#1f2937", marginBottom: "4px" }}>
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
                      borderRadius: "6px",
                      padding: "8px",
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#1f2937", marginBottom: "4px" }}>
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
                      borderRadius: "6px",
                      padding: "8px",
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#1f2937", marginBottom: "4px" }}>
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
              </>,
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>

              </span>
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
                <div className="mb-2">
                  <Badge theme={massFractionExceeded ? "danger" : massFractionShort ? "warning" : "success"}>
                    Total mass fraction: {formatNumber(totalMassFraction, 1)}%
                  </Badge>
                </div>
                {massFractionExceeded && (
                  <div style={{ color: "#b91c1c", fontSize: "0.7rem", marginBottom: "6px" }}>
                    Total product mass fractions exceed 100%. Adjust the sliders before calculating.
                  </div>
                )}
                {massFractionShort && !massFractionExceeded && (
                  <div style={{ color: "#92400e", fontSize: "0.7rem", marginBottom: "6px" }}>
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

          <div style={{ flexShrink: 0, paddingTop: "8px" }}>
            <Row style={{ margin: 0 }}>
              <Col style={{ padding: "0 4px 0 0" }}>
                <Button
                  block
                  disabled={calculateDisabled}
                  type="submit"
                  style={{
                    backgroundColor: colors.oxfordBlue,
                    borderColor: colors.oxfordBlue,
                    fontSize: "0.75rem",
                    padding: "0.5rem"
                  }}
                >
                  {isCalculating ? "Calculating..." : "Calculate"}
                </Button>
              </Col>
              <Col style={{ padding: "0 2px" }}>
                <Button
                  block
                  type="button"
                  onClick={onReset}
                  style={{
                    backgroundColor: "#6c757d",
                    borderColor: "#6c757d",
                    fontSize: "0.75rem",
                    padding: "0.5rem"
                  }}
                >
                  Reset
                </Button>
              </Col>
              <Col style={{ padding: "0 0 0 4px" }}>
                <Button
                  block
                  type="button"
                  onClick={onSave}
                  style={{
                    backgroundColor: "#28a745",
                    borderColor: "#28a745",
                    fontSize: "0.75rem",
                    padding: "0.5rem"
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
};

export default BiofuelForm;
