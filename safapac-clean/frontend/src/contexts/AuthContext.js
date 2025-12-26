import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from "react";
import axios from "axios";

const AuthContext = createContext();

const AUTH_STORAGE_KEY = "safapac-authenticated";
const USER_STORAGE_KEY = "safapac-user";
const TOKEN_STORAGE_KEY = "access_token"; // <--- NEW: Required for API calls
const REFRESH_TOKEN_STORAGE_KEY = "refresh_token";

// Ensure this matches your FastAPI URL
const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

// Helper: Decode JWT and get expiration time
const getTokenExpiration = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null; // Convert to milliseconds
  } catch {
    return null;
  }
};

// Helper: Check if token is expired
const isTokenExpired = (token) => {
  const exp = getTokenExpiration(token);
  if (!exp) return true;
  return Date.now() >= exp;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === "undefined") return false;

    // Check if token exists and is not expired
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    const authFlag = window.localStorage.getItem(AUTH_STORAGE_KEY) === "true";

    if (authFlag && token && isTokenExpired(token)) {
      // Token expired - clear auth state
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      window.localStorage.removeItem(USER_STORAGE_KEY);
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      return false;
    }

    return authFlag && token && !isTokenExpired(token);
  });

  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window === "undefined") return null;

    // Don't return user if token is expired
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token || isTokenExpired(token)) return null;

    const storedUser = window.localStorage.getItem(USER_STORAGE_KEY);
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const persistAuthState = (isAuth, user = null, token = null, refreshToken = null) => {
    if (typeof window === "undefined") return;

    if (isAuth) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, "true");
      if (user) window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token); // Save access token
      if (refreshToken) window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken); // Save refresh token
    } else {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      window.localStorage.removeItem(USER_STORAGE_KEY);
      window.localStorage.removeItem(TOKEN_STORAGE_KEY); // Clear access token
      window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY); // Clear refresh token
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

      // 2. Handle Success (FastAPI returns 200 OK with tokens)
      // Backend uses camelCase: { accessToken, refreshToken, tokenType, user }
      const { accessToken, refreshToken, user } = response.data;

      // 3. Update State & Storage
      setIsAuthenticated(true);
      setCurrentUser(user);
      persistAuthState(true, user, accessToken, refreshToken);

      return { success: true, user: user };

    } catch (error) {
      console.error("❌ Login Error:", error);
      
      // Handle FastAPI specific error messages (401 Unauthorized, 422 Validation)
      const message = error.response?.data?.detail || "Unable to connect to server";
      return { success: false, message: Array.isArray(message) ? message[0].msg : message };
    }
  };

  // Memoized logout to use in useEffect without causing re-renders
  const handleLogout = useCallback((redirect = true) => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    persistAuthState(false);
    if (redirect) {
      window.location.href = "/";
    }
  }, []);

  const logout = () => {
    handleLogout(true);
  };

  // Listen for auth:logout event from API interceptor
  useEffect(() => {
    const handleAuthLogout = (event) => {
      console.log("Auth logout event received:", event.detail?.reason);
      // State already cleared by interceptor, just update React state
      setIsAuthenticated(false);
      setCurrentUser(null);
    };

    window.addEventListener("auth:logout", handleAuthLogout);
    return () => window.removeEventListener("auth:logout", handleAuthLogout);
  }, []);

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