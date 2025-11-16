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
import { FiMoon, FiSun } from "react-icons/fi";

import MainFooter from "../components/layout/MainFooter";
import UserMenu from "../components/UserMenu";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { useProject } from "../contexts/ProjectContext";

const DefaultLayout = ({ children, noNavbar, noFooter, selectedCurrency, onCurrencyChange, onSwitchProject }) => {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const { theme, toggleTheme, colors } = useTheme();
  const { logout, isAuthenticated } = useAuth();
  const { currentProject } = useProject();

  const currencyOptions = [
    { value: "USD", label: "USD - US Dollar" },
    { value: "MYR", label: "MYR - Malaysian Ringgit" },
    { value: "GBP", label: "GBP - British Pound" },
    { value: "EUR", label: "EUR - Euro" }
  ];

  return (
    <div className="d-flex flex-column" style={{ height: "100vh", overflow: "hidden" }}>
      {/*Custom Navbar/Header */}
      {!noNavbar && (
        <Navbar
          type="dark"
          expand="md"
          className="shadow-sm w-100"
          style={{
            backgroundColor: colors.navbarBackground,
            padding: "0.5rem 1rem",
            minHeight: "auto",
            flexShrink: 0
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

          {/* Switch or Create Project Button */}
          {onSwitchProject && (
            <div className="d-flex align-items-center" style={{ marginLeft: "1.5rem" }}>
              <button
                onClick={onSwitchProject}
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  padding: "0.25rem 0.75rem",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem"
                }}
                title="Switch or create project"
              >
                <i className="material-icons" style={{ fontSize: "0.875rem" }}>folder_open</i>
                Switch or Create Project
              </button>
            </div>
          )}

          {/* Theme Toggle and User Menu */}
          <div className="ml-auto d-flex align-items-center">
            <button
              onClick={toggleTheme}
              style={{
                background: "none",
                border: "none",
                color: "white",
                cursor: "pointer",
                fontSize: "1.2rem",
                padding: "0.25rem 0.5rem",
                display: "flex",
                alignItems: "center"
              }}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? <FiMoon /> : <FiSun />}
            </button>
            {isAuthenticated && (
              <UserMenu onSettingsClick={() => setShowSettingsModal(true)} />
            )}
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
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        <div className="main-content" style={{ height: "100%", width: "100%" }}>
          {children}
        </div>
      </div>

      {/* ✅ Footer stays at bottom */}
      {!noFooter && (
        <div style={{ flexShrink: 0 }}>
          <MainFooter
            contained={false}
            className="text-white text-center"
            style={{ backgroundColor: colors.footerBackground }}
            copyright="Copyright © 2025 Aerospace Malaysia Innovation Centre. All Rights Reserved."
          />
        </div>
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
  onSwitchProject: PropTypes.func,
};

DefaultLayout.defaultProps = {
  noNavbar: false,  // ✅ show navbar by default
  noFooter: false,
  selectedCurrency: "USD",
  onCurrencyChange: () => {},
  onSwitchProject: null,
};

export default DefaultLayout;
