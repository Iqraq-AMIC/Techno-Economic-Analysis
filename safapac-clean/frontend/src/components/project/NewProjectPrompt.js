// src/components/project/NewProjectPrompt.js

import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
  FormInput,
  FormGroup,
  FormSelect,
  Button,
  Alert,
  Row,
  Col,
} from "shards-react";
import { useAuth } from "../../contexts/AuthContext";
import { useProject } from "../../contexts/ProjectContext";

const NewProjectPrompt = ({ isOpen, onCancel, onProjectCreated }) => {
  const { currentUser } = useAuth();
  const { createProject, loadMasterData, masterData } = useProject();

  const [projectName, setProjectName] = useState("");
  const [initialProcessId, setInitialProcessId] = useState("");
  const [initialFeedstockId, setInitialFeedstockId] = useState("");
  const [initialCountryId, setInitialCountryId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [masterDataLoaded, setMasterDataLoaded] = useState(false);

  // Load master data when modal opens
  useEffect(() => {
    if (isOpen && !masterDataLoaded) {
      loadMasterData().then(() => {
        setMasterDataLoaded(true);
        // Set default selections if available
        if (masterData) {
          if (masterData.processes && masterData.processes.length > 0) {
            setInitialProcessId(masterData.processes[0].id);
          }
          if (masterData.feedstocks && masterData.feedstocks.length > 0) {
            setInitialFeedstockId(masterData.feedstocks[0].id);
          }
          if (masterData.countries && masterData.countries.length > 0) {
            setInitialCountryId(masterData.countries[0].id);
          }
        }
      });
    }
  }, [isOpen, masterDataLoaded, loadMasterData, masterData]);

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

    // Validate required selections
    if (!initialProcessId || !initialFeedstockId || !initialCountryId) {
      setError("Please select initial process, feedstock, and country");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await createProject(
        projectName.trim(),
        parseInt(initialProcessId),
        parseInt(initialFeedstockId),
        parseInt(initialCountryId)
      );

      if (result.success) {
        console.log("✅ Project created successfully:", result.project);
        // Project created successfully with auto-generated Scenario 1
        onProjectCreated(result.project, result.scenario);
      } else {
        setError(result.error || "Failed to create project");
      }
    } catch (err) {
      console.error("Error creating project:", err);
      setError(err.message || "Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setProjectName("");
    setInitialProcessId("");
    setInitialFeedstockId("");
    setInitialCountryId("");
    setError(null);
    setMasterDataLoaded(false);
    onCancel();
  };

  // Get display name for dropdown options
  const getDisplayName = (item) => {
    return item.name || item.displayName || String(item.id);
  };

  return (
    <Modal open={isOpen} centered backdrop="static" toggle={() => {}} style={{ zIndex: 1050 }} size="lg">
      <ModalHeader style={{ backgroundColor: "#006D7C", color: "white" }}>
        Create New Project
      </ModalHeader>
      <form onSubmit={handleSubmit}>
        <ModalBody>
          <div style={{ padding: "1rem" }}>
            <p style={{ color: "#666", marginBottom: "1.5rem" }}>
              Enter a name for your new project and select initial technology, feedstock, and country. 
              A default scenario (Scenario 1) will be automatically created.
            </p>

            {error && (
              <Alert theme="danger" style={{ marginBottom: "1rem" }}>
                {error}
              </Alert>
            )}

            {/* Project Name */}
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

            {/* Initial Selections */}
            <Row form>
              <Col md="4">
                <FormGroup>
                  <label htmlFor="initialProcess">
                    Initial Process Technology <span style={{ color: "red" }}>*</span>
                  </label>
                  <FormSelect
                    id="initialProcess"
                    value={initialProcessId}
                    onChange={(e) => setInitialProcessId(e.target.value)}
                    disabled={loading || !masterDataLoaded}
                  >
                    <option value="">Select process...</option>
                    {masterData?.processes?.map((process) => (
                      <option key={process.id} value={process.id}>
                        {getDisplayName(process)}
                      </option>
                    ))}
                  </FormSelect>
                </FormGroup>
              </Col>
              <Col md="4">
                <FormGroup>
                  <label htmlFor="initialFeedstock">
                    Initial Feedstock <span style={{ color: "red" }}>*</span>
                  </label>
                  <FormSelect
                    id="initialFeedstock"
                    value={initialFeedstockId}
                    onChange={(e) => setInitialFeedstockId(e.target.value)}
                    disabled={loading || !masterDataLoaded}
                  >
                    <option value="">Select feedstock...</option>
                    {masterData?.feedstocks?.map((feedstock) => (
                      <option key={feedstock.id} value={feedstock.id}>
                        {getDisplayName(feedstock)}
                      </option>
                    ))}
                  </FormSelect>
                </FormGroup>
              </Col>
              <Col md="4">
                <FormGroup>
                  <label htmlFor="initialCountry">
                    Initial Country <span style={{ color: "red" }}>*</span>
                  </label>
                  <FormSelect
                    id="initialCountry"
                    value={initialCountryId}
                    onChange={(e) => setInitialCountryId(e.target.value)}
                    disabled={loading || !masterDataLoaded}
                  >
                    <option value="">Select country...</option>
                    {masterData?.countries?.map((country) => (
                      <option key={country.id} value={country.id}>
                        {getDisplayName(country)}
                      </option>
                    ))}
                  </FormSelect>
                </FormGroup>
              </Col>
            </Row>

            {/* Loading state for master data */}
            {!masterDataLoaded && (
              <div style={{ textAlign: "center", padding: "1rem", color: "#666" }}>
                <i 
                  className="material-icons" 
                  style={{ 
                    fontSize: "1.5rem", 
                    animation: "spin 1s linear infinite",
                    display: "inline-block"
                  }}
                >
                  refresh
                </i>
                <p>Loading master data...</p>
                <style>{`
                  @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                  }
                `}</style>
              </div>
            )}

            {/* Information about initial selections */}
            {masterDataLoaded && (
              <div style={{ 
                backgroundColor: "#f8f9fa", 
                padding: "1rem", 
                borderRadius: "4px", 
                marginTop: "1rem",
                fontSize: "0.875rem",
                color: "#666"
              }}>
                <p style={{ margin: 0 }}>
                  <strong>Note:</strong> These initial selections will be used for the first scenario. 
                  You can change them later and create additional scenarios with different configurations.
                </p>
              </div>
            )}
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
            disabled={loading || !projectName.trim() || !initialProcessId || !initialFeedstockId || !initialCountryId}
            style={{
              backgroundColor: "#006D7C",
              borderColor: "#006D7C",
            }}
          >
            {loading ? (
              <>
                <i 
                  className="material-icons" 
                  style={{ 
                    fontSize: "1rem", 
                    verticalAlign: "middle", 
                    marginRight: "0.5rem",
                    animation: "spin 1s linear infinite"
                  }}
                >
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