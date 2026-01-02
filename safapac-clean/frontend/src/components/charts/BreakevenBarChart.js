import React, { useRef, useEffect } from "react";
import Chart from "chart.js";
import { useTheme } from "../../contexts/ThemeContext";


const formatNumber = (num) => {
  if (num === null || num === undefined || isNaN(num)) return "-";
  return Number(num).toFixed(2);
};

// Color palette for different scenarios
const SCENARIO_COLORS = [
  { line: "#006D7C", fill: "rgba(0, 109, 124, 0.2)" },  // Teal
  { line: "#F59E0B", fill: "rgba(245, 158, 11, 0.2)" }, // Amber
  { line: "#8B5CF6", fill: "rgba(139, 92, 246, 0.2)" }, // Purple
];

const BreakevenBarChart = ({ data, comparisonData = [] }) => {
  const canvasRef = useRef(null);
  const { theme, colors } = useTheme();

  // Check if we're in comparison mode
  const isComparisonMode = comparisonData && comparisonData.length > 0;

  useEffect(() => {
    const canvas = canvasRef.current;

    console.log("📊 Chart received data:", data?.length, "rows");
    console.log("📊 Chart received comparisonData:", comparisonData);
    console.log("📊 isComparisonMode:", isComparisonMode);

    if (!data || !data.length || !canvas) return;

    const ctx = canvas.getContext("2d");

    if (canvas.chartInstance) {
      canvas.chartInstance.destroy();
    }

    // Create high-density data by interpolating between points
    const createHighDensityData = (originalLabels, originalPV) => {
      const densityFactor = 10;
      const newLabels = [];
      const newPV = [];

      for (let i = 0; i < originalPV.length - 1; i++) {
        newLabels.push(originalLabels[i]);
        newPV.push(originalPV[i]);

        for (let j = 1; j < densityFactor; j++) {
          const ratio = j / densityFactor;
          const interpolatedLabel = originalLabels[i] + (originalLabels[i + 1] - originalLabels[i]) * ratio;
          const interpolatedPV = originalPV[i] + (originalPV[i + 1] - originalPV[i]) * ratio;
          newLabels.push(interpolatedLabel);
          newPV.push(interpolatedPV);
        }
      }

      newLabels.push(originalLabels[originalLabels.length - 1]);
      newPV.push(originalPV[originalPV.length - 1]);

      return { labels: newLabels, pv: newPV };
    };

    let datasets = [];
    let allLabels = [];
    let allPVValues = []; // Track all PV values for scaling

    if (isComparisonMode) {
      // Comparison mode - show multiple scenario lines
      comparisonData.forEach((scenarioData, index) => {
        const { labels, pv } = preprocessData(scenarioData.data);
        const highDensity = createHighDensityData(labels, pv);
        const color = SCENARIO_COLORS[index % SCENARIO_COLORS.length];

        if (index === 0) {
          allLabels = highDensity.labels;
        }

        // Collect all PV values for Y-axis scaling
        allPVValues = allPVValues.concat(highDensity.pv);

        datasets.push({
          label: scenarioData.name,
          data: highDensity.pv.map((v) => Number(formatNumber(v))),
          fill: false,
          backgroundColor: color.fill,
          borderColor: color.line,
          borderWidth: 3,
          pointRadius: highDensity.labels.map((label, i) => {
            return Number.isInteger(Number(label)) && i % 10 === 0 ? 4 : 0;
          }),
          pointBackgroundColor: color.line,
          pointBorderColor: color.line,
          pointBorderWidth: 2,
          tension: 0.1,
        });
      });
    } else {
      // Single scenario mode - original visualization
      const { labels, pv } = preprocessData(data);
      const highDensity = createHighDensityData(labels, pv);
      const densePV = highDensity.pv;
      const denseLabels = highDensity.labels;
      allLabels = denseLabels;
      allPVValues = densePV;

      const allData = densePV.map((v) => Number(formatNumber(v)));
      const negativeData = densePV.map((v) => v < 0 ? Number(formatNumber(v)) : null);
      const positiveData = densePV.map((v) => v >= 0 ? Number(formatNumber(v)) : null);

      datasets = [
        {
          label: "Losses",
          data: negativeData,
          fill: 'origin',
          backgroundColor: "rgba(239, 68, 68, 0.5)",
          borderColor: "transparent",
          borderWidth: 0,
          pointRadius: 0,
          spanGaps: false,
          order: 3,
        },
        {
          label: "Profits",
          data: positiveData,
          fill: 'origin',
          backgroundColor: "rgba(34, 197, 94, 0.5)",
          borderColor: "transparent",
          borderWidth: 0,
          pointRadius: 0,
          spanGaps: false,
          order: 2,
        },
        {
          label: "Present Value",
          data: allData,
          fill: false,
          backgroundColor: "transparent",
          borderColor: theme === 'dark' ? "rgba(156, 163, 175, 1)" : "rgba(107, 114, 128, 1)",
          borderWidth: 2,
          pointBackgroundColor: denseLabels.map((_, i) =>
            densePV[i] < 0 ? "rgba(239, 68, 68, 1)" : "rgba(34, 197, 94, 1)"
          ),
          pointBorderColor: denseLabels.map((_, i) =>
            densePV[i] < 0 ? "rgba(220, 38, 38, 1)" : "rgba(22, 163, 74, 1)"
          ),
          pointBorderWidth: 2,
          pointRadius: denseLabels.map((label, i) => {
            return Number.isInteger(Number(label)) && i % 10 === 0 ? 5 : 0;
          }),
          order: 1,
        }
      ];
    }

    canvas.chartInstance = new Chart(ctx, {
      type: "line",
      plugins: [],
      data: {
        labels: allLabels,
        datasets: datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        legend: {
          display: isComparisonMode,
          position: 'top',
          labels: {
            fontColor: colors.text,
            usePointStyle: true,
            padding: 15,
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (context) =>
                `${context.dataset.label}: ${formatNumber(context.raw)}`,
            },
          },
          legend: {
            display: isComparisonMode,
            position: 'top',
            labels: {
              fontColor: colors.text,
              usePointStyle: true,
              padding: 15,
            }
          },
          title: {
            display: false,
            fontColor: colors.text
          },
        },
        scales: {
          xAxes: [{
            scaleLabel: {
              display: true,
              labelString: "Project Lifetime (Years)",
              fontColor: colors.text
            },
            ticks: {
              fontColor: colors.text,
              padding: 10,
              autoSkip: false,
              stepSize: 5,  // Force 5-year intervals
              callback: function(value, index, ticks) {
                // Only show labels at 5-year intervals (0, 5, 10, 15, 20...)
                const numValue = Number(value);
                // Check if it's an integer and divisible by 5
                if (Number.isInteger(numValue) && numValue % 5 === 0) {
                  return numValue;
                }
                // Return null to hide the tick completely
                return null;
              },
              min: 0,
              max: Math.max(...allLabels),
              maxRotation: 0,
              minRotation: 0
            },
            gridLines: {
              display: true,  // Must be true to show borders
              drawBorder: true,
              drawOnChartArea: false,  // Don't draw grid lines in chart area
              drawTicks: true,  // Show tick marks
              tickMarkLength: 10,  // Length of tick marks in pixels
              zeroLineColor: colors.border,
              color: colors.border,
              lineWidth: 2,  // Thickness of axis line
              zeroLineWidth: 2  // Thickness of zero line
            }
          }],
          yAxes: [{
            scaleLabel: {
              display: true,
              labelString: "Cumulative Discounted Cash Flow ($M)",
              fontColor: colors.text
            },
            ticks: {
              fontColor: colors.text,
              padding: 10,  // Space between tick marks and labels
              beginAtZero: false,
              // Calculate consistent step size based on data range
              stepSize: (() => {
                const minVal = Math.min(...allPVValues);
                const maxVal = Math.max(...allPVValues);
                const range = maxVal - minVal;

                // Determine appropriate interval (either 5M or 10M)
                // If range is small (< 50M), use 5M intervals
                // If range is large (>= 50M), use 10M intervals
                if (range < 50000000) {
                  return 5000000;  // 5M intervals
                } else {
                  return 10000000;  // 10M intervals
                }
              })(),
              // Set min/max based on all data values for proper scaling with padding
              min: (() => {
                const minVal = Math.min(...allPVValues);
                const maxVal = Math.max(...allPVValues);
                const range = maxVal - minVal;
                const interval = range < 50000000 ? 5000000 : 10000000;

                const paddedMin = minVal < 0 ? minVal * 1.1 : minVal * 0.9;
                // Round down to nearest interval
                return Math.floor(paddedMin / interval) * interval;
              })(),
              max: (() => {
                const minVal = Math.min(...allPVValues);
                const maxVal = Math.max(...allPVValues);
                const range = maxVal - minVal;
                const interval = range < 50000000 ? 5000000 : 10000000;

                const paddedMax = maxVal > 0 ? maxVal * 1.1 : maxVal * 0.9;
                // Round up to nearest interval
                return Math.ceil(paddedMax / interval) * interval;
              })(),
              callback: (val) => {
                if (val === null || val === undefined || isNaN(val)) return "-";
                const millions = val / 1000000;
                return millions.toFixed(1);
              },
            },
            gridLines: {
              display: true,  // Must be true to show borders
              drawBorder: true,
              drawOnChartArea: false,  // Don't draw grid lines in chart area
              drawTicks: true,  // Show tick marks
              // tickMarkLength: 10,  // Length of tick marks in pixels
              zeroLineColor: colors.border,  // Same color as labels
              color: colors.border,
              lineWidth: 2,  // Thickness of axis line
              zeroLineWidth: 2  // Thickness of zero line
            }
          }],
        },
      },
    });

    // Cleanup function to prevent memory leaks
    return () => {
      if (canvas?.chartInstance) {
        canvas.chartInstance.destroy();
      }
    };
  }, [data, comparisonData, isComparisonMode, theme, colors]);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
};

const preprocessData = (rows) => {
  // Flexible label detection - try multiple possible keys
  const labels = rows.map((r) => r["Year"] ?? r["year"] ?? r["Project Lifetime"] ?? 0);

  // Flexible key detection for cumulative DCF values
  const key =
    Object.keys(rows[0] || {}).find((k) =>
      k.toLowerCase().includes("cumulative") && k.toLowerCase().includes("dcf")
    ) || "Cumulative DCF (USD)";

  console.log("=== Chart Data Debug ===");
  console.log("Number of rows:", rows.length);
  console.log("Detected key:", key);
  console.log("First row:", rows[0]);
  console.log("Labels (first 5):", labels.slice(0, 5));

  const pv = rows.map((r) => {
    const value = r[key];
    // Don't use || 0 because it converts falsy values (including 0) to 0
    return value !== null && value !== undefined ? Number(value) : 0;
  });

  console.log("PV values (first 5):", pv.slice(0, 5));
  console.log("PV values (last 5):", pv.slice(-5));
  console.log("All zero?", pv.every(v => v === 0));

  const breakevenIndex = pv.findIndex((v) => v >= 0);
  console.log("Breakeven at index:", breakevenIndex);

  return { labels, pv, breakevenIndex };
};



export default BreakevenBarChart;