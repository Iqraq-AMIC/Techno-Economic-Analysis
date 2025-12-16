import React from "react";
import PropTypes from "prop-types";
import { useTheme } from "../../contexts/ThemeContext";

const MainFooter = ({ copyright }) => {
  const { colors } = useTheme();

  return (
    <footer
      style={{
        width: "100%",
        backgroundColor: colors.footerBackground,
        borderTop: `1px solid ${colors.border}`,
        fontSize: "0.7rem",
        padding: "2px 8px",    // super slim
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span style={{ color: colors.text, fontWeight: "400" }}>ver4.0.0 alpha</span>
      <span style={{ color: colors.text, fontWeight: "400" }}>{copyright}</span>
    </footer>
  );
};

MainFooter.propTypes = {
  copyright: PropTypes.string,
};

MainFooter.defaultProps = {
  copyright: "Copyright © 2025 Aerospace Malaysia Innovation Centre. All Rights Reserved.",
};

export default MainFooter;
