import axios from "axios";

// API Base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api/v1";

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @param {string} userData.name - User's full name
 * @param {string} userData.email - User's email address
 * @param {string} userData.password - User's password (min 8 characters)
 * @param {string} userData.occupation - User's occupation ("student" or "researcher")
 * @returns {Promise<Object>} - Registration response with user data
 */
export const registerUser = async (userData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, {
      name: userData.name,
      email: userData.email,
      password: userData.password,
      occupation: userData.occupation,
    });
    return response.data;
  } catch (error) {
    // Handle specific error cases
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;

      if (status === 409) {
        throw new Error("Email already registered. Please use a different email or sign in.");
      } else if (status === 422) {
        // Validation error
        const detail = data.detail;
        if (Array.isArray(detail)) {
          const errors = detail.map(err => err.msg).join(", ");
          throw new Error(`Validation error: ${errors}`);
        }
        throw new Error(data.detail || "Invalid input data.");
      } else if (status === 500) {
        throw new Error("Server error. Please try again later.");
      } else {
        throw new Error(data.detail || "Registration failed. Please try again.");
      }
    } else if (error.request) {
      // Request made but no response received
      throw new Error("Cannot connect to server. Please check your connection.");
    } else {
      // Something else happened
      throw new Error(error.message || "Registration failed. Please try again.");
    }
  }
};

/**
 * Login user
 * @param {Object} credentials - Login credentials
 * @param {string} credentials.email - User's email address
 * @param {string} credentials.password - User's password
 * @returns {Promise<Object>} - Login response with access token and user data
 */
export const loginUser = async (credentials) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: credentials.email,
      password: credentials.password,
    });

    // Store the access token in localStorage
    if (response.data.accessToken) {
      localStorage.setItem("access_token", response.data.accessToken);
    }

    return response.data;
  } catch (error) {
    // Handle specific error cases
    if (error.response) {
      const { status, data } = error.response;

      if (status === 401) {
        throw new Error("Invalid email or password.");
      } else if (status === 422) {
        throw new Error("Please enter valid email and password.");
      } else if (status === 500) {
        throw new Error("Server error. Please try again later.");
      } else {
        throw new Error(data.detail || "Login failed. Please try again.");
      }
    } else if (error.request) {
      throw new Error("Cannot connect to server. Please check your connection.");
    } else {
      throw new Error(error.message || "Login failed. Please try again.");
    }
  }
};

/**
 * Logout user
 */
export const logoutUser = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("user");
};

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export const isAuthenticated = () => {
  return !!localStorage.getItem("access_token");
};

/**
 * Get current user from localStorage
 * @returns {Object|null}
 */
export const getCurrentUser = () => {
  const userStr = localStorage.getItem("user");
  return userStr ? JSON.parse(userStr) : null;
};
