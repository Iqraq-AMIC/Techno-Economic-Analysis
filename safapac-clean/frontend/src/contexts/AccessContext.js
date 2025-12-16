import React, { createContext, useContext, useMemo, useState } from "react";
import accessConfig from "../config/access.json";

const AccessContext = createContext();

const ACCESS_STORAGE_KEY = "safapac-access-level";
const AVAILABLE_LEVELS = ["CORE", "ADVANCE", "ROADSHOW"];

export const AccessProvider = ({ children }) => {
  const [selectedAccess, setSelectedAccess] = useState(() => {
    if (typeof window === "undefined") {
      return "CORE";
    }
    const stored = window.localStorage.getItem(ACCESS_STORAGE_KEY);
    return AVAILABLE_LEVELS.includes(stored) ? stored : "CORE";
  });

  const persistAccessLevel = (level) => {
    if (typeof window === "undefined") {
      return;
    }
    if (AVAILABLE_LEVELS.includes(level)) {
      window.localStorage.setItem(ACCESS_STORAGE_KEY, level);
    }
  };

  const changeAccessLevel = (level) => {
    if (AVAILABLE_LEVELS.includes(level)) {
      setSelectedAccess(level);
      persistAccessLevel(level);
    }
  };

  const hasAccess = (category, feature) => {
    const levelConfig = accessConfig[selectedAccess];
    if (!levelConfig || !levelConfig[category]) {
      return false;
    }

    const allowedFeatures = levelConfig[category];

    // If "All" is included, grant access to everything
    if (allowedFeatures.includes("All")) {
      return true;
    }

    return allowedFeatures.includes(feature);
  };

  const getAccessibleFeatures = (category) => {
    const levelConfig = accessConfig[selectedAccess];
    if (!levelConfig || !levelConfig[category]) {
      return [];
    }
    return levelConfig[category];
  };

  const value = useMemo(
    () => ({
      selectedAccess,
      availableLevels: AVAILABLE_LEVELS,
      changeAccessLevel,
      hasAccess,
      getAccessibleFeatures,
      accessConfig,
    }),
    [selectedAccess]
  );

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
};

export const useAccess = () => {
  const context = useContext(AccessContext);
  if (!context) {
    throw new Error("useAccess must be used within an AccessProvider");
  }
  return context;
};
