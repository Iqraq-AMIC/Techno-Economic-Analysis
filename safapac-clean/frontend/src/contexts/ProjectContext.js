// src/contexts/ProjectContext.js

import React, { createContext, useContext, useState, useMemo, useCallback } from "react";
import { useAuth } from "./AuthContext";
import {
  createProject as apiCreateProject,
  listProjectsByUser,
  createScenario as apiCreateScenario,
  listScenarios,
  getScenario,
  updateScenario,
  deleteScenario as apiDeleteScenario,
  getMasterData,
} from "../api/projectApi";

const ProjectContext = createContext();

const PROJECT_STORAGE_KEY = "safapac-current-project";
const SCENARIO_STORAGE_KEY = "safapac-current-scenario";

export const ProjectProvider = ({ children }) => {
  const { currentUser } = useAuth();

  // Current project - DON'T load from localStorage automatically
  // User must select project via modal after each login
  const [currentProject, setCurrentProject] = useState(null);

  // Current scenario
  const [currentScenario, setCurrentScenario] = useState(null);

  // List of scenarios in current project
  const [scenarios, setScenarios] = useState([]);

  // Comparison mode - array of scenario IDs to compare
  const [comparisonScenarios, setComparisonScenarios] = useState([]);

  // Master data for dropdowns
  const [masterData, setMasterData] = useState(null);

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

  // Load master data for dropdowns
  const loadMasterData = useCallback(async () => {
    // Remove the early return to allow refreshing
    try {
      console.log("📥 Loading master data...");
      const result = await getMasterData();
      if (result.success) {
        console.log("✅ Master data loaded:", result.data);
        setMasterData(result.data);
        return result.data;
      } else {
        console.error("❌ Failed to load master data:", result.error);
        return null;
      }
    } catch (error) {
      console.error("❌ Error loading master data:", error);
      return null;
    }
  }, []);

  // Create a new project (auto-creates Scenario 1)
  const createProject = useCallback(async (projectName, initialProcessId = null, initialFeedstockId = null, initialCountryId = null) => {
    setLoading(true);
    try {
      const result = await apiCreateProject(
        projectName,
        initialProcessId,
        initialFeedstockId,
        initialCountryId
      );

      if (result.success) {
        const project = {
          id: result.data.id, // UUID format
          projectName: result.data.projectName,
          userId: result.data.userId,
          initialProcess: result.data.initialProcess,
          initialFeedstock: result.data.initialFeedstock,
          initialCountry: result.data.initialCountry,
          createdAt: result.data.createdAt,
          updatedAt: result.data.updatedAt
        };

        setCurrentProject(project);
        persistProject(project);

        // Load scenarios for the new project
        const scenariosResult = await listScenarios(project.id);
        if (scenariosResult.success && scenariosResult.data.length > 0) {
          const firstScenario = scenariosResult.data[0];
          setCurrentScenario(firstScenario);
          setScenarios(scenariosResult.data);
          persistScenario(firstScenario);
        }

        return { success: true, project };
      }

      return { success: false, error: result.error };
    } catch (error) {
      console.error("Error creating project:", error);
      return {
        success: false,
        error: error.message || "Failed to create project"
      };
    } finally {
      setLoading(false);
    }
  }, [persistProject, persistScenario]);

  // Load an existing project
  const loadProject = useCallback(async (projectId, projectName) => {
    console.log("🔵 ProjectContext - loadProject called:", projectId, projectName);
    setLoading(true);
    try {
      // Fetch project details
      const projectResult = await listProjectsByUser();
      if (!projectResult.success) {
        return { success: false, error: projectResult.error };
      }

      // Find the specific project
      const projectData = projectResult.data.find(p => p.id === projectId);
      if (!projectData) {
        return { success: false, error: "Project not found" };
      }

      // Fetch scenarios for this project
      const scenariosResult = await listScenarios(projectId);
      console.log("🔵 ProjectContext - listScenarios result:", scenariosResult);

      if (scenariosResult.success && scenariosResult.data.length > 0) {
        const scenariosList = scenariosResult.data;
        const firstScenario = scenariosList[0];

        // Normalize project data structure
        const project = {
          id: projectData.id,
          projectName: projectData.projectName || projectData.project_name, // Handle both cases
          userId: projectData.userId || projectData.user_id,
          initialProcess: projectData.initialProcess,
          initialFeedstock: projectData.initialFeedstock,
          initialCountry: projectData.initialCountry,
          createdAt: projectData.createdAt || projectData.created_at,
          updatedAt: projectData.updatedAt || projectData.updated_at
        };

        console.log("🔵 ProjectContext - Setting project:", project);
        console.log("🔵 ProjectContext - Setting scenarios:", scenariosList);

        setCurrentProject(project);
        setCurrentScenario(firstScenario);
        setScenarios(scenariosList);

        persistProject(project);
        persistScenario(firstScenario);

        return {
          success: true,
          project,
          scenario: firstScenario,
          scenarios: scenariosList
        };
      }
      return { success: false, error: "No scenarios found for this project" };
    } catch (error) {
      console.error("Error loading project:", error);
      return {
        success: false,
        error: error.message || "Failed to load project"
      };
    } finally {
      setLoading(false);
    }
  }, [persistProject, persistScenario]);

  // List all projects for the current user
  const listUserProjects = useCallback(async () => {
    try {
      const result = await listProjectsByUser();
      return result;
    } catch (error) {
      console.error("Error listing user projects:", error);
      return {
        success: false,
        error: error.message || "Failed to load projects"
      };
    }
  }, []);

  // Add a new scenario to current project (max 3)
  const addScenario = useCallback(async (scenarioData) => {
    if (!currentProject) {
      return { success: false, error: "No project selected" };
    }

    if (scenarios.length >= 3) {
      return { success: false, error: "Maximum 3 scenarios per project" };
    }

    setLoading(true);
    try {
      // Use provided data or create default scenario
      const defaultScenarioData = {
        scenarioName: `Scenario ${scenarios.length + 1}`,
        processId: currentProject.initialProcess?.id || 1,
        feedstockId: currentProject.initialFeedstock?.id || 1,
        countryId: currentProject.initialCountry?.id || 1,
        userInputs: getDefaultUserInputs(),
        scenarioOrder: scenarios.length + 1
      };

      const scenarioParams = { ...defaultScenarioData, ...scenarioData };

      const result = await apiCreateScenario(
        currentProject.id,
        scenarioParams.scenarioName,
        scenarioParams.processId,
        scenarioParams.feedstockId,
        scenarioParams.countryId,
        scenarioParams.userInputs,
        scenarioParams.scenarioOrder
      );

      if (result.success) {
        const newScenario = result.data;
        setScenarios((prev) => [...prev, newScenario]);

        // Auto-switch to new scenario
        setCurrentScenario(newScenario);
        persistScenario(newScenario);

        return { success: true, scenario: newScenario };
      }
      return result;
    } catch (error) {
      console.error("Error adding scenario:", error);
      return {
        success: false,
        error: error.message || "Failed to create scenario"
      };
    } finally {
      setLoading(false);
    }
  }, [currentProject, scenarios, persistScenario]);

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
      return {
        success: false,
        error: error.message || "Failed to switch scenario"
      };
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
      const result = await updateScenario(currentScenario.id, updates);
      if (result.success) {
        setCurrentScenario(result.data);
        persistScenario(result.data);

        // Update in scenarios list
        setScenarios((prev) =>
          prev.map((s) =>
            s.id === result.data.id ? result.data : s
          )
        );

        return { success: true, scenario: result.data };
      }
      return result;
    } catch (error) {
      console.error("Error updating scenario:", error);
      return {
        success: false,
        error: error.message || "Failed to update scenario"
      };
    }
  }, [currentScenario, persistScenario]);

  // Clear project/scenario state (on logout)
  const clearProjectState = useCallback(() => {
    setCurrentProject(null);
    setCurrentScenario(null);
    setScenarios([]);
    setComparisonScenarios([]);
    persistProject(null);
    persistScenario(null);
  }, [persistProject, persistScenario]);

  // Refresh scenarios list
  const refreshScenarios = useCallback(async () => {
    if (!currentProject) return;

    setLoading(true);
    try {
      const result = await listScenarios(currentProject.id);
      if (result.success) {
        setScenarios(result.data);
        return { success: true, scenarios: result.data };
      }
      return result;
    } catch (error) {
      console.error("Error refreshing scenarios:", error);
      return {
        success: false,
        error: error.message || "Failed to refresh scenarios"
      };
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
        const refreshResult = await listScenarios(currentProject.id);
        if (refreshResult.success) {
          setScenarios(refreshResult.data);

          // If deleted scenario was current, switch to first scenario
          if (currentScenario?.id === scenarioId && refreshResult.data.length > 0) {
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
      return {
        success: false,
        error: error.message || "Failed to delete scenario"
      };
    } finally {
      setLoading(false);
    }
  }, [currentProject, currentScenario, scenarios, persistScenario]);

  // Default user inputs for new scenarios
  const getDefaultUserInputs = useCallback(() => {
    return {
      conversionPlant: {
        plantCapacity: { value: 500, unitId: 1 }, // kta
        annualLoadHours: 8000,
        ciProcessDefault: 20.0
      },
      economicParameters: {
        projectLifetimeYears: 25,
        discountRatePercent: 10.0,
        tciRefMusd: null,
        referenceCapacityKtpa: null,
        tciScalingExponent: 0.6,
        workingCapitalTciRatio: 0.10,
        indirectOpexTciRatio: 0.03
      },
      feedstockData: [],
      utilityData: [],
      productData: []
    };
  }, []);

  const value = useMemo(
    () => ({
      // State
      currentProject,
      currentScenario,
      scenarios,
      loading,
      comparisonScenarios,
      masterData,

      // Actions
      createProject,
      loadProject,
      listUserProjects,
      addScenario,
      switchScenario,
      updateCurrentScenario,
      clearProjectState,
      refreshScenarios,
      toggleComparisonScenario,
      clearComparison,
      deleteScenario,
      loadMasterData,
    }),
    [
      currentProject,
      currentScenario,
      scenarios,
      loading,
      comparisonScenarios,
      masterData,
      createProject,
      loadProject,
      listUserProjects,
      addScenario,
      switchScenario,
      updateCurrentScenario,
      clearProjectState,
      refreshScenarios,
      deleteScenario,
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