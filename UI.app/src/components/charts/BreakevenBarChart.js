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

    const ctx = canvasRef.current.getContext("2d");


    if (canvasRef.current.chartInstance) {
      canvasRef.current.chartInstance.destroy();
    }

    canvasRef.current.chartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Cumulative Present Value ($)",
            data: pv.map((v) => Number(formatNumber(v))), // ✅ format data itself
            backgroundColor: labels.map((_, i) => {
              if (breakevenIndex === -1) {
                return "rgba(255,99,132,0.7)"; // all red if never breakeven
              }
              return i < breakevenIndex
                ? "rgba(255,99,132,0.7)" // before breakeven
                : "rgba(75,192,75,0.7)"; // after breakeven
            }),
            borderColor: labels.map((_, i) => {
              if (breakevenIndex === -1) {
                return "rgba(255,99,132,1)";
              }
              return i < breakevenIndex
                ? "rgba(255,99,132,1)"
                : "rgba(75,192,75,1)";
            }),
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          tooltip: {
            callbacks: {
              label: (context) =>
                `Cumulative PV: ${formatNumber(context.raw)}`, // ✅ tooltip 2 decimals
            },
          },
          legend: { display: false },
        },
        scales: {
          x: { title: { display: true, text: "Plant Lifetime (Years)" } },
          y: {
            title: { display: true, text: "Cumulative Present Value ($)" },
            beginAtZero: false,
            ticks: {
              callback: (val) => formatNumber(val), // ✅ axis 2 decimals
            },
          },
        },
      },
    });
  }, [data]);

  return <canvas ref={canvasRef} />;
};

// Helper: cumulative PV + breakeven index
const preprocessData = (rows) => {
  let cumulative = 0;
  const labels = rows.map((r) => r["Plant Lifetime"] ?? r["Year"]);
  const pv = rows.map((r) => {
    cumulative += r["Present Value"];
    return cumulative;
  });

  const breakevenIndex = pv.findIndex((v) => v >= 0);
  return { labels, pv, breakevenIndex };
};

export default BreakevenBarChart;
