// src/api/projectApi.js

import axios from "axios";
import { useAuth } from "../contexts/AuthContext";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/api/v1";

// Create axios instance with auth interceptor
const createApiInstance = () => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
  });

  // Add auth token to requests
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem("safapac-token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  return instance;
};

const api = createApiInstance();

// ==================== PROJECT API ====================

/**
 * Create a new project
 * @param {string} projectName - Project name
 * @param {number} initialProcessId - Initial process ID (optional)
 * @param {number} initialFeedstockId - Initial feedstock ID (optional)
 * @param {number} initialCountryId - Initial country ID (optional)
 * @returns {Promise} Project data
 */

export const createProject = async (projectName, initialProcessId = null, initialFeedstockId = null, initialCountryId = null) => {
  try {
    const payload = {
      project_name: projectName, // Backend expects snake_case
    };

    // Only include if provided
    if (initialProcessId !== null) payload.initial_process_id = initialProcessId;
    if (initialFeedstockId !== null) payload.initial_feedstock_id = initialFeedstockId;
    if (initialCountryId !== null) payload.initial_country_id = initialCountryId;
    
    console.log("📤 Creating project with payload:", payload);
    const response = await api.post("/projects", payload);

    // Map backend response to frontend expected format
    const mappedResponse = {
      id: response.data.id,
      projectName: response.data.project_name,
      userId: response.data.user_id,
      initialProcess: response.data.initial_process,
      initialFeedstock: response.data.initial_feedstock,
      initialCountry: response.data.initial_country,
      scenarioCount: response.data.scenario_count || 1, // Backend auto-creates Scenario 1
      createdAt: response.data.created_at,
      updatedAt: response.data.updated_at
    };
    console.log("✅ Project created successfully:", mappedResponse);
    return { success: true, data: mappedResponse };
  } catch (error) {
    console.error("Error creating project:", error);
    return {
      success: false,
      error: error.response?.data?.detail || error.message,
    };
  }
};

/**
 * List all projects for the current user
 * @returns {Promise} Array of projects
 */
export const listProjectsByUser = async () => {
  try {
    const response = await api.get("/projects");
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Error listing projects:", error);
    return {
      success: false,
      error: error.response?.data?.detail || error.message,
    };
  }
};

/**
 * Get a single project by ID with scenarios
 * @param {string} projectId - Project ID (UUID)
 * @returns {Promise} Project data with scenarios
 */
