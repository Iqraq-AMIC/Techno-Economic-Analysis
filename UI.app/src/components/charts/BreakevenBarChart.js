import React, { useRef, useEffect } from "react";
import Chart from "chart.js";


const formatNumber = (num) => {
  if (num === null || num === undefined || isNaN(num)) return "-";
  return Number(num).toFixed(2);
};

const BreakevenBarChart = ({ data }) => {
  const canvasRef = useRef(null);

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
          // Red fill for negative portions of the curve
          {
            label: "Losses",
            data: negativeData,
            fill: 'origin',
            backgroundColor: "rgba(255,99,132,0.3)",
            borderColor: "transparent",
            borderWidth: 0,
            pointRadius: 0,
            spanGaps: false,
            order: 3,
          },
          // Green fill for positive portions of the curve
          {
            label: "Profits",
            data: positiveData,
            fill: 'origin',
            backgroundColor: "rgba(75,192,75,0.3)",
            borderColor: "transparent",
            borderWidth: 0,
            pointRadius: 0,
            spanGaps: false,
            order: 2,
          },
          // Main continuous line with colored dots
          {
            label: "Present Value",
            data: allData,
            fill: false,
            backgroundColor: "transparent",
            borderColor: "rgba(54,162,235,1)",
            borderWidth: 2,
            pointBackgroundColor: denseLabels.map((_, i) =>
              densePV[i] < 0 ? "rgba(255,99,132,1)" : "rgba(75,192,75,1)"
            ),
            pointBorderColor: denseLabels.map((_, i) =>
              densePV[i] < 0 ? "rgba(255,99,132,1)" : "rgba(75,192,75,1)"
            ),
            pointRadius: denseLabels.map((label, i) => {
              // Only show dots at integer years
              return Number.isInteger(Number(label)) && i % 10 === 0 ? 4 : 0;
            }),
            order: 1,
          }
        ],
      },
      options: {
        responsive: true,
        legend: {
          display: false
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (context) =>
                `Cumulative PV: ${formatNumber(context.raw)}`, // ✅ tooltip 2 decimals
            },
          },
          legend: {
            display: false
          },
          title: {
            display: false
          },
        },
        scales: {
          xAxes: [{
            scaleLabel: {
              display: true,
              labelString: "Project Lifetime (Years)"
            },
            ticks: {
              callback: function(value, index, values) {
                // Only show integer labels on x-axis
                return Number.isInteger(Number(value)) ? value : '';
              },
              stepSize: 1, // Force 1-year intervals
              max: Math.max(...denseLabels), // Set max to the highest year
              min: Math.min(...denseLabels), // Set min to the lowest year
              maxRotation: 0, // Keep labels horizontal
              minRotation: 0
            }
          }],
          yAxes: [{
            scaleLabel: {
              display: true,
              labelString: "Cumulative Present Value ($)"
            },
            ticks: {
              beginAtZero: false,
              callback: (val) => {
                if (val === null || val === undefined || isNaN(val)) return "-";
                return Number(val).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                });
              },
            },
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
  }, [data]);

  return <canvas ref={canvasRef} />;
};

// Helper: cumulative PV + breakeven index
const preprocessData = (rows) => {
  let cumulative = 0;
  const labels = rows.map((r) => r["Project Lifetime"] ?? r["Year"]);
  const pv = rows.map((r) => {
    cumulative += r["Present Value"];
    return cumulative;
  });

  const breakevenIndex = pv.findIndex((v) => v >= 0);
  return { labels, pv, breakevenIndex };
};

export default BreakevenBarChart;
