import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();

const AUTH_STORAGE_KEY = "safapac-authenticated";
const USER_STORAGE_KEY = "safapac-user";
const LOGIN_HISTORY_KEY = "safapac-login-history";

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.localStorage.getItem(AUTH_STORAGE_KEY) === "true";
  });

  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window === "undefined") {
      return null;
    }
    const storedUser = window.localStorage.getItem(USER_STORAGE_KEY);
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const persistAuthState = (nextState, user = null) => {
    if (typeof window === "undefined") {
      return;
    }
    if (nextState) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, "true");
      if (user) {
        window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      }
    } else {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      window.localStorage.removeItem(USER_STORAGE_KEY);
    }
  };

  const recordLoginHistory = (username, success) => {
    if (typeof window === "undefined") return;

    const history = JSON.parse(window.localStorage.getItem(LOGIN_HISTORY_KEY) || "[]");
    history.push({
      username,
      timestamp: new Date().toISOString(),
      success
    });

    // Keep only last 100 entries
    if (history.length > 100) {
      history.shift();
    }

    window.localStorage.setItem(LOGIN_HISTORY_KEY, JSON.stringify(history));
  };

  const login = async (username, password) => {
    try {
      // Call backend to validate credentials against pw.csv
      const response = await axios.post("http://localhost:8000/auth/login", {
        username: username.trim(),
        password: password.trim()
      });

      if (response.data.success) {
        const userData = response.data.user;

        // Set authenticated immediately to allow redirect to TEA
        setIsAuthenticated(true);
        setCurrentUser(userData);
        persistAuthState(true, userData);
        recordLoginHistory(username, true);

        return { success: true, user: userData };
      }

      recordLoginHistory(username, false);
      return { success: false, message: response.data.message || "Invalid credentials" };
    } catch (error) {
      console.error("Login error:", error);
      recordLoginHistory(username, false);
      return {
        success: false,
        message: error.response?.data?.detail || "Unable to connect to authentication server"
      };
    }
  };

  const completeLogin = () => {
    // No longer needed - kept for compatibility
    console.log("completeLogin called (no-op)");
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    persistAuthState(false);
  };

  const signup = async (_username, _email, _password) => {
    // TODO: Replace with actual API call to backend
    // For now, return success to allow frontend testing
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          message: "Account created successfully. Please sign in."
        });
      }, 1000);
    });
  };

  const forgotPassword = async (_email) => {
    // TODO: Replace with actual API call to backend
    // For now, return success to allow frontend testing
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          message: "If an account exists with this email, a password reset link has been sent."
        });
      }, 1000);
    });
  };

  const resetPassword = async (_token, _newPassword) => {
    // TODO: Replace with actual API call to backend
    // For now, return success to allow frontend testing
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          message: "Password has been reset successfully. Please sign in."
        });
      }, 1000);
    });
  };

  const value = useMemo(
    () => ({
      isAuthenticated,
      currentUser,
      login,
      logout,
      completeLogin,
      signup,
      forgotPassword,
      resetPassword,
    }),
    [isAuthenticated, currentUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

