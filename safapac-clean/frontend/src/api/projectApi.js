// src/api/projectApi.js

import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/api/v1";

const createApiInstance = () => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
  });

  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem("safapac-token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  return instance;
};

const api = createApiInstance();

// ==================== PROJECT API ====================

export const createProject = async (projectName, initialProcessId = null, initialFeedstockId = null, initialCountryId = null) => {
  try {
    // INPUT: Send snake_case to backend
    const payload = {
      project_name: projectName,
    };

    if (initialProcessId !== null) payload.initial_process_id = initialProcessId;
    if (initialFeedstockId !== null) payload.initial_feedstock_id = initialFeedstockId;
    if (initialCountryId !== null) payload.initial_country_id = initialCountryId;
    
    console.log("📤 Creating project with payload:", payload);
    const response = await api.post("/projects", payload);

    const backendData = response.data;
    console.log("🔍 Backend raw response:", backendData);
    
    // OUTPUT: Backend sends camelCase via Pydantic AliasGenerator
    const mappedResponse = {
      id: backendData.id,
      projectName: backendData.projectName, // Fixed: Read camelCase
      userId: backendData.userId,           // Fixed: Read camelCase
      initialProcess: backendData.initialProcess,
      initialFeedstock: backendData.initialFeedstock,
      initialCountry: backendData.initialCountry,
      scenarioCount: backendData.scenarioCount || 1,
      createdAt: backendData.createdAt,
      updatedAt: backendData.updatedAt
    };
    
    console.log("✅ Project created successfully (mapped):", mappedResponse);
    return { success: true, project: mappedResponse }; // Note: Context expects 'project' key, not 'data'
  } catch (error) {
    console.error("Error creating project:", error);
    let errorMessage = error.response?.data?.detail || error.message;
    if (error.response?.status === 422 && Array.isArray(errorMessage)) {
      errorMessage = errorMessage.map(err => 
        `${err.loc && err.loc[1] ? err.loc[1] + ': ' : ''}${err.msg}`
      ).join(', ');
    }
    return { success: false, error: errorMessage };
  }
};

export const listProjectsByUser = async () => {
  try {
    const response = await api.get("/projects");
    
    // OUTPUT: Backend sends camelCase
    const mappedProjects = response.data.map(project => ({
      id: project.id,
      projectName: project.projectName,
      userId: project.userId,
      initialProcess: project.initialProcess,
      initialFeedstock: project.initialFeedstock,
      initialCountry: project.initialCountry,
      scenarioCount: project.scenarioCount || 0,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    }));
    
    return { success: true, data: mappedProjects };
  } catch (error) {
    console.error("Error listing projects:", error);
    return { success: false, error: error.response?.data?.detail || error.message };
  }
};

export const getProject = async (projectId) => {
  try {
    const response = await api.get(`/projects/${projectId}`);
    // Pass through - backend sends camelCase, which is what we want generally
    // If you need specific mapping, do it here like above
    return { success: true, data: response.data }; 
  } catch (error) {
    console.error("Error getting project:", error);
    return { success: false, error: error.response?.data?.detail || error.message };
  }
};

export const updateProject = async (projectId, updates) => {
  try {
    const response = await api.put(`/projects/${projectId}`, updates);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.response?.data?.detail || error.message };
  }
};

