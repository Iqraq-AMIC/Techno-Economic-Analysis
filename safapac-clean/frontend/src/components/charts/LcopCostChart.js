import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import Chart from 'chart.js';

// Color palette for LCOP cost components
const LCOP_COLORS = {
  capital: '#92400e',      // Brown (TCI)
  feedstock: '#f59e0b',    // Amber (Feedstock)
  hydrogen: '#06b6d4',     // Cyan (Hydrogen)
  electricity: '#eab308',  // Yellow (Electricity)
  indirect: '#fb923c'      // Orange (Indirect OPEX)
};

const LcopCostChart = ({ lcopData, comparisonData, isComparison, colors }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    const canvas = chartRef.current;
    if (!canvas) return;

    // Destroy existing chart
    if (canvas.chartInstance) {
      canvas.chartInstance.destroy();
    }

    const ctx = canvas.getContext('2d');

    if (isComparison && comparisonData && comparisonData.length > 0) {
      // Stacked horizontal bar chart for comparison mode
      canvas.chartInstance = createStackedBarChart(ctx, comparisonData, colors);
    } else if (lcopData) {
      // Pie chart for single scenario mode
      canvas.chartInstance = createPieChart(ctx, lcopData, colors);
    }

    return () => {
      if (canvas?.chartInstance) {
        canvas.chartInstance.destroy();
      }
    };
  }, [lcopData, comparisonData, isComparison, colors]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas ref={chartRef}></canvas>
    </div>
  );
};

