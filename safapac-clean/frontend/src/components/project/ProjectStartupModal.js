// src/components/project/ProjectStartupModal.js

import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalBody,
  ModalHeader,
  Button,
  FormSelect,
  FormGroup,
  Alert,
} from "shards-react";
import { useAuth } from "../../contexts/AuthContext";
import { useProject } from "../../contexts/ProjectContext";
import NewProjectPrompt from "./NewProjectPrompt";

const ProjectStartupModal = ({ isOpen, onProjectSelected }) => {
  const { currentUser } = useAuth();
  const { 
    loadProject, 
    listUserProjects, 
    createProject,
    loading: projectLoading 
  } = useProject();

  const [showNewProjectPrompt, setShowNewProjectPrompt] = useState(false);
  const [existingProjects, setExistingProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch user's existing projects when modal opens
  useEffect(() => {
    console.log("🎭 ProjectStartupModal - isOpen:", isOpen, "currentUser:", currentUser);
    if (isOpen && currentUser) {
      console.log("📋 Fetching existing projects for user:", currentUser.id);
      fetchExistingProjects();
    }
  }, [isOpen, currentUser]);

  const fetchExistingProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listUserProjects();
      console.log("📋 Projects fetch result:", result);
      
      if (result.success) {
        setExistingProjects(result.data || []);
      } else {
        setError(result.error || "Failed to load projects");
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
      setError(err.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setShowNewProjectPrompt(true);
  };

  const handleLoadSelectedProject = async () => {
    if (!selectedProjectId) {
      setError("Please select a project");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const project = existingProjects.find(p => p.id === selectedProjectId);
      if (!project) {
        setError("Selected project not found");
        return;
      }

      console.log("🔵 Loading project:", project.id, project.projectName);
      const result = await loadProject(project.id, project.projectName);
      
      if (result.success) {
        console.log("✅ Project loaded successfully:", result.project);
        onProjectSelected(result.project, result.scenario);
      } else {
        setError(result.error || "Failed to load project");
      }
    } catch (err) {
      console.error("Error loading project:", err);
      setError(err.message || "Failed to load project");
    } finally {
      setLoading(false);
    }
  };

  const handleProjectCreated = (project, scenario) => {
    console.log("✅ New project created:", project);
    setShowNewProjectPrompt(false);
    onProjectSelected(project, scenario);
  };

  const handleNewProjectPromptCancel = () => {
    setShowNewProjectPrompt(false);
    // Refresh projects list in case new projects were created elsewhere
    fetchExistingProjects();
  };

  const hasProjects = existingProjects.length > 0;
  const isLoading = loading || projectLoading;

  if (showNewProjectPrompt) {
    return (
      <NewProjectPrompt
        isOpen={isOpen}
        onCancel={handleNewProjectPromptCancel}
        onProjectCreated={handleProjectCreated}
      />
    );
  }

  return (
    <Modal open={isOpen} centered backdrop={true} toggle={() => {}} style={{ zIndex: 1050 }}>
      <ModalHeader style={{ backgroundColor: "#006D7C", color: "white" }}>
        Welcome to SAFAPAC TEA
      </ModalHeader>
      <ModalBody>
        <div style={{ padding: "1rem" }}>
          {/* Explanation Text */}
          <div style={{ marginBottom: "2rem" }}>
            <h5>Get Started with Your Analysis</h5>
            <p style={{ color: "#666", marginTop: "0.5rem" }}>
              SAFAPAC enables techno-economic analysis of biofuel production pathways.
              Each project can contain up to 3 scenarios for comparison.
            </p>
            <p style={{ color: "#666" }}>
              Choose an option below to begin:
            </p>
          </div>

          {error && (
            <Alert theme="danger" style={{ marginBottom: "1rem" }}>
              {error}
            </Alert>
          )}

          {/* Create New Project Button */}
          <div style={{ marginBottom: "1.5rem" }}>
            <Button
              size="lg"
              theme="primary"
              onClick={handleCreateNew}
              disabled={isLoading}
              block
              style={{
                backgroundColor: "#006D7C",
                borderColor: "#006D7C",
                padding: "1rem",
              }}
            >
              <i className="material-icons" style={{ verticalAlign: "middle", marginRight: "0.5rem" }}>
                add_circle
              </i>
              Create New Project
            </Button>
          </div>

          {/* Load Existing Project Section */}
          {hasProjects && (
            <div>
              <h6 style={{ marginBottom: "0.75rem", color: "#666" }}>
                Or load an existing project:
              </h6>
              <FormGroup>
                <FormSelect
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  disabled={isLoading}
                  style={{ marginBottom: "1rem" }}
                >
                  <option value="">Select a project...</option>
                  {existingProjects.map((project) => {
                    const timestamp = project.createdAt || project.updatedAt;
                    const formattedDate = timestamp
                      ? new Date(timestamp).toLocaleString('en-US', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        }).replace(',', '')
                      : 'Unknown date';
                    
                    // Get scenario count from project data or scenarios array
                    const scenarioCount = project.scenarioCount || project.scenarios?.length || 0;
                    
                    return (
                      <option key={project.id} value={project.id}>
                        {project.projectName} - {formattedDate} ({scenarioCount} scenario{scenarioCount !== 1 ? "s" : ""})
                      </option>
                    );
                  })}
                </FormSelect>
                <Button
                  theme="secondary"
                  onClick={handleLoadSelectedProject}
                  disabled={!selectedProjectId || isLoading}
                  block
                  style={{ padding: "0.75rem" }}
                >
                  <i className="material-icons" style={{ verticalAlign: "middle", marginRight: "0.5rem" }}>
                    folder_open
                  </i>
                  {isLoading ? "Loading..." : "Load Selected Project"}
                </Button>
              </FormGroup>
            </div>
          )}

          {!hasProjects && !isLoading && (
            <div style={{ textAlign: "center", padding: "1rem", color: "#999", fontStyle: "italic" }}>
              No existing projects. Create your first project above.
            </div>
          )}

          {isLoading && (
            <div style={{ textAlign: "center", padding: "1rem", color: "#666" }}>
              <i 
                className="material-icons" 
                style={{ 
                  fontSize: "2rem", 
                  animation: "spin 1s linear infinite",
                  display: "inline-block"
                }}
              >
                refresh
              </i>
              <p>Loading projects...</p>
              <style>{`
                @keyframes spin {
                  from { transform: rotate(0deg); }
                  to { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          )}
        </div>
      </ModalBody>
    </Modal>
  );
};

export default ProjectStartupModal;