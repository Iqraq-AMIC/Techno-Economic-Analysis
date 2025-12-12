/**
 * ProjectContext - Manages current project and scenario state
 */

import React, { createContext, useContext, useState, useMemo, useCallback } from "react";
import {
  createProject as apiCreateProject,
  listProjectsByUser,
  createScenario as apiCreateScenario,
  listScenarios,
  getScenario,
  updateScenario,
  deleteScenario as apiDeleteScenario,
  deleteProject as apiDeleteProject,
} from "../api/projectApi";

const ProjectContext = createContext();

const PROJECT_STORAGE_KEY = "safapac-current-project";
const SCENARIO_STORAGE_KEY = "safapac-current-scenario";

export const ProjectProvider = ({ children }) => {
  // Current project - DON'T load from localStorage automatically
  // User must select project via modal after each login
  const [currentProject, setCurrentProject] = useState(null);

  // Current scenario
  const [currentScenario, setCurrentScenario] = useState(null);

  // List of scenarios in current project
  const [scenarios, setScenarios] = useState([]);

  // Comparison mode - array of scenario IDs to compare
  const [comparisonScenarios, setComparisonScenarios] = useState([]);

  // Loading states
  const [loading, setLoading] = useState(false);

  // Persist current project to localStorage
  const persistProject = useCallback((project) => {
    if (typeof window === "undefined") return;
    if (project) {
      window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
    } else {
      window.localStorage.removeItem(PROJECT_STORAGE_KEY);
    }
  }, []);

  // Persist current scenario to localStorage
  const persistScenario = useCallback((scenario) => {
    if (typeof window === "undefined") return;
    if (scenario) {
      window.localStorage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify(scenario));
    } else {
      window.localStorage.removeItem(SCENARIO_STORAGE_KEY);
    }
  }, []);

  // Create a new project (auto-creates Scenario 1)
  const createProject = useCallback(async (userId, projectName) => {
    setLoading(true);
    try {
      const result = await apiCreateProject(userId, projectName);
      if (result.success) {
        const project = {
          project_id: result.data.project_id,
          project_name: result.data.project_name,
        };
        const scenario = result.data.scenarios[0]; // Auto-created Scenario 1

        setCurrentProject(project);
        setCurrentScenario(scenario);
        setScenarios([scenario]);

        persistProject(project);
        persistScenario(scenario);

        return { success: true, project, scenario };
      }

      // Check if this is a user authentication issue
      if (result.error && result.error.includes("User not found")) {
        return {
          success: false,
          error: "Your session is invalid. Please logout and login again to continue.",
          requiresReauth: true
        };
      }

      return result;
    } catch (error) {
      console.error("Error creating project:", error);

      // Check if this is a 404 user not found error
      if (error.response?.status === 404 || error.message?.includes("User not found")) {
        return {
          success: false,
          error: "Your session is invalid. Please logout and login again to continue.",
          requiresReauth: true
        };
      }

      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [persistProject, persistScenario]);

  // Load an existing project
  const loadProject = useCallback(async (projectId, projectName) => {
    console.log("🔵 ProjectContext - loadProject called:", projectId, projectName);
    setLoading(true);
    try {
      // Fetch scenarios for this project
      const result = await listScenarios(projectId);
      console.log("🔵 ProjectContext - listScenarios result:", result);

      if (result.success && result.data.length > 0) {
        const scenariosList = result.data;
        const firstScenario = scenariosList[0];

        const project = { project_id: projectId, project_name: projectName };

        console.log("🔵 ProjectContext - Setting project:", project);
        console.log("🔵 ProjectContext - Setting scenarios:", scenariosList);

        setCurrentProject(project);
        setCurrentScenario(firstScenario);
        setScenarios(scenariosList);

        persistProject(project);
        persistScenario(firstScenario);

        return { success: true, project, scenario: firstScenario, scenarios: scenariosList };
      }
      return { success: false, error: "No scenarios found for this project" };
    } catch (error) {
      console.error("Error loading project:", error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [persistProject, persistScenario]);

  // Add a new scenario to current project (max 3)
  const addScenario = useCallback(async () => {
    if (!currentProject) {
      return { success: false, error: "No project selected" };
    }

    if (scenarios.length >= 3) {
      return { success: false, error: "Maximum 3 scenarios per project" };
    }

    setLoading(true);
    try {
      const newOrder = scenarios.length + 1;
      const scenarioName = `Scenario ${newOrder}`;

      const result = await apiCreateScenario(
        currentProject.project_id,
        scenarioName,
        newOrder
      );

      if (result.success) {
        const newScenario = result.data;
        setScenarios((prev) => [...prev, newScenario]);
        return { success: true, scenario: newScenario };
      }
      return result;
    } catch (error) {
      console.error("Error adding scenario:", error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [currentProject, scenarios]);

  // Switch to a different scenario
  const switchScenario = useCallback(async (scenarioId) => {
    setLoading(true);
    try {
      const result = await getScenario(scenarioId);
      if (result.success) {
        setCurrentScenario(result.data);
        persistScenario(result.data);
        return { success: true, scenario: result.data };
      }
      return result;
    } catch (error) {
      console.error("Error switching scenario:", error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [persistScenario]);

  // Update current scenario data (inputs or outputs)
  const updateCurrentScenario = useCallback(async (updates) => {
    if (!currentScenario) {
      return { success: false, error: "No scenario selected" };
    }

    try {
      const result = await updateScenario(currentScenario.scenario_id, updates);
      if (result.success) {
        setCurrentScenario(result.data);
        persistScenario(result.data);

        // Update in scenarios list
        setScenarios((prev) =>
          prev.map((s) =>
            s.scenario_id === result.data.scenario_id ? result.data : s
          )
        );

        return { success: true, scenario: result.data };
      }
      return result;
    } catch (error) {
      console.error("Error updating scenario:", error);
      return { success: false, error: error.message };
    }
  }, [currentScenario, persistScenario]);

  // Rename scenario
  const renameScenario = useCallback(async (scenarioId, newName) => {
    // Validate name
    const trimmedName = newName?.trim();
    if (!trimmedName || trimmedName.length === 0) {
      return { success: false, error: "Scenario name cannot be empty" };
    }
    if (trimmedName.length > 100) {
      return { success: false, error: "Scenario name must be 100 characters or less" };
    }

    setLoading(true);
    try {
      const result = await updateScenario(scenarioId, { scenario_name: trimmedName });
      if (result.success) {
        // Update scenarios list
        setScenarios((prev) =>
          prev.map((s) => (s.scenario_id === scenarioId ? result.data : s))
        );

        // Update current scenario if it's the one being renamed
        if (currentScenario?.scenario_id === scenarioId) {
          setCurrentScenario(result.data);
          persistScenario(result.data);
        }
        return { success: true, scenario: result.data };
    }
    return result;
  } catch (error) {
    console.error("Error renaming scenario:", error);
    return { success: false, error: error.message };
  } finally {
    setLoading(false);
  }
  
}, [currentScenario, persistScenario]);

  // Clear project/scenario state (on logout)
  const clearProjectState = useCallback(() => {
    setCurrentProject(null);
    setCurrentScenario(null);
    setScenarios([]);
    persistProject(null);
    persistScenario(null);
  }, [persistProject, persistScenario]);

  // Refresh scenarios list
  const refreshScenarios = useCallback(async () => {
    if (!currentProject) return;

    setLoading(true);
    try {
      const result = await listScenarios(currentProject.project_id);
      if (result.success) {
        setScenarios(result.data);
        return { success: true, scenarios: result.data };
      }
      return result;
    } catch (error) {
      console.error("Error refreshing scenarios:", error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

  // Toggle scenario in comparison list
  const toggleComparisonScenario = useCallback((scenarioId) => {
    setComparisonScenarios((prev) => {
      if (prev.includes(scenarioId)) {
        return prev.filter((id) => id !== scenarioId);
      } else {
        return [...prev, scenarioId];
      }
    });
  }, []);

  // Clear comparison mode
  const clearComparison = useCallback(() => {
    setComparisonScenarios([]);
  }, []);

  // Delete a scenario (Scenario 2 or 3 only)
  const deleteScenario = useCallback(async (scenarioId) => {
    if (!currentProject || scenarios.length <= 1) {
      return { success: false, error: "Cannot delete the only scenario" };
    }

    setLoading(true);
    try {
      const result = await apiDeleteScenario(scenarioId);
      if (result.success) {
        // Refresh scenarios list
        const refreshResult = await listScenarios(currentProject.project_id);
        if (refreshResult.success) {
          setScenarios(refreshResult.data);

          // If deleted scenario was current, switch to first scenario
          if (currentScenario?.scenario_id === scenarioId && refreshResult.data.length > 0) {
            const firstScenario = refreshResult.data[0];
            setCurrentScenario(firstScenario);
            persistScenario(firstScenario);
          }

          // Remove from comparison if it was selected
          setComparisonScenarios((prev) => prev.filter((id) => id !== scenarioId));

          return { success: true };
        }
      }
      return result;
    } catch (error) {
      console.error("Error deleting scenario:", error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [currentProject, currentScenario, scenarios, persistScenario]);

  const deleteProject = useCallback(async (projectId) => {
  setLoading(true);
  try {
    const result = await apiDeleteProject(projectId);
    if (result.success) {
      // If deleted project was current, clear state
      if (currentProject?.project_id === projectId) {
        clearProjectState();
      }
      return { success: true };
    }
    return result;
  } catch (error) {
    console.error("Error deleting project:", error);
    return { success: false, error: error.message };
  } finally {
    setLoading(false);
  }
}, [currentProject, clearProjectState]);

  const value = useMemo(
    () => ({
      currentProject,
      currentScenario,
      scenarios,
      loading,
      comparisonScenarios,
      createProject,
      loadProject,
      addScenario,
      switchScenario,
      updateCurrentScenario,
      renameScenario,
      clearProjectState,
      refreshScenarios,
      toggleComparisonScenario,
      clearComparison,
      deleteScenario,
      deleteProject,
    }),
    [
      currentProject,
      currentScenario,
      scenarios,
      loading,
      comparisonScenarios,
      createProject,
      loadProject,
      addScenario,
      switchScenario,
      updateCurrentScenario,
      renameScenario,
      clearProjectState,
      refreshScenarios,
      deleteScenario,
      deleteProject,
    ]
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within ProjectProvider");
  }
  return context;
};
