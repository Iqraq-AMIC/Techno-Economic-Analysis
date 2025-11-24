// src/components/project/ScenarioTabs.js

import React from "react";
import { Button, Badge } from "shards-react";
import { useProject } from "../../contexts/ProjectContext";
import { useTheme } from "../../contexts/ThemeContext";

const ScenarioTabs = () => {
  const { colors } = useTheme();
  const {
    currentProject,
    currentScenario,
    scenarios,
    switchScenario,
    addScenario,
    deleteScenario,
    loading,
    comparisonScenarios,
    toggleComparisonScenario,
    clearComparison,
  } = useProject();

  console.log("🎯 ScenarioTabs rendering - currentProject:", currentProject);
  console.log("🎯 ScenarioTabs - scenarios:", scenarios);
  console.log("🎯 ScenarioTabs - currentScenario:", currentScenario);

  // Don't render if no project is selected
  if (!currentProject) {
    console.log("❌ ScenarioTabs - No project, returning null");
    return null;
  }

  console.log("✅ ScenarioTabs - Rendering with project:", currentProject.projectName || currentProject.project_name);

  // FIX: Use 'id' instead of 'scenario_id'
  const handleTabClick = async (scenarioId) => {
    if (scenarioId === currentScenario?.id || loading) return; // Changed scenario_id to id
    await switchScenario(scenarioId);
  };

  const handleAddScenario = async () => {
    if (loading || scenarios.length >= 3) return;

    const result = await addScenario();
    if (result.success) {
      // FIX: Use 'id' instead of 'scenario_id'
      await switchScenario(result.scenario.id); // Changed scenario_id to id
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
          // FIX: Use 'id' instead of 'scenario_id'
          const isActive = currentScenario?.id === scenario.id; // Changed scenario_id to id
          const isCompared = comparisonScenarios.includes(scenario.id); // Changed scenario_id to id
          const canDelete = index > 0; // Can delete Scenario 2 and 3 (index 1 and 2)

          const DebugScenarioData = () => (
            <div style={{
              position: 'fixed',
              bottom: '10px',
              right: '10px',
              background: 'rgba(0,0,0,0.9)',
              color: 'white',
              padding: '10px',
              fontSize: '10px',
              zIndex: 1000,
              maxWidth: '400px',
              maxHeight: '300px',
              overflow: 'auto'
            }}>
              <strong>🔧 Scenario Data Debug:</strong><br />
              <strong>Project:</strong> {JSON.stringify(currentProject, null, 2)}<br />
              <strong>Current Scenario:</strong> {JSON.stringify(currentScenario, null, 2)}<br />
              <strong>All Scenarios:</strong> {JSON.stringify(scenarios, null, 2)}
            </div>
          );

          return (

            <div
              key={scenario.id} // Changed scenario_id to id
              onClick={() => handleTabClick(scenario.id)} // Changed scenario_id to id
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
                  onChange={(e) => handleCompareToggle(e, scenario.id)} // Changed scenario_id to id
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: "14px",
                    height: "14px",
                    cursor: "pointer",
                    accentColor: "#006D7C",
                  }}
                  title="Select for comparison"
                />
                {/* FIX: Use scenario_name (snake_case from backend) */}
                <span>{scenario.scenario_name}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                {canDelete && (
                  <i
                    className="material-icons"
                    onClick={(e) => handleDeleteScenario(e, scenario.id, index)} // Changed scenario_id to id
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