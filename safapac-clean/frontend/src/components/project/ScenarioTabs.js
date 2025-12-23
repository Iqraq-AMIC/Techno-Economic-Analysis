/**
 * ScenarioTabs - Vertical tab navigation for scenarios
 * Shows in sidebar, allows switching between scenarios
 * Includes "Add Scenario" button (max 3 scenarios)
 */

import React, { useState, useRef, useEffect } from "react";
import { Button, Badge } from "shards-react";
import { useProject } from "../../contexts/ProjectContext";
import { useTheme } from "../../contexts/ThemeContext";

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

  const handleDeleteScenario = async (e, scenarioId, scenarioIndex) => {
    e.stopPropagation();

    // Only allow deleting Scenario 2 (index 1) or Scenario 3 (index 2)
    if (scenarioIndex === 0) return;

    if (scenarios.length <= 1) {
      alert("Cannot delete the only scenario");
      return;
    }

    const confirmDelete = window.confirm(`Are you sure you want to delete this scenario? This action cannot be undone.`);
    if (!confirmDelete) return;

    await deleteScenario(scenarioId);
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
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.5rem",
        }}
      >
        <h6
          style={{
            margin: 0,
            fontSize: "0.8rem",
            fontWeight: 600,
            color: colors.text,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Scenarios
        </h6>
        <Badge
          theme="secondary"
          style={{
            fontSize: "0.7rem",
            padding: "0.2rem 0.4rem",
          }}
        >
          {scenarios.length}/3
        </Badge>
      </div>

      {/* Scenario Tabs */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
        {scenarios.map((scenario, index) => {
          // Safety check - skip scenarios without valid ID
          if (!scenario || !scenario.scenario_id) {
            console.warn("⚠️ ScenarioTabs - Invalid scenario at index", index, scenario);
            return null;
          }
          const isActive = currentScenario?.scenario_id === scenario.scenario_id;
          const isCompared = comparisonScenarios.includes(scenario.scenario_id);
          const canDelete = index > 0; // Can delete Scenario 2 and 3 (index 1 and 2)

          return (
            <div
              key={scenario.scenario_id}
              onClick={() => handleTabClick(scenario.scenario_id)}
              style={{
                padding: "0.5rem 0.75rem",
                borderRadius: "4px",
                cursor: loading ? "not-allowed" : "pointer",
                backgroundColor: isActive ? "#006D7C" : colors.cardBackground,
                color: isActive ? "white" : colors.text,
                border: isActive ? "none" : `1px solid ${colors.border}`,
                fontWeight: isActive ? 600 : 400,
                fontSize: "0.85rem",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                opacity: loading && !isActive ? 0.6 : 1,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <input
                  type="checkbox"
                  checked={isCompared}
                  onChange={(e) => handleCompareToggle(e, scenario.scenario_id)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: "14px",
                    height: "14px",
                    cursor: "pointer",
                    accentColor: "#006D7C",
                  }}
                  title="Select for comparison"
                />
                <EditableScenarioName
                  scenario={scenario}
                  isActive={isActive}
                  onRename={renameScenario}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                {canDelete && (
                  <i
                    className="material-icons"
                    onClick={(e) => handleDeleteScenario(e, scenario.scenario_id, index)}
                    style={{
                      fontSize: "0.9rem",
                      cursor: "pointer",
                      opacity: 0.7,
                      color: isActive ? "white" : "#c4183c",
                    }}
                    title="Delete scenario"
                  >
                    delete
                  </i>
                )}
                {isActive && (
                  <i
                    className="material-icons"
                    style={{ fontSize: "0.95rem" }}
                  >
                    check_circle
                  </i>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison Controls */}
      {isComparisonMode && (
        <div style={{ marginTop: "0.5rem", padding: "0.4rem 0.5rem", backgroundColor: colors.hoverBackground, borderRadius: "4px", border: `1px solid ${colors.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <small style={{ color: colors.textSecondary, fontWeight: 600, fontSize: "0.75rem" }}>
              Comparing {comparisonScenarios.length} scenario{comparisonScenarios.length !== 1 ? "s" : ""}
            </small>
            <Button
              size="sm"
              theme="danger"
              outline
              onClick={clearComparison}
              style={{ fontSize: "0.7rem", padding: "0.2rem 0.4rem" }}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Add Scenario Button */}
      <Button
        size="sm"
        block
        outline={!canAddScenario}
        theme={canAddScenario ? "success" : "secondary"}
        disabled={!canAddScenario}
        onClick={handleAddScenario}
        style={{
          marginTop: "0.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.4rem",
          fontWeight: 500,
          fontSize: "0.8rem",
          padding: "0.4rem 0.5rem",
          cursor: canAddScenario ? "pointer" : "not-allowed",
          opacity: canAddScenario ? 1 : 0.5,
        }}
      >
        <i className="material-icons" style={{ fontSize: "1rem" }}>
          add_circle_outline
        </i>
        {loading ? "Adding..." : "Add Scenario"}
      </Button>

      {scenarios.length >= 3 && (
        <small
          style={{
            display: "block",
            textAlign: "center",
            color: "#999",
            marginTop: "0.4rem",
            fontSize: "0.7rem",
          }}
        >
          Maximum scenarios reached
        </small>
      )}
    </div>
  );
};

export default ScenarioTabs;