// Create pie chart for single scenario
const createPieChart = (ctx, lcopData, colors) => {
  const { capital, feedstock, hydrogen, electricity, indirect, total } = lcopData;

  // Calculate percentages
  const values = [capital, feedstock, hydrogen, electricity, indirect];
  const percentages = values.map(v => total > 0 ? (v / total) * 100 : 0);

  return new Chart(ctx, {
    type: 'pie',
    data: {
      labels: [
        'Capital (TCI)',
        'Feedstock',
        'Hydrogen',
        'Electricity',
        'Indirect OPEX'
      ],
      datasets: [{
        data: values,
        backgroundColor: [
          LCOP_COLORS.capital,
          LCOP_COLORS.feedstock,
          LCOP_COLORS.hydrogen,
          LCOP_COLORS.electricity,
          LCOP_COLORS.indirect
        ],
        borderColor: colors?.cardBackground || '#ffffff',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      legend: {
        display: true,
        position: 'right',
        labels: {
          fontColor: colors?.text || '#000000',
          fontSize: 11,
          padding: 10,
          boxWidth: 15
        }
      },
      title: {
        display: true,
        text: 'Levelized Cost of Production Breakdown',
        fontColor: colors?.text || '#000000',
        fontSize: 14,
        fontStyle: 'bold',
        padding: 10
      },
      tooltips: {
        backgroundColor: colors?.cardBackground || '#ffffff',
        titleFontColor: colors?.text || '#000000',
        bodyFontColor: colors?.text || '#000000',
        borderColor: colors?.border || '#e5e7eb',
        borderWidth: 1,
        displayColors: true,
        callbacks: {
          label: function(tooltipItem, data) {
            const label = data.labels[tooltipItem.index] || '';
            const value = data.datasets[0].data[tooltipItem.index];
            const percentage = percentages[tooltipItem.index].toFixed(1);
            return `${label}: $${value.toFixed(2)}/unit (${percentage}%)`;
          }
        }
      }
    }
  });
};

// Create stacked horizontal bar chart for comparison mode
const createStackedBarChart = (ctx, comparisonData, colors) => {
  // Extract scenario names
  const scenarioNames = comparisonData.map(d => d.scenarioName || 'Unnamed');

  // Prepare datasets for each cost component
  const datasets = [
    {
      label: 'Capital (TCI)',
      data: comparisonData.map(d => d.lcopData.capital),
      backgroundColor: LCOP_COLORS.capital,
      borderColor: colors?.cardBackground || '#ffffff',
      borderWidth: 1
    },
    {
      label: 'Feedstock',
      data: comparisonData.map(d => d.lcopData.feedstock),
      backgroundColor: LCOP_COLORS.feedstock,
      borderColor: colors?.cardBackground || '#ffffff',
      borderWidth: 1
    },
    {
      label: 'Hydrogen',
      data: comparisonData.map(d => d.lcopData.hydrogen),
      backgroundColor: LCOP_COLORS.hydrogen,
      borderColor: colors?.cardBackground || '#ffffff',
      borderWidth: 1
    },
    {
      label: 'Electricity',
      data: comparisonData.map(d => d.lcopData.electricity),
      backgroundColor: LCOP_COLORS.electricity,
      borderColor: colors?.cardBackground || '#ffffff',
      borderWidth: 1
    },
    {
      label: 'Indirect OPEX',
      data: comparisonData.map(d => d.lcopData.indirect),
      backgroundColor: LCOP_COLORS.indirect,
      borderColor: colors?.cardBackground || '#ffffff',
      borderWidth: 1
    }
  ];

  return new Chart(ctx, {
    type: 'horizontalBar', // Chart.js v2 syntax for horizontal bars
    data: {
      labels: scenarioNames,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          fontColor: colors?.text || '#000000',
          fontSize: 10,
          padding: 8,
          boxWidth: 12
        }
      },
      title: {
        display: true,
        text: 'LCOP Comparison Across Scenarios',
        fontColor: colors?.text || '#000000',
        fontSize: 14,
        fontStyle: 'bold',
        padding: 10
      },
      tooltips: {
        backgroundColor: colors?.cardBackground || '#ffffff',
        titleFontColor: colors?.text || '#000000',
        bodyFontColor: colors?.text || '#000000',
        borderColor: colors?.border || '#e5e7eb',
        borderWidth: 1,
        displayColors: true,
        callbacks: {
          label: function(tooltipItem, data) {
            const label = data.datasets[tooltipItem.datasetIndex].label || '';
            const value = tooltipItem.xLabel;

            // Calculate percentage of total LCOP for this scenario
            const scenarioIndex = tooltipItem.index;
            const scenarioData = comparisonData[scenarioIndex];
            const total = scenarioData.lcopData.total || 0;
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';

            return `${label}: $${value.toFixed(2)} (${percentage}%)`;
          },
          afterBody: function(tooltipItems) {
            if (tooltipItems.length > 0) {
              const scenarioIndex = tooltipItems[0].index;
              const scenarioData = comparisonData[scenarioIndex];
              const total = scenarioData.lcopData.total || 0;
              return `Total LCOP: $${total.toFixed(2)}/unit`;
            }
            return '';
          }
        }
      },
      scales: {
        xAxes: [{
          stacked: true,
          ticks: {
            fontColor: colors?.text || '#000000',
            fontSize: 10,
            callback: function(value) {
              return '$' + value.toFixed(0);
            }
          },
          scaleLabel: {
            display: true,
            labelString: 'LCOP (USD/unit)',
            fontColor: colors?.text || '#000000',
            fontSize: 11
          },
          gridLines: {
            color: colors?.border || '#e5e7eb',
            zeroLineColor: colors?.border || '#e5e7eb'
          }
        }],
        yAxes: [{
          stacked: true,
          ticks: {
            fontColor: colors?.text || '#000000',
            fontSize: 10,
            callback: function(value) {
              // Truncate long names
              return value.length > 20 ? value.substring(0, 17) + '...' : value;
            }
          },
          gridLines: {
            display: false
          }
        }]
      }
    }
  });
};

LcopCostChart.propTypes = {
  lcopData: PropTypes.shape({
    capital: PropTypes.number,
    feedstock: PropTypes.number,
    hydrogen: PropTypes.number,
    electricity: PropTypes.number,
    indirect: PropTypes.number,
    total: PropTypes.number
  }),
  comparisonData: PropTypes.arrayOf(PropTypes.shape({
    scenarioName: PropTypes.string,
    lcopData: PropTypes.shape({
      capital: PropTypes.number,
      feedstock: PropTypes.number,
      hydrogen: PropTypes.number,
      electricity: PropTypes.number,
      indirect: PropTypes.number,
      total: PropTypes.number
    })
  })),
  isComparison: PropTypes.bool,
  colors: PropTypes.object
};

LcopCostChart.defaultProps = {
  isComparison: false,
  colors: {}
};

export default LcopCostChart;
