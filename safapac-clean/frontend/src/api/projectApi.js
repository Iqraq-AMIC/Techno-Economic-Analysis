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

// Helper: Flag to prevent infinite refresh loops
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// 3. RESPONSE INTERCEPTOR: Handle 401 Unauthorized (Token Expired) with Auto-Refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 error and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem("refresh_token");

      if (!refreshToken) {
        // No refresh token available - logout
        console.warn("No refresh token available. Logging out...");
        isRefreshing = false;
        logout();
        return Promise.reject(error);
      }

      try {
        // Call refresh endpoint
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken: refreshToken
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;

        // Update tokens in localStorage
        localStorage.setItem("access_token", accessToken);
        localStorage.setItem("refresh_token", newRefreshToken);

        // Update the authorization header
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        // Process queued requests
        processQueue(null, accessToken);
        isRefreshing = false;

        // Retry the original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed - logout
        processQueue(refreshError, null);
        isRefreshing = false;
        logout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Logout helper function
function logout() {
  // Clear all auth data from localStorage
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("safapac-authenticated");
  localStorage.removeItem("safapac-user");

  // Dispatch custom event for AuthContext to handle
  window.dispatchEvent(new CustomEvent("auth:logout", {
    detail: { reason: "token_expired" }
  }));

  // Redirect to login page
  if (window.location.pathname !== "/") {
    window.location.href = "/";
  }
}

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
    // 1. Start async calculation (returns 202 Accepted immediately)
    await apiClient.post(`/scenarios/${scenarioId}/calculate`, inputs);

    // 2. Poll for results until calculation is complete
    const pollStatus = async () => {
      const statusResponse = await apiClient.get(`/scenarios/${scenarioId}/calculate/status`);
      const { status, technoEconomics, financials, resolvedInputs, message } = statusResponse.data;

      if (status === "calculated") {
        // Calculation complete - return results
        return {
          success: true,
          data: {
            scenario_id: scenarioId,
            resolvedInputs: resolvedInputs,
            technoEconomics: technoEconomics,
            financials: financials,
          }
        };
      } else if (status === "failed") {
        // Calculation failed
        throw new Error(message || "Calculation failed");
      } else if (status === "calculating") {
        // Still calculating - wait 1 second and poll again
        await new Promise(resolve => setTimeout(resolve, 1000));
        return pollStatus();
      } else {
        // Unknown status
        throw new Error(`Unexpected status: ${status}`);
      }
    };

    return await pollStatus();

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

// Export the configured apiClient for use in other components
export { apiClient, API_BASE_URL };