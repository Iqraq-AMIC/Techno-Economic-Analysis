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

// Helper: Check initial auth state - allow if refresh token exists (will refresh on mount)
const getInitialAuthState = () => {
  if (typeof window === "undefined") return { isAuth: false, user: null };

  const accessToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  const refreshToken = window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  const authFlag = window.localStorage.getItem(AUTH_STORAGE_KEY) === "true";
  const storedUser = window.localStorage.getItem(USER_STORAGE_KEY);

  // If access token is valid, user is authenticated
  if (authFlag && accessToken && !isTokenExpired(accessToken)) {
    return {
      isAuth: true,
      user: storedUser ? JSON.parse(storedUser) : null
    };
  }

  // If access token is expired BUT refresh token exists, keep user "authenticated"
  // The token will be refreshed on mount via useEffect
  if (authFlag && refreshToken && !isTokenExpired(refreshToken)) {
    return {
      isAuth: true,
      user: storedUser ? JSON.parse(storedUser) : null,
      needsRefresh: true
    };
  }

  // No valid tokens - clear everything and return unauthenticated
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.localStorage.removeItem(USER_STORAGE_KEY);
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  return { isAuth: false, user: null };
};

export const AuthProvider = ({ children }) => {
  const initialState = getInitialAuthState();

  const [isAuthenticated, setIsAuthenticated] = useState(initialState.isAuth);
  const [currentUser, setCurrentUser] = useState(initialState.user);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  // Refresh token on mount if access token is expired but refresh token is valid
  useEffect(() => {
    const refreshTokenOnMount = async () => {
      const accessToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);
      const refreshToken = window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);

      // Only refresh if access token is expired and refresh token exists
      if (!accessToken || !isTokenExpired(accessToken) || !refreshToken) {
        return;
      }

      // Check if refresh token itself is expired
      if (isTokenExpired(refreshToken)) {
        console.log("Refresh token expired, logging out...");
        handleLogout(true);
        return;
      }

      console.log("Access token expired, attempting refresh...");
      setIsRefreshing(true);

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken: refreshToken
        });

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

        // Update tokens in localStorage
        window.localStorage.setItem(TOKEN_STORAGE_KEY, newAccessToken);
        window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, newRefreshToken);

        console.log("Token refreshed successfully on mount");
      } catch (error) {
        console.error("Failed to refresh token on mount:", error);
        // Clear auth and redirect to login
        handleLogout(true);
      } finally {
        setIsRefreshing(false);
      }
    };

    refreshTokenOnMount();
  }, [handleLogout]);

  // ... (Keep signup/forgotPassword mocks or implement similarly if needed) ...
  const signup = async () => ({ success: true });
  const forgotPassword = async () => ({ success: true });
  const resetPassword = async () => ({ success: true });

  const value = useMemo(
    () => ({
      isAuthenticated,
      currentUser,
      isRefreshing,
      login,
      logout,
      signup,
      forgotPassword,
      resetPassword,
    }),
    [isAuthenticated, currentUser, isRefreshing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);