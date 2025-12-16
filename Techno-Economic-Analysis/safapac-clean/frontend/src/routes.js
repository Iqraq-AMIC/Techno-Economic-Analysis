import React from "react";
import { Redirect } from "react-router-dom";

// Layout Types
import { DefaultLayout } from "./layouts";

// Route Views
import Tables from "./views/Tables";
import AnalysisDashboard from "./views/AnalysisDashboard";
import Login from "./views/Login";
import LoginForm from "./views/LoginForm";
import SignUp from "./views/SignUp";

export default [
  {
    path: "/login",
    exact: true,
    layout: React.Fragment,
    component: LoginForm,
    publicOnly: true,
    redirect: "/TEA"
  },
  {
    path: "/signup",
    exact: true,
    layout: React.Fragment,
    component: SignUp,
    publicOnly: true,
    redirect: "/TEA"
  },
  {
    path: "/login-original",
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
    component: AnalysisDashboard,
    private: true
  }
];
