/**
 * ProjectStartupModal - Post-login modal for project selection
 * Shows after user logs in
 * Options: Create New Project or Load Existing Project
 */

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
import { listProjectsByUser } from "../../api/projectApi";
import NewProjectPrompt from "./NewProjectPrompt";

const ProjectStartupModal = ({ isOpen, onProjectSelected }) => {
  const { currentUser } = useAuth();
  const { createProject, loadProject, deleteProject } = useProject();
  const [showNewProjectPrompt, setShowNewProjectPrompt] = useState(false);
  const [existingProjects, setExistingProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  

  // Fetch user's existing projects when modal opens
  useEffect(() => {
    console.log("🎭 ProjectStartupModal - isOpen:", isOpen, "currentUser:", currentUser);
    if (isOpen && currentUser) {
      console.log("📋 Fetching existing projects for user:", currentUser.user_id);
      fetchExistingProjects();
    }
  }, [isOpen, currentUser]);

  const fetchExistingProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listProjectsByUser(currentUser.user_id);
      if (result.success) {
        setExistingProjects(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
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
      const project = existingProjects.find(p => p.project_id === selectedProjectId);
      const result = await loadProject(project.project_id, project.project_name);
      if (result.success) {
        onProjectSelected(result.project, result.scenario);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectCreated = (project, scenario) => {
    setShowNewProjectPrompt(false);
    onProjectSelected(project, scenario);
  };

  const handleDeleteProject = async (e, projectId, projectName) => {
  e.stopPropagation(); // Prevent triggering parent click handlers

  const confirmDelete = window.confirm(
    `Are you sure you want to delete project "${projectName}"? This will delete all scenarios in this project. This action cannot be undone.`
  );

  if (!confirmDelete) return;

  setLoading(true);
  setError(null);

  const result = await deleteProject(projectId);

  if (result.success) {
    // Refresh projects list
    fetchExistingProjects();
    // Clear selection if deleted project was selected
    if (selectedProjectId === projectId) {
      setSelectedProjectId("");
    }
  } else {
    setError(result.error || "Failed to delete project");
  }

  setLoading(false);
};

  const hasProjects = existingProjects.length > 0;

  if (showNewProjectPrompt) {
    return (
      <NewProjectPrompt
        isOpen={isOpen}
        onCancel={() => setShowNewProjectPrompt(false)}
        onProjectCreated={handleProjectCreated}
      />
    );
  }

  return (
    <Modal open={isOpen} centered backdrop="static" toggle={() => {}} style={{ zIndex: 1050 }}>
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
              disabled={loading}
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
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "start" }}>
                  <FormSelect
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    disabled={loading}
                    style={{ marginBottom: "1rem" }}
                  >
                    <option value="">Select a project...</option>
                    {existingProjects.map((project) => {
                      const timestamp = project.created_at || project.updated_at;
                      const formattedDate = timestamp
                        ? new Date(timestamp).toLocaleString('en-US', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          }).replace(',', '')
                        : '';
                      return (
                        <option key={project.project_id} value={project.project_id}>
                          {project.project_name} - {formattedDate} ({project.scenario_count} scenario{project.scenario_count !== 1 ? "s" : ""})
                        </option>
                      );
                    })}
                  </FormSelect>
                  {selectedProjectId && (
                    <Button
                    theme="danger" size="sm"
                    onClick={(e) => {
                      const project = existingProjects.find(p => p.project_id === selectedProjectId);
                      if (project) {
                        handleDeleteProject(e, project.project_id, project.project_name);  // ✅ Pass project_name
                      }
                    }}>
                      <i className="material-icons">delete</i>
                    </Button>
                    // <Button theme="danger" size="sm" onClick={handleDeleteProject}>
                    //   <i className="material-icons">delete</i>
                    // </Button>
                  )}
                </div>
                <Button
                  theme="secondary"
                  onClick={handleLoadSelectedProject}
                  disabled={!selectedProjectId || loading}
                  block
                  style={{ padding: "0.75rem" }}
                >
                  <i className="material-icons" style={{ verticalAlign: "middle", marginRight: "0.5rem" }}>
                    folder_open
                  </i>
                  Load Selected Project
                </Button>
              </FormGroup>
            </div>
          )}

          {!hasProjects && (
            <div style={{ textAlign: "center", padding: "1rem", color: "#999", fontStyle: "italic" }}>
              No existing projects. Create your first project above.
            </div>
          )}

          {loading && (
            <div style={{ textAlign: "center", padding: "1rem", color: "#666" }}>
              <i className="material-icons" style={{ fontSize: "2rem", animation: "spin 1s linear infinite" }}>
                refresh
              </i>
              <p>Loading...</p>
            </div>
          )}
        </div>
      </ModalBody>
    </Modal>
  );
};

export default ProjectStartupModal;
