import React, { useRef, useEffect } from "react";
import Chart from "chart.js";
import { useTheme } from "../../contexts/ThemeContext";


const formatNumber = (num) => {
  if (num === null || num === undefined || isNaN(num)) return "-";
  return Number(num).toFixed(2);
};

const BreakevenBarChart = ({ data }) => {
  const canvasRef = useRef(null);
  const { theme, colors } = useTheme();

  useEffect(() => {
    if (!data || !data.length) return;

    const { labels, pv, breakevenIndex } = preprocessData(data);

    // Create high-density data by interpolating between points
    const createHighDensityData = (originalLabels, originalPV) => {
      const densityFactor = 10; // Add 10 interpolated points between each original point
      const newLabels = [];
      const newPV = [];

      for (let i = 0; i < originalPV.length - 1; i++) {
        newLabels.push(originalLabels[i]);
        newPV.push(originalPV[i]);

        // Add interpolated points between current and next point
        for (let j = 1; j < densityFactor; j++) {
          const ratio = j / densityFactor;
          const interpolatedLabel = originalLabels[i] + (originalLabels[i + 1] - originalLabels[i]) * ratio;
          const interpolatedPV = originalPV[i] + (originalPV[i + 1] - originalPV[i]) * ratio;

          // Keep precise decimal values for smooth interpolation
          newLabels.push(interpolatedLabel);
          newPV.push(interpolatedPV);
        }
      }

      // Add the last point
      newLabels.push(originalLabels[originalLabels.length - 1]);
      newPV.push(originalPV[originalPV.length - 1]);

      return { labels: newLabels, pv: newPV };
    };

    const highDensity = createHighDensityData(labels, pv);
    const densePV = highDensity.pv;
    const denseLabels = highDensity.labels;

    console.log("Original data points:", pv.length);
    console.log("High-density data points:", densePV.length);

    const ctx = canvasRef.current.getContext("2d");

    if (canvasRef.current.chartInstance) {
      canvasRef.current.chartInstance.destroy();
    }

    const allData = densePV.map((v) => Number(formatNumber(v)));

    // Now with high-density data, the transitions will be much smoother
    const negativeData = densePV.map((v) => v < 0 ? Number(formatNumber(v)) : null);
    const positiveData = densePV.map((v) => v >= 0 ? Number(formatNumber(v)) : null);

    canvasRef.current.chartInstance = new Chart(ctx, {
      type: "line",
      plugins: [], // No plugins needed - smooth transitions from high-density data
      data: {
        labels: denseLabels,
        datasets: [
          // Red fill for negative portions of the curve (more vibrant)
          {
            label: "Losses",
            data: negativeData,
            fill: 'origin',
            backgroundColor: "rgba(239, 68, 68, 0.5)",  // Brighter red with more opacity
            borderColor: "transparent",
            borderWidth: 0,
            pointRadius: 0,
            spanGaps: false,
            order: 3,
          },
          // Green fill for positive portions of the curve (more vibrant)
          {
            label: "Profits",
            data: positiveData,
            fill: 'origin',
            backgroundColor: "rgba(34, 197, 94, 0.5)",  // Brighter green with more opacity
            borderColor: "transparent",
            borderWidth: 0,
            pointRadius: 0,
            spanGaps: false,
            order: 2,
          },
          // Main continuous line with colored dots (grey line)
          {
            label: "Present Value",
            data: allData,
            fill: false,
            backgroundColor: "transparent",
            borderColor: theme === 'dark' ? "rgba(156, 163, 175, 1)" : "rgba(107, 114, 128, 1)",  // Grey line
            borderWidth: 2,  // Slightly thinner line
            pointBackgroundColor: denseLabels.map((_, i) =>
              densePV[i] < 0 ? "rgba(239, 68, 68, 1)" : "rgba(34, 197, 94, 1)"  // Brighter colors
            ),
            pointBorderColor: denseLabels.map((_, i) =>
              densePV[i] < 0 ? "rgba(220, 38, 38, 1)" : "rgba(22, 163, 74, 1)"  // Darker borders for contrast
            ),
            pointBorderWidth: 2,
            pointRadius: denseLabels.map((label, i) => {
              // Only show dots at integer years
              return Number.isInteger(Number(label)) && i % 10 === 0 ? 5 : 0;  // Larger points
            }),
            order: 1,
          }
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        legend: {
          display: false,
          labels: {
            fontColor: colors.text
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (context) =>
                `Cumulative PV: ${formatNumber(context.raw)}`, // ✅ tooltip 2 decimals
            },
          },
          legend: {
            display: false,
            labels: {
              fontColor: colors.text
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
              callback: function(value, index, values) {
                // Only show integer labels on x-axis
                return Number.isInteger(Number(value)) ? value : '';
              },
              stepSize: 1, // Force 1-year intervals
              max: Math.max(...denseLabels), // Set max to the highest year
              min: Math.min(...denseLabels), // Set min to the lowest year
              maxRotation: 0, // Keep labels horizontal
              minRotation: 0
            },
            gridLines: {
              display: false,  // Hide X-axis grid lines
              drawBorder: true,
              zeroLineColor: colors.border
            }
          }],
          yAxes: [{
            scaleLabel: {
              display: true,
              labelString: "Cumulative Discounted Cash Flow ($)",
              fontColor: colors.text
            },
            ticks: {
              fontColor: colors.text,
              beginAtZero: false,
              callback: (val) => {
                if (val === null || val === undefined || isNaN(val)) return "-";
                return Number(val).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                });
              },
            },
            gridLines: {
              display: false,  // Hide Y-axis grid lines
              drawBorder: true,
              zeroLineColor: colors.border
            }
          }],
        },
      },
    });

    // Cleanup function to prevent memory leaks
    return () => {
      if (canvasRef.current?.chartInstance) {
        canvasRef.current.chartInstance.destroy();
      }
    };
  }, [data, theme, colors]);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
};

// Helper: cumulative PV + breakeven index
// const preprocessData = (rows) => {
//   let cumulative = 0;
//   const labels = rows.map((r) => r["Project Lifetime"] ?? r["Year"]);
//   const pv = rows.map((r) => {
//     cumulative += r["Present Value"];
//     return cumulative;
//   });

//   const breakevenIndex = pv.findIndex((v) => v >= 0);
//   return { labels, pv, breakevenIndex };
// };
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
