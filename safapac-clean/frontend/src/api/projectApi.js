import axios from "axios";

// Ensure this matches your FastAPI URL
const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

// 1. Create specific client
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// 2. INTERCEPTOR: Automatically attach Token (Solves the 403 Error)
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- HELPER: Transform Backend Data to Frontend Shape ---
const transformProject = (p) => ({
  id: p.id, // Keep 'id' for components that use it directly
  project_id: p.id, // Also provide project_id for ProjectContext compatibility
  project_name: p.projectName,
  scenario_count: p.scenarioCount,
  created_at: p.createdAt,
  scenarios: p.scenarios ? p.scenarios.map(transformScenario) : []
});

const transformScenario = (s) => ({
  scenario_id: s.id,
  project_id: s.projectId,
  scenario_name: s.scenarioName,
  scenario_order: s.scenarioOrder,
  process: s.process,
  feedstock: s.feedstock,
  country: s.country,
  // Map backend JSON blobs to frontend keys
  inputs: s.userInputs || {}, 
  outputs: s.technoEconomics || {},
  financials: s.financialAnalysis || {}
});

// ==================== PROJECT API ====================

export const createProject = async (userId, projectName) => {
  try {
    // We ignore userId here because the Token identifies the user
    const response = await apiClient.post("/projects", {
      project_name: projectName,
    });

    // Transform single project response
    const transformed = transformProject(response.data);

    // Backend creates Scenario 1 but doesn't return it in the response
    // We need to fetch scenarios separately
    const scenariosResponse = await apiClient.get(`/projects/${transformed.project_id}/scenarios`);
    const scenarios = (scenariosResponse.data || []).map(transformScenario);

    return {
      success: true,
      data: {
        ...transformed,
        scenarios: scenarios
      }
    };
  } catch (error) {
    console.error("Error creating project:", error);
    return { success: false, error: error.response?.data?.detail || error.message };
  }
};

export const listProjectsByUser = async (userId) => {
  try {
    // Backend gets user from Token, so no param needed
    const response = await apiClient.get("/projects");
    return { 
      success: true, 
      data: response.data.map(transformProject) 
    };
  } catch (error) {
    console.error("Error listing projects:", error);
    return { success: false, error: error.response?.data?.detail || error.message };
  }
};

export const deleteProject = async (projectId) => {
  try {
    await apiClient.delete(`/projects/${projectId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.response?.data?.detail || error.message };
  }
};

// ==================== SCENARIO API ====================

export const createScenario = async (projectId, scenarioName, order = null) => {
  try {
    // Backend expects POST /api/v1/projects/{project_id}/scenarios
    const response = await apiClient.post(`/projects/${projectId}/scenarios`, {
      scenario_name: scenarioName,
      scenario_order: order
    });
    return { success: true, data: transformScenario(response.data) };
  } catch (error) {
    console.error("Error creating scenario:", error);
    return { success: false, error: error.response?.data?.detail || error.message };
  }
};

export const listScenarios = async (projectId) => {
  try {
    const response = await apiClient.get(`/projects/${projectId}/scenarios`);
    return { success: true, data: response.data.map(transformScenario) };
  } catch (error) {
    return { success: false, error: error.response?.data?.detail || error.message };
  }
};

export const getScenario = async (scenarioId) => {
  try {
    const response = await apiClient.get(`/scenarios/${scenarioId}`);
    return { success: true, data: transformScenario(response.data) };
  } catch (error) {
    return { success: false, error: error.response?.data?.detail || error.message };
  }
};

export const updateScenario = async (scenarioId, updates) => {
  try {
    // Only handles metadata updates (e.g., renaming)
    // Does NOT trigger calculation - use calculateScenario() for that
    const response = await apiClient.put(`/scenarios/${scenarioId}`, {
      scenario_name: updates.scenario_name
    });
    return { success: true, data: transformScenario(response.data) };
  } catch (error) {
    console.error("Error updating scenario:", error);
    return { success: false, error: error.response?.data?.detail || error.message };
  }
};

// Explicit calculation - only called when user clicks "Calculate" button
export const calculateScenario = async (scenarioId, inputs) => {
  try {
    const response = await apiClient.post(`/scenarios/${scenarioId}/calculate`, inputs);

    // Calculate returns { technoEconomics, financials, resolvedInputs }
    const result = response.data;
    return {
      success: true,
      data: {
        scenario_id: scenarioId,
        inputs: result.resolvedInputs,
        outputs: result.technoEconomics,
        financials: result.financials,
      }
    };
  } catch (error) {
    console.error("Error calculating scenario:", error);
    return { success: false, error: error.response?.data?.detail || error.message };
  }
};

export const deleteScenario = async (scenarioId) => {
  try {
    await apiClient.delete(`/scenarios/${scenarioId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.response?.data?.detail || error.message };
  }
};