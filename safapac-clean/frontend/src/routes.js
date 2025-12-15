import React from "react";
import { Redirect } from "react-router-dom";

// Layout Types
import { DefaultLayout } from "./layouts";

// Route Views
import Tables from "./views/Tables";
import AnalysisDashboardv2 from "./views/AnalysisDashboardv2";
import Login from "./views/Login";

export default [
  {
    path: "/login",
    exact: true,
    layout: React.Fragment,
    component: Login,
    publicOnly: true,
    redirect: "/TEA"
  },
  {
    path: "/",
    exact: true,
    layout: React.Fragment,
    component: () => <Redirect to="/login" />
  },
  {
    path: "/tables",
    layout: DefaultLayout,
    component: Tables,
    private: true
  },
  {
    path: "/TEA",
    layout: DefaultLayout,
    component: AnalysisDashboardv2,
    private: true
  }
];
