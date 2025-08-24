import React from "react";
import PropTypes from "prop-types";
import { Container, Row, Col, Navbar, NavbarBrand } from "shards-react";

import MainFooter from "../components/layout/MainFooter";   // ✅ keep only this footer

const DefaultLayout = ({ children, noNavbar, noFooter }) => {
  return (
    <div className="d-flex flex-column min-vh-100">
      {/*Custom Navbar/Header */}
      {!noNavbar && (
        <Navbar
          type="dark"
          expand="md"
          className="mb-3 shadow-sm w-100"
          style={{ backgroundColor: "#07193D" }}   // ✅ Oxford Blue
        >
          <NavbarBrand
            href="/"
            className="ml-3 text-white font-weight-bold"
            style={{ fontSize: "1.25rem", letterSpacing: "0.5px" }}  // ⬆️ Bigger font + spacing
          >
            Techno-Economic Analysis
          </NavbarBrand>
        </Navbar>
      )}


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
};

DefaultLayout.defaultProps = {
  noNavbar: false,  // ✅ show navbar by default
  noFooter: false,
};

export default DefaultLayout;
