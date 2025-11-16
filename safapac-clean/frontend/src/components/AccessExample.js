import React from "react";
import { Card, CardBody } from "shards-react";
import { useAccess } from "../contexts/AccessContext";

/**
 * Example component showing how to use access control
 *
 * This demonstrates how to conditionally render features based on the user's access level
 */
const AccessExample = () => {
  const { selectedAccess, hasAccess, getAccessibleFeatures } = useAccess();

  return (
    <div>
      <h4 style={{ marginBottom: "1.5rem" }}>
        Current Access Level: <strong>{selectedAccess}</strong>
      </h4>

      {/* Example 1: Check if user has access to a specific feature */}
      <Card className="mb-3">
        <CardBody>
          <h5>Conversion Features</h5>
          <ul>
            {hasAccess("Conversion", "Plant Capacity") && (
              <li>Plant Capacity (CORE+)</li>
            )}
            {hasAccess("Conversion", "Up-time") && (
              <li>Up-time (CORE+)</li>
            )}
            {hasAccess("Conversion", "Plant Conversion Carbon Intensity") && (
              <li>Plant Conversion Carbon Intensity (ADVANCE+)</li>
            )}
            {hasAccess("Conversion", "Maintenance Cost") && (
              <li>Maintenance Cost (ADVANCE+)</li>
            )}
            {selectedAccess === "ROADSHOW" && (
              <li>All Conversion Features (ROADSHOW)</li>
            )}
          </ul>
        </CardBody>
      </Card>

      {/* Example 2: Get all accessible features for a category */}
      <Card className="mb-3">
        <CardBody>
          <h5>Feedstock Features</h5>
          <p>Accessible features: {getAccessibleFeatures("Feedstock").join(", ")}</p>
        </CardBody>
      </Card>

      {/* Example 3: Show economic outputs */}
      <Card className="mb-3">
        <CardBody>
          <h5>Economic Outputs</h5>
          <ul>
            {hasAccess("Economic Outputs", "Payback Period") && (
              <li>Payback Period (CORE+)</li>
            )}
            {hasAccess("Economic Outputs", "OPEX") && (
              <li>OPEX (ADVANCE+)</li>
            )}
            {hasAccess("Economic Outputs", "IRR") && (
              <li>IRR (ADVANCE+)</li>
            )}
            {hasAccess("Economic Outputs", "NPV") && (
              <li>NPV (ROADSHOW)</li>
            )}
            {hasAccess("Economic Outputs", "LCCA") && (
              <li>LCCA (ROADSHOW)</li>
            )}
            {hasAccess("Economic Outputs", "LCOP") && (
              <li>LCOP (ROADSHOW)</li>
            )}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
};

export default AccessExample;
