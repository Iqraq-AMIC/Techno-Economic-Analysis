/**
 * API utilities for Project and Scenario management
 */

import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

// ==================== PROJECT API ====================

/**
 * Create a new project
 * @param {string} userId - User ID
 * @param {string} projectName - Project name
 * @returns {Promise} Project data with auto-created Scenario 1
 */
export const createProject = async (userId, projectName) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/projects/create`, {
      user_id: userId,
      project_name: projectName,
    });
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Error creating project:", error);
    return {
      success: false,
      error: error.response?.data?.detail || error.message,
    };
  }
};

/**
 * List all projects for a user
 * @param {string} userId - User ID
 * @returns {Promise} Array of projects
 */
export const listProjectsByUser = async (userId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/projects/list-by-user`, {
      params: { user_id: userId },
    });
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
 * Get a single project by ID
 * @param {string} projectId - Project ID
 * @returns {Promise} Project data
 */
export const getProject = async (projectId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/projects/${projectId}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Error getting project:", error);
    return {
      success: false,
      error: error.response?.data?.detail || error.message,
    };
  }
};

// ==================== SCENARIO API ====================

/**
 * Create a new scenario in a project
 * @param {string} projectId - Project ID
 * @param {string} scenarioName - Scenario name (e.g., "Scenario 2")
 * @param {number} order - Display order
 * @returns {Promise} Scenario data
 */
export const createScenario = async (projectId, scenarioName, order = null) => {
  try {
    const payload = {
      project_id: projectId,
      scenario_name: scenarioName,
    };
    if (order !== null) {
      payload.order = order;
    }

    const response = await axios.post(`${API_BASE_URL}/scenarios/create`, payload);
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Error creating scenario:", error);
    return {
      success: false,
      error: error.response?.data?.detail || error.message,
    };
  }
};

/** newly added */
/**
 * Delete a project and all its scenarios
 * @param {string} projectId - Project ID
 * @returns {Promise} Success/error response
 */
export const deleteProject = async (projectId) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/projects/${projectId}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Error deleting project:", error);
    return {
      success: false,
      error: error.response?.data?.detail || error.message,
    };
  }
};


/**
 * List all scenarios for a project
 * @param {string} projectId - Project ID
 * @returns {Promise} Array of scenarios
 */
export const listScenarios = async (projectId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/scenarios/list`, {
      params: { project_id: projectId },
    });
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Error listing scenarios:", error);
    return {
      success: false,
      error: error.response?.data?.detail || error.message,
    };
  }
};

/**
 * Get a single scenario by ID
 * @param {string} scenarioId - Scenario ID
 * @returns {Promise} Scenario data with inputs and outputs
 */
export const getScenario = async (scenarioId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/scenarios/${scenarioId}`);
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
 * Update scenario inputs, outputs, or name
 * @param {string} scenarioId - Scenario ID
 * @param {object} updates - Object with optional fields: scenario_name, inputs, outputs
 * @returns {Promise} Updated scenario data
 */
export const updateScenario = async (scenarioId, updates) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/scenarios/${scenarioId}`,
      updates
    );
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Error updating scenario:", error);
    return {
      success: false,
      error: error.response?.data?.detail || error.message,
    };
  }
};

/**
 * Delete a scenario
 * @param {string} scenarioId - Scenario ID
 * @returns {Promise} Success/error response
 */
export const deleteScenario = async (scenarioId) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/scenarios/${scenarioId}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Error deleting scenario:", error);
    return {
      success: false,
      error: error.response?.data?.detail || error.message,
    };
  }
};

/**
 * Save scenario inputs (convenience wrapper for updateScenario)
 * @param {string} scenarioId - Scenario ID
 * @param {object} inputs - Input data object
 * @returns {Promise} Updated scenario data
 */
export const saveScenarioInputs = async (scenarioId, inputs) => {
  return updateScenario(scenarioId, { inputs });
};

/**
 * Save scenario outputs (convenience wrapper for updateScenario)
 * @param {string} scenarioId - Scenario ID
 * @param {object} outputs - Output data object
 * @returns {Promise} Updated scenario data
 */
export const saveScenarioOutputs = async (scenarioId, outputs) => {
  return updateScenario(scenarioId, { outputs });
};
