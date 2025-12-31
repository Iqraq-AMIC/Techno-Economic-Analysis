/**
 * ScenarioTabs - Vertical tab navigation for scenarios
 * Shows in sidebar, allows switching between scenarios
 * Includes "Add Scenario" button (max 3 scenarios)
 */

import React, { useState, useRef, useEffect } from "react";
import { Button, Modal, ModalBody, ModalHeader, ModalFooter } from "shards-react";
import { useProject } from "../../contexts/ProjectContext";
import { useTheme } from "../../contexts/ThemeContext";

// Add CSS for spinning animation
const spinKeyframes = `
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
`;

// Inject the keyframes into the document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = spinKeyframes;
  document.head.appendChild(styleSheet);
}

const EditableScenarioName = ({ scenario, isActive, onRename }) => {
  const { colors } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(scenario.scenario_name);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Reset when scenario changes
  useEffect(() => {
    setEditValue(scenario.scenario_name);
    setError(null);
  }, [scenario.scenario_name]);

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditValue(scenario.scenario_name);
    setError(null);
  };

  const handleSave = async () => {
    const trimmedValue = editValue.trim();

    // Exit edit mode if unchanged
    if (trimmedValue === scenario.scenario_name) {
      setIsEditing(false);
      return;
    }

    // Don't save if empty (validation will show error)
    if (!trimmedValue) {
      setError("Scenario name cannot be empty");
      return;
    }

    setSaving(true);
    setError(null);

    const result = await onRename(scenario.scenario_id, trimmedValue);

    if (result.success) {
      setIsEditing(false);
      setError(null);
    } else {
      setError(result.error || "Failed to rename scenario");
    }
    setSaving(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      // Escape cancels without saving
      setIsEditing(false);
      setEditValue(scenario.scenario_name);
      setError(null);
    }
  };

  const handleBlur = () => {
    // Cancel edit when clicking outside (discard changes)
    if (isEditing && !saving) {
      setIsEditing(false);
      setEditValue(scenario.scenario_name);
      setError(null);
    }
  };

  if (isEditing) {
    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onClick={(e) => e.stopPropagation()}
            maxLength={100}
            disabled={saving}
            style={{
              flex: 1,
              padding: "0.2rem 0.4rem",
              fontSize: "0.85rem",
              border: error ? "1px solid #c4183c" : `1px solid ${colors.border}`,
              borderRadius: "3px",
              backgroundColor: isActive ? "rgba(255,255,255,0.9)" : colors.background,
              color: isActive ? "#333" : colors.text,
              outline: "none",
            }}
          />
          {saving && (
            <i className="material-icons" style={{ fontSize: "0.85rem", marginLeft: "0.3rem", opacity: 0.7 }}>
              refresh
            </i>
          )}
        </div>
        {error && (
          <small style={{ color: "#c4183c", fontSize: "0.7rem", marginTop: "0.2rem" }}>
            {error}
          </small>
        )}
      </div>
    );
  }

  return (
    <span
      onDoubleClick={handleDoubleClick}
      style={{
        cursor: "text",
        flex: 1,
      }}
      title="Double-click to rename"
    >
      {scenario.scenario_name}
    </span>
  );
};

