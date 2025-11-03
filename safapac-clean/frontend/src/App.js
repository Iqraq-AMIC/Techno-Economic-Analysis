import React, { useState } from "react";
import { BrowserRouter as Router, Route } from "react-router-dom";
import './custom.css';


import routes from "./routes";
import withTracker from "./withTracker";
import { ThemeProvider } from "./contexts/ThemeContext";

import "bootstrap/dist/css/bootstrap.min.css";
import "./shards-dashboard/styles/shards-dashboards.1.1.0.min.css";

export default () => {
  const [selectedCurrency, setSelectedCurrency] = useState("USD");

  return (
    <ThemeProvider>
      <Router basename={""}>
        <div>
          {routes.map((route, index) => {
            return (
              <Route
                key={index}
                path={route.path}
                exact={route.exact}
                component={withTracker(props => {
                  return (
                    <route.layout
                      {...props}
                      selectedCurrency={selectedCurrency}
                      onCurrencyChange={setSelectedCurrency}
                    >
                      <route.component
                        {...props}
                        selectedCurrency={selectedCurrency}
                      />
                    </route.layout>
                  );
                })}
              />
            );
          })}
        </div>
      </Router>
    </ThemeProvider>
  );
};