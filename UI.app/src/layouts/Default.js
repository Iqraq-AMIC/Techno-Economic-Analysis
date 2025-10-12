import React, { useState } from "react";
import PropTypes from "prop-types";
import {
  Container,
  Row,
  Col,
  Navbar,
  NavbarBrand,
  Modal,
  ModalHeader,
  ModalBody,
  FormGroup,
  FormSelect,
  Button
} from "shards-react";

import MainFooter from "../components/layout/MainFooter";   // ✅ keep only this footer

const DefaultLayout = ({ children, noNavbar, noFooter, selectedCurrency, onCurrencyChange }) => {
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const currencyOptions = [
    { value: "USD", label: "USD - US Dollar" },
    { value: "MYR", label: "MYR - Malaysian Ringgit" },
    { value: "GBP", label: "GBP - British Pound" },
    { value: "EUR", label: "EUR - Euro" }
  ];

  return (
    <div className="d-flex flex-column min-vh-100">
      {/*Custom Navbar/Header */}
      {!noNavbar && (
        <Navbar
          type="dark"
          expand="md"
          className="shadow-sm w-100 mb-2"
          style={{
            backgroundColor: "#07193D",
            padding: "0.5rem 1rem",
            minHeight: "auto"
          }}
        >
          <NavbarBrand
            href="/"
            className="text-white font-weight-bold"
            style={{
              fontSize: "1rem",
              letterSpacing: "0.5px",
              marginBottom: 0,
              paddingTop: "0.25rem",
              paddingBottom: "0.25rem"
            }}
          >
            Techno-Economic Analysis
          </NavbarBrand>

          {/* Settings Icon */}
          <div className="ml-auto">
            <button
              onClick={() => setShowSettingsModal(true)}
              style={{
                background: "none",
                border: "none",
                color: "white",
                cursor: "pointer",
                fontSize: "1.2rem",
                padding: "0.25rem 0.5rem"
              }}
              title="Settings"
            >
              ⚙️
            </button>
          </div>
        </Navbar>
      )}

      {/* Settings Modal */}
      <Modal open={showSettingsModal} toggle={() => setShowSettingsModal(false)}>
        <ModalHeader>Settings</ModalHeader>
        <ModalBody>
          <FormGroup>
            <label htmlFor="currency" style={{ fontSize: "0.9rem", fontWeight: "600" }}>
              Currency
            </label>
            <FormSelect
              id="currency"
              value={selectedCurrency}
              onChange={(e) => onCurrencyChange(e.target.value)}
              style={{ fontSize: "0.9rem" }}
            >
              {currencyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </FormSelect>
          </FormGroup>
          <div className="text-right mt-3">
            <Button
              theme="primary"
              onClick={() => setShowSettingsModal(false)}
            >
              Close
            </Button>
          </div>
        </ModalBody>
      </Modal>

      {/* Main content wrapper */}
      <Container fluid className="flex-grow-1 p-0">
        <Row noGutters>
          <Col className="main-content p-0" lg="12" md="12" sm="12" tag="main">
            <div className="w-100 h-100">{children}</div>
          </Col>
        </Row>
      </Container>


      {/* ✅ Footer stays at bottom */}
      {!noFooter && (
        <MainFooter
          contained={false}
          className="text-white text-center py-3"
          style={{ backgroundColor: "#07193D" }}   // ✅ Oxford Blue footer
          copyright="Copyright © 2025 Aerospace Malaysia Innovation Centre. All Rights Reserved."
        />
      )}

    </div>
  );
};

DefaultLayout.propTypes = {
  noNavbar: PropTypes.bool,
  noFooter: PropTypes.bool,
  children: PropTypes.node.isRequired,
  selectedCurrency: PropTypes.string,
  onCurrencyChange: PropTypes.func,
};

DefaultLayout.defaultProps = {
  noNavbar: false,  // ✅ show navbar by default
  noFooter: false,
  selectedCurrency: "USD",
  onCurrencyChange: () => {},
};

export default DefaultLayout;
