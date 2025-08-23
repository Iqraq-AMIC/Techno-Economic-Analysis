import React, { useRef, useEffect } from "react";
import Chart from "chart.js";

const BreakevenBarChart = ({ data }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!data || !data.length) return;

    const { labels, pv, breakevenIndex } = preprocessData(data);

    const ctx = canvasRef.current.getContext("2d");

    // Clean up previous chart before re-render
    if (canvasRef.current.chartInstance) {
      canvasRef.current.chartInstance.destroy();
    }

    canvasRef.current.chartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Cumulative Present Value ($)",
            data: pv,
            backgroundColor: labels.map((_, i) =>
              i === breakevenIndex
                ? "rgba(255,99,132,0.8)"   // highlight breakeven bar
                : "rgba(54,162,235,0.6)"
            ),
            borderColor: labels.map((_, i) =>
              i === breakevenIndex
                ? "rgba(255,99,132,1)"
                : "rgba(54,162,235,1)"
            ),
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          tooltip: { enabled: true },
          legend: { display: false },
        },
        scales: {
          x: { title: { display: true, text: "Plant Lifetime (Years)" } },
          y: {
            title: { display: true, text: "Cumulative Present Value ($)" },
            beginAtZero: false,
          },
        },
      },
    });
  }, [data]);

  return <canvas ref={canvasRef} />;
};

// Helper to compute cumulative PV + breakeven index
const preprocessData = (rows) => {
  let cumulative = 0;
  const labels = rows.map((r) => r["Plant Lifetime"] ?? r["Year"]); // support both keys
  const pv = rows.map((r) => {
    cumulative += r["Present Value"];
    return cumulative;
  });

  const breakevenIndex = pv.findIndex((v) => v >= 0);
  return { labels, pv, breakevenIndex };
};

export default BreakevenBarChart;