export const deleteProject = async (projectId) => {
  try {
    await api.delete(`/projects/${projectId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.response?.data?.detail || error.message };
  }
};

// ==================== SCENARIO API ====================

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
    // INPUT: Send snake_case
    const payload = {
      scenario_name: scenarioName,
      process_id: processId,
      feedstock_id: feedstockId,
      country_id: countryId,
      user_inputs: userInputs, 
    };

    if (scenarioOrder !== null) {
      payload.scenario_order = scenarioOrder;
    }

    const response = await api.post(`/projects/${projectId}/scenarios`, payload);

    // OUTPUT: Backend sends camelCase
    const mappedScenario = {
      id: response.data.id,
      projectId: response.data.projectId,
      scenarioName: response.data.scenarioName,
      scenarioOrder: response.data.scenarioOrder,
      process: response.data.process,
      feedstock: response.data.feedstock,
      country: response.data.country,
      userInputs: response.data.userInputs,
      createdAt: response.data.createdAt,
      updatedAt: response.data.updatedAt
    };

    return { success: true, data: mappedScenario };
  } catch (error) {
    console.error("Error creating scenario:", error);
    return { success: false, error: error.response?.data?.detail || error.message };
  }
};

export const listScenarios = async (projectId) => {
  try {
    const response = await api.get(`/projects/${projectId}/scenarios`);
    
    // OUTPUT: Backend sends camelCase
    const mappedScenarios = response.data.map(scenario => ({
      id: scenario.id,
      projectId: scenario.projectId,
      scenarioName: scenario.scenarioName,
      scenarioOrder: scenario.scenarioOrder,
      process: scenario.process,
      feedstock: scenario.feedstock,
      country: scenario.country,
      userInputs: scenario.userInputs,
      technoEconomics: scenario.technoEconomics,
      financialAnalysis: scenario.financialAnalysis,
      createdAt: scenario.createdAt,
      updatedAt: scenario.updatedAt
    }));
    
    return { success: true, data: mappedScenarios };
  } catch (error) {
    return { success: false, error: error.response?.data?.detail || error.message };
  }
};

export const getScenario = async (scenarioId) => {
  try {
    const response = await api.get(`/scenarios/${scenarioId}`);
    const backendData = response.data;
    
    // OUTPUT: Backend sends camelCase
    const mappedScenario = {
      id: backendData.id,
      projectId: backendData.projectId,
      scenarioName: backendData.scenarioName,
      scenarioOrder: backendData.scenarioOrder,
      process: backendData.process,
      feedstock: backendData.feedstock,
      country: backendData.country,
      userInputs: backendData.userInputs,
      technoEconomics: backendData.technoEconomics,
      financialAnalysis: backendData.financialAnalysis,
      createdAt: backendData.createdAt,
      updatedAt: backendData.updatedAt
    };
    
    return { success: true, data: mappedScenario };
  } catch (error) {
    return { success: false, error: error.response?.data?.detail || error.message };
  }
};

export const updateScenario = async (scenarioId, updates) => {
  try {
    // INPUT: Convert frontend camelCase to backend snake_case keys for update
    const backendUpdates = {};

    if (updates.scenarioName !== undefined) backendUpdates.scenario_name = updates.scenarioName;
    if (updates.userInputs !== undefined) backendUpdates.user_inputs = updates.userInputs;
    if (updates.technoEconomics !== undefined) backendUpdates.techno_economics = updates.technoEconomics;
    if (updates.financialAnalysis !== undefined) backendUpdates.financial_analysis = updates.financialAnalysis;
    if (updates.scenarioOrder !== undefined) backendUpdates.scenario_order = updates.scenarioOrder;

    const response = await api.put(`/scenarios/${scenarioId}`, backendUpdates);

    // OUTPUT: Backend returns camelCase
    const mappedResponse = {
      id: response.data.id,
      projectId: response.data.projectId,
      scenarioName: response.data.scenarioName,
      scenarioOrder: response.data.scenarioOrder,
      process: response.data.process,
      feedstock: response.data.feedstock,
      country: response.data.country,
      userInputs: response.data.userInputs,
      technoEconomics: response.data.technoEconomics,
      financialAnalysis: response.data.financialAnalysis,
      createdAt: response.data.createdAt,
      updatedAt: response.data.updatedAt
    };

    return { success: true, data: mappedResponse };
  } catch (error) {
    console.error("❌ Error updating scenario:", error);
    return { 
      success: false, 
      error: error.response?.data?.detail || error.message,
      status: error.response?.status 
    };
  }
};

export const deleteScenario = async (scenarioId) => {
  try {
    await api.delete(`/scenarios/${scenarioId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.response?.data?.detail || error.message };
  }
};

export const calculateScenario = async (scenarioId, userInputs) => { // <--- Add argument
  try {
    // Pass userInputs as the second argument (the body)
    const response = await api.post(`/scenarios/${scenarioId}/calculate`, userInputs);
    
    // Backend returns { technoEconomics: ..., financials: ... }
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Error calculating scenario:", error);
    return { success: false, error: error.response?.data?.detail || error.message };
  }
};

// Helper functions use snake_case keys for payload construction
export const saveScenarioInputs = async (scenarioId, userInputs) => {
  return updateScenario(scenarioId, { userInputs: userInputs }); 
};

export const saveScenarioOutputs = async (scenarioId, technoEconomics, financialAnalysis) => {
  return updateScenario(scenarioId, {
    technoEconomics: technoEconomics,
    financialAnalysis: financialAnalysis
  });
};

// In projectApi.js - Update getMasterData function
export const getMasterData = async () => {
  try {
    const response = await api.get("/master-data");
    console.log("📦 Raw master data from backend:", response.data);
    
    // Transform camelCase to snake_case for frontend compatibility
    const mappedData = {
      processes: response.data.processes || [],
      feedstocks: (response.data.feedstocks || []).map(feedstock => ({
        id: feedstock.id,
        name: feedstock.name,
        carbon_content_kg_c_per_kg: feedstock.carbonContentKgCPerKg,
        energy_content_mj_per_kg: feedstock.energyContentMjPerKg,
        ci_ref_gco2e_per_mj: feedstock.ciRefGco2ePerMj,
        price_ref_usd_per_unit: feedstock.priceRefUsdPerUnit,
        yield_ref: feedstock.yieldRef
      })),
      utilities: response.data.utilities || [],
      products: response.data.products || [],
      countries: response.data.countries || [],
      units: response.data.units || []
    };
    
    console.log("🔄 Mapped master data for frontend:", mappedData);
    return { success: true, data: mappedData };
  } catch (error) {
    console.error("❌ Error fetching master data:", error);
    return { success: false, error: error.response?.data?.detail || error.message };
  }
};

export default api;