const DeleteScenarioModal = ({ isOpen, onClose, onConfirm, scenarioName, deleting }) => {
  const { colors } = useTheme();

  return (
    <Modal open={isOpen} centered toggle={onClose} size="sm">
      <ModalHeader style={{ backgroundColor: "#c4183c", color: "white", borderBottom: "none" }}>
        <i className="material-icons" style={{ verticalAlign: "middle", marginRight: "0.5rem" }}>
          warning
        </i>
        Delete Scenario
      </ModalHeader>
      <ModalBody>
        <div style={{ padding: "0.5rem 0" }}>
          <p style={{ marginBottom: "1rem", color: colors.text }}>
            Are you sure you want to delete <strong>"{scenarioName}"</strong>?
          </p>
          <p style={{ color: "#c4183c", fontSize: "0.9rem", marginBottom: 0 }}>
            <i className="material-icons" style={{ fontSize: "1rem", verticalAlign: "middle", marginRight: "0.3rem" }}>
              error_outline
            </i>
            This action cannot be undone.
          </p>
        </div>
      </ModalBody>
      <ModalFooter style={{ borderTop: `1px solid ${colors.border}`, padding: "0.75rem 1rem" }}>
        <Button
          theme="light"
          onClick={onClose}
          disabled={deleting}
          style={{ marginRight: "0.5rem" }}
        >
          Cancel
        </Button>
        <Button
          theme="danger"
          onClick={onConfirm}
          disabled={deleting}
          style={{ backgroundColor: "#c4183c", borderColor: "#c4183c" }}
        >
          {deleting ? (
            <>
              <i className="material-icons" style={{ fontSize: "1rem", verticalAlign: "middle", marginRight: "0.3rem", animation: "spin 1s linear infinite" }}>
                refresh
              </i>
              Deleting...
            </>
          ) : (
            <>
              <i className="material-icons" style={{ fontSize: "1rem", verticalAlign: "middle", marginRight: "0.3rem" }}>
                delete
              </i>
              Delete Scenario
            </>
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

const ScenarioTabs = () => {
  const { colors } = useTheme();
  const {
    currentProject,
    currentScenario,
    scenarios,
    switchScenario,
    addScenario,
    deleteScenario,
    renameScenario,
    loading,
    comparisonScenarios,
    toggleComparisonScenario,
    clearComparison,
  } = useProject();

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, scenarioId: null, scenarioName: "" });
  const [deleting, setDeleting] = useState(false);

  console.log("🎯 ScenarioTabs rendering - currentProject:", currentProject);
  console.log("🎯 ScenarioTabs - scenarios:", scenarios);
  console.log("🎯 ScenarioTabs - scenarios.length:", scenarios?.length);
  console.log("🎯 ScenarioTabs - currentScenario:", currentScenario);

  // Don't render if no project is selected
  if (!currentProject) {
    console.log("❌ ScenarioTabs - No project, returning null");
    return null;
  }

  console.log("✅ ScenarioTabs - Rendering with project:", currentProject.project_name);

  const handleTabClick = async (scenarioId) => {
    if (scenarioId === currentScenario?.scenario_id || loading) return;
    await switchScenario(scenarioId);
  };

  const handleAddScenario = async () => {
    if (loading || scenarios.length >= 3) return;

    const result = await addScenario();
    if (result.success) {
      // Automatically switch to the new scenario
      await switchScenario(result.scenario.scenario_id);
    }
  };

  const canAddScenario = scenarios.length < 3 && !loading;
  const isComparisonMode = comparisonScenarios.length > 0;

  const handleCompareToggle = (e, scenarioId) => {
    e.stopPropagation();
    toggleComparisonScenario(scenarioId);
  };

  const handleDeleteScenario = (e, scenarioId, scenarioName) => {
    e.stopPropagation();

    // Allow deleting any scenario as long as there are multiple scenarios
    if (scenarios.length <= 1) {
      alert("Cannot delete the only scenario");
      return;
    }

    setDeleteModal({
      isOpen: true,
      scenarioId,
      scenarioName,
    });
  };

  const confirmDeleteScenario = async () => {
    setDeleting(true);
    const result = await deleteScenario(deleteModal.scenarioId);
    setDeleting(false);

    if (result.success) {
      setDeleteModal({ isOpen: false, scenarioId: null, scenarioName: "" });
    }
  };

  const closeDeleteModal = () => {
    if (!deleting) {
      setDeleteModal({ isOpen: false, scenarioId: null, scenarioName: "" });
    }
  };

  // Safety check - if no scenarios, show loading state
  if (!scenarios || scenarios.length === 0) {
    console.log("⚠️ ScenarioTabs - No scenarios available");
    return (
      <div style={{ padding: "1rem", backgroundColor: colors.background, textAlign: "center" }}>
        <small style={{ color: colors.textSecondary }}>Loading scenarios...</small>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "0.5rem 0.75rem",
        borderBottom: `1px solid ${colors.border}`,
        backgroundColor: colors.background,
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
      }}
    >
      {/* Chrome-like Horizontal Tabs */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: "2px",
          paddingBottom: "2px",
        }}
      >
        {scenarios.map((scenario, index) => {
          // Safety check - skip scenarios without valid ID
          if (!scenario || !scenario.scenario_id) {
            console.warn("⚠️ ScenarioTabs - Invalid scenario at index", index, scenario);
            return null;
          }
          const isActive = currentScenario?.scenario_id === scenario.scenario_id;
          const isCompared = comparisonScenarios.includes(scenario.scenario_id);
          const canDelete = scenarios.length > 1; // Can delete any scenario if there are multiple scenarios

          return (
            <div
              key={scenario.scenario_id}
              onClick={() => handleTabClick(scenario.scenario_id)}
              style={{
                position: "relative",
                padding: "0.5rem 0.75rem",
                width: "calc(33.333% - 2px)",
                cursor: loading ? "not-allowed" : "pointer",
                backgroundColor: isActive ? "#006D7C" : colors.cardBackground,
                color: isActive ? "white" : colors.text,
                border: `1px solid ${isActive ? "#006D7C" : colors.border}`,
                borderBottom: isActive ? "none" : `1px solid ${colors.border}`,
                borderTopLeftRadius: "8px",
                borderTopRightRadius: "8px",
                fontWeight: isActive ? 600 : 400,
                fontSize: "0.75rem",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.5rem",
                opacity: loading && !isActive ? 0.6 : 1,
                boxShadow: isActive ? "0 -2px 4px rgba(0,0,0,0.1)" : "none",
                zIndex: isActive ? 2 : 1,
                marginBottom: isActive ? "0" : "2px",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = colors.hoverBackground;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = colors.cardBackground;
                }
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flex: 1, minWidth: 0 }}>
                {/* Checkbox removed - comparison now in dropdown */}
                {/* <input
                  type="checkbox"
                  checked={isCompared}
                  onChange={(e) => handleCompareToggle(e, scenario.scenario_id)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: "14px",
                    height: "14px",
                    cursor: "pointer",
                    accentColor: "#006D7C",
                    flexShrink: 0,
                  }}
                  title="Select for comparison"
                /> */}
                <div style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <EditableScenarioName
                    scenario={scenario}
                    isActive={isActive}
                    onRename={renameScenario}
                  />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.2rem", flexShrink: 0 }}>
                {canDelete && (
                  <i
                    className="material-icons"
                    onClick={(e) => handleDeleteScenario(e, scenario.scenario_id, scenario.scenario_name)}
                    style={{
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      opacity: 0.7,
                      color: isActive ? "white" : "#c4183c",
                    }}
                    title="Delete scenario"
                  >
                    close
                  </i>
                )}
              </div>
            </div>
          );
        })}

        {/* Add Scenario Tab Button */}
        {canAddScenario && (
          <div
            onClick={handleAddScenario}
            style={{
              width: "32px",
              height: "32px",
              cursor: "pointer",
              color: colors.text,
              fontSize: "1.2rem",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "2px",
              opacity: 0.7,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "0.7";
            }}
            title="Add new scenario"
          >
            <i className="material-icons" style={{ fontSize: "1.2rem" }}>
              add
            </i>
          </div>
        )}
      </div>

      {/* Comparison Controls - Moved to AnalysisDashboard */}

      {scenarios.length >= 3 && (
        <small
          style={{
            display: "block",
            textAlign: "center",
            color: "#999",
            fontSize: "0.7rem",
          }}
        >
          Maximum scenarios reached (3/3)
        </small>
      )}

      {/* Delete Scenario Confirmation Modal */}
      <DeleteScenarioModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDeleteScenario}
        scenarioName={deleteModal.scenarioName}
        deleting={deleting}
      />
    </div>
  );
};

export default ScenarioTabs;
