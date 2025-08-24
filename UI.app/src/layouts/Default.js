import React from "react";
import PropTypes from "prop-types";
import { Container, Row, Col } from "shards-react";

import MainNavbar from "../components/layout/MainNavbar/MainNavbar";
import MainFooter from "../components/layout/MainFooter";   // ✅ keep only this footer

const DefaultLayout = ({ children, noNavbar, noFooter }) => {
  return (
    <div className="d-flex flex-column min-vh-100">
      {/* Main content wrapper */}
      <Container fluid className="flex-grow-1">
        <Row>
          <Col className="main-content p-0" lg="12" md="12" sm="12" tag="main">
            {!noNavbar && <MainNavbar />}

            {/* ✅ Children (pages like BlogPosts) render here */}
            <div className="px-4 py-3">
              {children}
            </div>
          </Col>
        </Row>
      </Container>

      {/* ✅ Footer stays at bottom */}
      {!noFooter && (
        <MainFooter
          contained={false}
          copyright="Copyright © 2025 Aerospace Malaysia Innovation Centre"
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
  noNavbar: true,
  noFooter: false,
};

export default DefaultLayout;
