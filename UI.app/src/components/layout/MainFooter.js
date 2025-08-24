import React from "react";
import PropTypes from "prop-types";

const MainFooter = ({ copyright }) => (
  <footer
    style={{
      width: "100%",
      backgroundColor: " #07193D",
      borderTop: "1px solid #dee2e6",
      fontSize: "0.7rem",
      padding: "2px 8px",    // super slim
      textAlign: "right",
    }}
  >
    {copyright}
  </footer>
);

MainFooter.propTypes = {
  copyright: PropTypes.string,
};

MainFooter.defaultProps = {
  copyright: "Copyright © 2025 Aerospace Malaysia Innovation Centre. All Rights Reserved.",
};

export default MainFooter;
