// src/App.js

import React, { Fragment, useMemo, useState } from "react";
import { BrowserRouter as Router, Route, Switch, Redirect } from "react-router-dom";
import './custom.css';


import routes from "./routes";
import withTracker from "./withTracker";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AccessProvider } from "./contexts/AccessContext";
import { ProjectProvider } from "./contexts/ProjectContext";

import "bootstrap/dist/css/bootstrap.min.css";
import "./shards-dashboard/styles/shards-dashboards.1.1.0.min.css";

const AppRoutes = ({ selectedCurrency, setSelectedCurrency }) => {
  const { isAuthenticated } = useAuth();

  const routeElements = useMemo(
    () =>
      routes.map((route, index) => {
        const Layout = route.layout || Fragment;
        const Component = route.component;
        const WrappedComponent = withTracker((props) => {
          const shouldBlockForAuth = route.private && !isAuthenticated;
          const shouldRedirectIfAuthed = route.publicOnly && isAuthenticated;

          if (shouldBlockForAuth) {
            return <Redirect to="/login" />;
          }

          if (shouldRedirectIfAuthed) {
            return <Redirect to={route.redirect || "/TEA"} />;
          }

          const layoutProps =
            Layout === Fragment
              ? {}
              : {
                  ...props,
                  noNavbar: route.noNavbar,
                  noFooter: route.noFooter,
                  selectedCurrency,
                  onCurrencyChange: setSelectedCurrency,
                };

          return (
            <Layout {...layoutProps}>
              <Component {...props} selectedCurrency={selectedCurrency} />
            </Layout>
          );
        });

        return (
          <Route
            key={`route-${index}-${route.path || "redirect"}`}
            path={route.path}
            exact={route.exact}
            component={WrappedComponent}
          />
        );
      }),
    [isAuthenticated, selectedCurrency, setSelectedCurrency]
  );

  return (
    <Switch>
      {routeElements}
      <Redirect to="/login" />
    </Switch>
  );
};

export default () => {
  const [selectedCurrency, setSelectedCurrency] = useState("USD");

  return (
    <ThemeProvider>
      <AuthProvider>
        <ProjectProvider>
          <AccessProvider>
            <Router basename={""}>
              <AppRoutes
                selectedCurrency={selectedCurrency}
                setSelectedCurrency={setSelectedCurrency}
              />
            </Router>
          </AccessProvider>
        </ProjectProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};