export const getProject = async (projectId) => {
  try {
    const response = await api.get(`/projects/${projectId}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Error getting project:", error);
    return {
      success: false,
      error: error.response?.data?.detail || error.message,
    };
  }
};

/**
 * Update a project
 * @param {string} projectId - Project ID (UUID)
 * @param {object} updates - Project updates
 * @returns {Promise} Updated project data
 */
export const updateProject = async (projectId, updates) => {
  try {
    const response = await api.put(`/projects/${projectId}`, updates);
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Error updating project:", error);
    return {
      success: false,
      error: error.response?.data?.detail || error.message,
    };
  }
};

/**
 * Delete a project
 * @param {string} projectId - Project ID (UUID)
 * @returns {Promise} Success/error response
 */
export const deleteProject = async (projectId) => {
  try {
    await api.delete(`/projects/${projectId}`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting project:", error);
    return {
      success: false,
      error: error.response?.data?.detail || error.message,
    };
  }
};

// ==================== SCENARIO API ====================

/**
 * Create a new scenario in a project
 * @param {string} projectId - Project ID (UUID)
 * @param {string} scenarioName - Scenario name
 * @param {number} processId - Process technology ID
 * @param {number} feedstockId - Feedstock ID
 * @param {number} countryId - Country ID
 * @param {object} userInputs - User inputs object
 * @param {number} scenarioOrder - Display order (optional)
 * @returns {Promise} Scenario data
 */

export const createScenario = async (
  projectId,
  scenarioName,
  processId,
  feedstockId,
  countryId,
  userInputs,
  scenarioOrder = null
) => {
  try {
    const payload = {
      scenario_name: scenarioName, // snake_case for backend
      process_id: processId,
      feedstock_id: feedstockId,
      country_id: countryId,
      user_inputs: userInputs, // Make sure this matches backend schema
    };

    if (scenarioOrder !== null) {
      payload.scenario_order = scenarioOrder;
    }

    const response = await api.post(`/projects/${projectId}/scenarios`, payload);

    // Map backend response to frontend format
    const mappedScenario = {
      id: response.data.id,
      projectId: response.data.project_id,
      scenarioName: response.data.scenario_name,
      scenarioOrder: response.data.scenario_order,
      process: response.data.process,
      feedstock: response.data.feedstock,
      country: response.data.country,
      userInputs: response.data.user_inputs,
      createdAt: response.data.created_at,
      updatedAt: response.data.updated_at
    };

    return { success: true, data: mappedScenario };
  } catch (error) {
    console.error("Error creating scenario:", error);
    return {
      success: false,
      error: error.response?.data?.detail || error.message,
    };
  }
};

/**
 * List all scenarios for a project
 * @param {string} projectId - Project ID (UUID)
 * @returns {Promise} Array of scenarios
 */
export const listScenarios = async (projectId) => {
  try {
    const response = await api.get(`/projects/${projectId}/scenarios`);
    
    // Map backend scenarios to frontend format
    const mappedScenarios = response.data.map(scenario => ({
      id: scenario.id,
      projectId: scenario.project_id,
      scenarioName: scenario.scenario_name,
      scenarioOrder: scenario.scenario_order,
      process: scenario.process,
      feedstock: scenario.feedstock,
      country: scenario.country,
      userInputs: scenario.user_inputs,
      technoEconomics: scenario.techno_economics,
      financialAnalysis: scenario.financial_analysis,
      createdAt: scenario.created_at,
      updatedAt: scenario.updated_at
    }));
    
    return { success: true, data: mappedScenarios };
  } catch (error) {
    console.error("Error listing scenarios:", error);
    return {
      success: false,
      error: error.response?.data?.detail || error.message,
    };
  }
};

/**
 * Get a single scenario by ID with full details
 * @param {string} scenarioId - Scenario ID (UUID)
 * @returns {Promise} Scenario data with inputs and outputs
 */
export const getScenario = async (scenarioId) => {
  try {
    const response = await api.get(`/scenarios/${scenarioId}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Error getting scenario:", error);
    return {
      success: false,
      error: error.response?.data?.detail || error.message,
    };
  }
};

/**
 * Update scenario
 * @param {string} scenarioId - Scenario ID (UUID)
 * @param {object} updates - Object with optional fields: scenario_name, user_inputs, scenario_order
 * @returns {Promise} Updated scenario data
 */
export const updateScenario = async (scenarioId, updates) => {
  try {
    console.log("📤 Sending scenario update:", {
      scenarioId,
      updates,
      updateKeys: Object.keys(updates)
    });

    // Convert frontend field names to backend expected names
    const backendUpdates = {};

    if (updates.scenarioName !== undefined) {
      backendUpdates.scenario_name = updates.scenarioName;
    }

    if (updates.userInputs !== undefined) {
      backendUpdates.user_inputs = updates.userInputs;
    }

    if (updates.technoEconomics !== undefined) {
      backendUpdates.techno_economics = updates.technoEconomics;
    }

    if (updates.financialAnalysis !== undefined) {
      backendUpdates.financial_analysis = updates.financialAnalysis;
    }

    if (updates.scenarioOrder !== undefined) {
      backendUpdates.scenario_order = updates.scenarioOrder;
    }

    console.log("🔧 Converted updates for backend:", backendUpdates);

    const response = await api.put(`/scenarios/${scenarioId}`, backendUpdates);

    // Map response back to frontend format
    const mappedResponse = {
      id: response.data.id,
      projectId: response.data.project_id,
      scenarioName: response.data.scenario_name,
      scenarioOrder: response.data.scenario_order,
      process: response.data.process,
      feedstock: response.data.feedstock,
      country: response.data.country,
      userInputs: response.data.user_inputs,
      technoEconomics: response.data.techno_economics,
      financialAnalysis: response.data.financial_analysis,
      createdAt: response.data.created_at,
      updatedAt: response.data.updated_at
    };

    return { success: true, data: mappedResponse };
  } catch (error) {
    console.error("❌ Error updating scenario - Full error:", error);
    console.error("❌ Error response data:", error.response?.data);
    console.error("❌ Error response status:", error.response?.status);

    return {
      success: false,
      error: error.response?.data?.detail || error.message,
      status: error.response?.status
    };
  }
};

/**
 * Delete a scenario
 * @param {string} scenarioId - Scenario ID (UUID)
 * @returns {Promise} Success/error response
 */
export const deleteScenario = async (scenarioId) => {
  try {
    await api.delete(`/scenarios/${scenarioId}`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting scenario:", error);
    return {
      success: false,
      error: error.response?.data?.detail || error.message,
    };
  }
};

/**
 * Run calculations for a scenario
 * @param {string} scenarioId - Scenario ID (UUID)
 * @returns {Promise} Calculation results
 */
export const calculateScenario = async (scenarioId) => {
  try {
    const response = await api.post(`/scenarios/${scenarioId}/calculate`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Error calculating scenario:", error);
    return {
      success: false,
      error: error.response?.data?.detail || error.message,
    };
  }
};

// In projectApi.js - UPDATE these convenience functions:
export const saveScenarioInputs = async (scenarioId, userInputs) => {
  return updateScenario(scenarioId, { user_inputs: userInputs }); // Use snake_case
};

export const saveScenarioOutputs = async (scenarioId, technoEconomics, financialAnalysis) => {
  return updateScenario(scenarioId, {
    techno_economics: technoEconomics, // Use snake_case
    financial_analysis: financialAnalysis // Use snake_case
  });
};

// ==================== MASTER DATA API ====================

/**
 * Get all master data for dropdowns and references
 * @returns {Promise} Master data object
 */
export const getMasterData = async () => {
  try {
    const response = await api.get("/master-data");
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Error getting master data:", error);
    return {
      success: false,
      error: error.response?.data?.detail || error.message,
    };
  }
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get reference data for a specific process-feedstock-country combination
 * @param {string} processName - Process technology name
 * @param {string} feedstockName - Feedstock name
 * @param {string} countryName - Country name
 * @returns {Promise} Reference data
 */
export const getReferenceData = async (processName, feedstockName, countryName) => {
  try {
    // This would call your backend's reference data endpoint
    // For now, we'll use the master data and filter
    const masterData = await getMasterData();
    if (!masterData.success) {
      return masterData;
    }

    // Find the specific reference data (you might need to adjust this logic)
    const refData = {
      process: masterData.data.processes.find(p => p.name === processName),
      feedstock: masterData.data.feedstocks.find(f => f.name === feedstockName),
      country: masterData.data.countries.find(c => c.name === countryName),
      utilities: masterData.data.utilities,
      products: masterData.data.products,
    };

    return { success: true, data: refData };
  } catch (error) {
    console.error("Error getting reference data:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

export default api;