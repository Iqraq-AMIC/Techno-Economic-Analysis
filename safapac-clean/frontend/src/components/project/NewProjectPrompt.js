/**
 * NewProjectPrompt - Modal for creating a new project
 * Prompts user for project name
 * Creates project + auto-creates Scenario 1
 */

import React, { useState } from "react";
import {
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
  FormInput,
  FormGroup,
  Button,
  Alert,
} from "shards-react";
import { useAuth } from "../../contexts/AuthContext";
import { useProject } from "../../contexts/ProjectContext";

const NewProjectPrompt = ({ isOpen, onCancel, onProjectCreated }) => {
  const { currentUser, logout } = useAuth();
  const { createProject } = useProject();

  const [projectName, setProjectName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [requiresReauth, setRequiresReauth] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!projectName.trim()) {
      setError("Project name is required");
      return;
    }

    if (projectName.trim().length > 100) {
      setError("Project name must be 100 characters or less");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await createProject(currentUser.user_id, projectName.trim());

      if (result.success) {
        // Project created successfully with auto-generated Scenario 1
        onProjectCreated(result.project, result.scenario);
      } else {
        setError(result.error || "Failed to create project");
        if (result.requiresReauth) {
          setRequiresReauth(true);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setProjectName("");
    setError(null);
    setRequiresReauth(false);
    onCancel();
  };

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <Modal open={isOpen} centered backdrop="static" toggle={() => {}} style={{ zIndex: 1050 }}>
      <ModalHeader style={{ backgroundColor: "#006D7C", color: "white" }}>
        Create New Project
      </ModalHeader>
      <form onSubmit={handleSubmit}>
        <ModalBody>
          <div style={{ padding: "1rem" }}>
            <p style={{ color: "#666", marginBottom: "1.5rem" }}>
              Enter a name for your new project. A default scenario (Scenario 1) will be
              automatically created.
            </p>

            {error && (
              <Alert theme="danger" style={{ marginBottom: "1rem" }}>
                <div style={{ marginBottom: requiresReauth ? "1rem" : 0 }}>
                  {error}
                </div>
                {requiresReauth && (
                  <Button
                    theme="danger"
                    size="sm"
                    onClick={handleLogout}
                    style={{ marginTop: "0.5rem" }}
                  >
                    <i className="material-icons" style={{ fontSize: "1rem", verticalAlign: "middle", marginRight: "0.5rem" }}>
                      logout
                    </i>
                    Logout and Login Again
                  </Button>
                )}
              </Alert>
            )}

            <FormGroup>
              <label htmlFor="projectName">
                Project Name <span style={{ color: "red" }}>*</span>
              </label>
              <FormInput
                id="projectName"
                type="text"
                placeholder="e.g., HEFA UCO Analysis 2025"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                maxLength={100}
                autoFocus
                disabled={loading}
              />
              <small style={{ color: "#999", marginTop: "0.25rem", display: "block" }}>
                {projectName.length}/100 characters
              </small>
            </FormGroup>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            theme="white"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            theme="primary"
            type="submit"
            disabled={loading || !projectName.trim()}
            style={{
              backgroundColor: "#006D7C",
              borderColor: "#006D7C",
            }}
          >
            {loading ? (
              <>
                <i className="material-icons" style={{ fontSize: "1rem", verticalAlign: "middle", marginRight: "0.5rem" }}>
                  refresh
                </i>
                Creating...
              </>
            ) : (
              <>
                <i className="material-icons" style={{ fontSize: "1rem", verticalAlign: "middle", marginRight: "0.5rem" }}>
                  add
                </i>
                Create Project
              </>
            )}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};

export default NewProjectPrompt;
