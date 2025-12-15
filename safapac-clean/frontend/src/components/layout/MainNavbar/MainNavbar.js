import React from "react";
import PropTypes from "prop-types";
import classNames from "classnames";
import { Container, Navbar, Button } from "shards-react";
import { useTheme } from "../../../contexts/ThemeContext";

/*
import NavbarSearch from "./NavbarSearch";
import NavbarNav from "./NavbarNav/NavbarNav";
import NavbarToggle from "./NavbarToggle";
*/

const MainNavbar = ({ layout, stickyTop }) => {
  const { theme, toggleTheme } = useTheme();

  const classes = classNames(
    "main-navbar",
    "bg-white",
    stickyTop && "sticky-top"
  );

  return (
    <div className={classes}>
      <Container className="p-0">
        <Navbar type="light" className="align-items-stretch flex-md-nowrap p-0">
          {/*
          <NavbarSearch />
          <NavbarNav />
          <NavbarToggle />
          */}
          <div className="ml-auto d-flex align-items-center pr-3">
            <Button
              size="sm"
              theme={theme === 'light' ? 'secondary' : 'light'}
              onClick={toggleTheme}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </Button>
          </div>
        </Navbar>
      </Container>
    </div>
  );
};

MainNavbar.propTypes = {
  /**
   * The layout type where the MainNavbar is used.
   */
  layout: PropTypes.string,
  /**
   * Whether the main navbar is sticky to the top, or not.
   */
  stickyTop: PropTypes.bool
};

MainNavbar.defaultProps = {
  stickyTop: true
};

export default MainNavbar;