const cashflowToChart = (cashFlowTable) => {
  const labels = cashFlowTable.map((row) => row.Year);
  const presentValues = cashFlowTable.map((row) => row["Present Value"]);

  // Cumulative PV to track breakeven
  let cumulative = 0;
  const cumulativePV = presentValues.map((pv) => {
    cumulative += pv;
    return cumulative;
  });

  // Find breakeven index
  const breakevenIndex = cumulativePV.findIndex((val) => val >= 0);

  return {
    labels,
    datasets: [
      {
        label: "Cumulative PV",
        data: cumulativePV,
        fill: false,
        borderColor: "#007bff",
        borderWidth: 2,
        pointRadius: labels.map((_, i) => (i === breakevenIndex ? 6 : 0)), // Emphasize breakeven
        pointBackgroundColor: labels.map((_, i) =>
          i === breakevenIndex ? "red" : "transparent"
        )
      }
    ],
    breakevenYear: breakevenIndex >= 0 ? labels[breakevenIndex] : null
  };
};
