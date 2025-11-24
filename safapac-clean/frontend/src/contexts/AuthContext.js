// src/contexts/AuthContext.js

import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();

const TOKEN_STORAGE_KEY = "safapac-token";
const USER_STORAGE_KEY = "safapac-user";
const LOGIN_HISTORY_KEY = "safapac-login-history";

// Create axios instance with base URL
const api = axios.create({
  baseURL: "http://localhost:8000/api/v1",
  timeout: 10000,
});

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return !!window.localStorage.getItem(TOKEN_STORAGE_KEY);
  });

  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window === "undefined") {
      return null;
    }
    const storedUser = window.localStorage.getItem(USER_STORAGE_KEY);
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const [token, setToken] = useState(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  });

  // Set up axios interceptor for authenticated requests
  useEffect(() => {
    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common["Authorization"];
    }
  }, [token]);

  const persistAuthState = (newToken, user = null) => {
    if (typeof window === "undefined") {
      return;
    }
    if (newToken) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
      if (user) {
        window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      }
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      window.localStorage.removeItem(USER_STORAGE_KEY);
    }
  };

  const recordLoginHistory = (email, success) => {
    if (typeof window === "undefined") return;

    const history = JSON.parse(window.localStorage.getItem(LOGIN_HISTORY_KEY) || "[]");
    history.push({
      email,
      timestamp: new Date().toISOString(),
      success
    });

    // Keep only last 100 entries
    if (history.length > 100) {
      history.shift();
    }

    window.localStorage.setItem(LOGIN_HISTORY_KEY, JSON.stringify(history));
  };

  const login = async (email, password) => {
    try {
      console.log("🔐 Attempting login with:", email);
      
      // Call backend login endpoint
      const response = await api.post("/auth/login", {
        email: email.trim(),
        password: password.trim()
      });

      console.log("🔐 Login response:", response.data);

      if (response.data.accessToken) {
        const { accessToken, user } = response.data;

        // Update state
        setToken(accessToken);
        setIsAuthenticated(true);
        setCurrentUser(user);
        persistAuthState(accessToken, user);
        recordLoginHistory(email, true);

        // Set authorization header for future requests
        api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;

        return { success: true, user };
      }

      recordLoginHistory(email, false);
      return { success: false, message: "Invalid response from server" };
    } catch (error) {
      console.error("Login error:", error);
      recordLoginHistory(email, false);
      
      let errorMessage = "Unable to connect to authentication server";
      
      if (error.response) {
        // Server responded with error status
        errorMessage = error.response.data?.detail || 
                      error.response.data?.message || 
                      `Server error: ${error.response.status}`;
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = "No response from server. Please check if the backend is running.";
      }

      return {
        success: false,
        message: errorMessage
      };
    }
  };

  const completeLogin = () => {
    // No longer needed - kept for compatibility
    console.log("completeLogin called (no-op)");
  };

  const logout = () => {
    setToken(null);
    setIsAuthenticated(false);
    setCurrentUser(null);
    persistAuthState(null);
    delete api.defaults.headers.common["Authorization"];
  };

  const signup = async (name, email, password) => {
    try {
      // Note: Backend doesn't have signup endpoint yet, using login as fallback
      // For now, we'll simulate success
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            message: "Account created successfully. Please sign in."
          });
        }, 1000);
      });
    } catch (error) {
      console.error("Signup error:", error);
      return {
        success: false,
        message: "Signup is not available at the moment."
      };
    }
  };

  const forgotPassword = async (email) => {
    try {
      // Note: Backend doesn't have forgot password endpoint yet
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            message: "If an account exists with this email, a password reset link has been sent."
          });
        }, 1000);
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      return {
        success: false,
        message: "Password reset is not available at the moment."
      };
    }
  };

  const resetPassword = async (token, newPassword) => {
    try {
      // Note: Backend doesn't have reset password endpoint yet
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            message: "Password has been reset successfully. Please sign in."
          });
        }, 1000);
      });
    } catch (error) {
      console.error("Reset password error:", error);
      return {
        success: false,
        message: "Password reset failed."
      };
    }
  };

  const value = useMemo(
    () => ({
      isAuthenticated,
      currentUser,
      token,
      login,
      logout,
      completeLogin,
      signup,
      forgotPassword,
      resetPassword,
      api, // Export the axios instance for other components to use
    }),
    [isAuthenticated, currentUser, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);