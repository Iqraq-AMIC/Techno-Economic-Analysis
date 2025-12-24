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
  const { loadProject, deleteProject } = useProject(); // Removed createProject (unused here)
  const [showNewProjectPrompt, setShowNewProjectPrompt] = useState(false);
  const [existingProjects, setExistingProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch user's existing projects when modal opens
  useEffect(() => {
    if (isOpen && currentUser && currentUser.id) { // Ensure user has ID
      fetchExistingProjects();
    }
    // eslint-disable-next-line
  }, [isOpen, currentUser]);

  const fetchExistingProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      // API call now uses the token from localStorage
      const result = await listProjectsByUser(currentUser.id);
      if (result.success) {
        setExistingProjects(result.data);
      } else {
        // Don't show error if it's just empty
        if(result.error !== "No projects found") {
            setError(result.error);
        }
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
      if(!project) throw new Error("Project not found in list");

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
    e.stopPropagation(); 
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${projectName}"?`
    );
    if (!confirmDelete) return;

    setLoading(true);
    const result = await deleteProject(projectId);
    if (result.success) {
      fetchExistingProjects();
      if (selectedProjectId === projectId) setSelectedProjectId("");
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
    // FIX: changed backdrop="static" to backdrop={true} (or remove toggle if static behavior needed via code)
    <Modal open={isOpen} centered backdrop={true} toggle={() => {}} style={{ zIndex: 1050 }}>
      <ModalHeader style={{ backgroundColor: "#006D7C", color: "white" }}>
        Welcome to SAFAPAC TEA
      </ModalHeader>
      <ModalBody>
        <div style={{ padding: "1rem" }}>
          <div style={{ marginBottom: "2rem" }}>
            <h5>Get Started with Your Analysis</h5>
            <p style={{ color: "#666", marginTop: "0.5rem" }}>
              SAFAPAC enables techno-economic analysis of biofuel production pathways.
            </p>
          </div>

          {error && <Alert theme="danger">{error}</Alert>}

          {/* Create New Project */}
          <div style={{ marginBottom: "1.5rem" }}>
            <Button
              size="lg"
              theme="primary"
              onClick={handleCreateNew}
              disabled={loading}
              block
              style={{ backgroundColor: "#006D7C", borderColor: "#006D7C", padding: "1rem" }}
            >
              <i className="material-icons" style={{ verticalAlign: "middle", marginRight: "0.5rem", marginTop: "-7px" }}>add_circle</i>
              Create New Project
            </Button>
          </div>

          {/* Load Existing Project */}
          {hasProjects && (
            <div>
              <h6 style={{ marginBottom: "0.75rem", color: "#666" }}>Or load an existing project:</h6>
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
                      const dateStr = new Date(project.created_at).toLocaleDateString();
                      return (
                        <option key={project.project_id} value={project.project_id}>
                          {project.project_name} - {dateStr} ({project.scenario_count} scenarios)
                        </option>
                      );
                    })}
                  </FormSelect>

                  {selectedProjectId && (
                    <Button theme="danger" size="sm" onClick={(e) => {
                         const p = existingProjects.find(proj => proj.project_id === selectedProjectId);
                         if(p) handleDeleteProject(e, p.project_id, p.project_name);
                    }}>
                      <i className="material-icons">delete</i>
                    </Button>
                  )}
                </div>
                <Button
                  theme="secondary"
                  onClick={handleLoadSelectedProject}
                  disabled={!selectedProjectId || loading}
                  block
                  style={{ padding: "0.75rem" }}
                >
                  <i className="material-icons" style={{ verticalAlign: "middle", marginRight: "0.5rem", marginTop: "-6px" }}>folder_open</i>
                  Load Selected Project
                </Button>
              </FormGroup>
            </div>
          )}

          {!hasProjects && !loading && (
             <div style={{ textAlign: "center", color: "#999", fontStyle: "italic" }}>
               No existing projects found.
             </div>
          )}
        </div>
      </ModalBody>
    </Modal>
  );
};

export default ProjectStartupModal;