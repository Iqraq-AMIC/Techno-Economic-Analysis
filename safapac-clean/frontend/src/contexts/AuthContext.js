import React, { createContext, useContext, useMemo, useState } from "react";
import axios from "axios";

const AuthContext = createContext();

const AUTH_STORAGE_KEY = "safapac-authenticated";
const USER_STORAGE_KEY = "safapac-user";
const TOKEN_STORAGE_KEY = "access_token"; // <--- NEW: Required for API calls

// Ensure this matches your FastAPI URL
const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(AUTH_STORAGE_KEY) === "true";
  });

  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window === "undefined") return null;
    const storedUser = window.localStorage.getItem(USER_STORAGE_KEY);
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const persistAuthState = (isAuth, user = null, token = null) => {
    if (typeof window === "undefined") return;
    
    if (isAuth) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, "true");
      if (user) window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token); // Save JWT
    } else {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      window.localStorage.removeItem(USER_STORAGE_KEY);
      window.localStorage.removeItem(TOKEN_STORAGE_KEY); // Clear JWT
    }
  };

  const login = async (username, password) => {
    try {
      console.log("🚀 Sending Login Request to:", `${API_BASE_URL}/auth/login`);
      
      // 1. Send Request to Real Backend
      // Note: Backend expects 'email', but UI might pass it as 'username' arg
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: username, 
        password: password
      });

      // 2. Handle Success (FastAPI returns 200 OK with token)
      // Backend uses camelCase: { accessToken, tokenType, user }
      const { accessToken, user } = response.data;

      // 3. Update State & Storage
      setIsAuthenticated(true);
      setCurrentUser(user);
      persistAuthState(true, user, accessToken);

      return { success: true, user: user };

    } catch (error) {
      console.error("❌ Login Error:", error);
      
      // Handle FastAPI specific error messages (401 Unauthorized, 422 Validation)
      const message = error.response?.data?.detail || "Unable to connect to server";
      return { success: false, message: Array.isArray(message) ? message[0].msg : message };
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    persistAuthState(false);
    // Optional: Force reload to clear any memory states
    window.location.href = "/"; 
  };

  // ... (Keep signup/forgotPassword mocks or implement similarly if needed) ...
  const signup = async () => ({ success: true });
  const forgotPassword = async () => ({ success: true });
  const resetPassword = async () => ({ success: true });

  const value = useMemo(
    () => ({
      isAuthenticated,
      currentUser,
      login,
      logout,
      signup,
      forgotPassword,
      resetPassword,
    }),
    [isAuthenticated, currentUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);