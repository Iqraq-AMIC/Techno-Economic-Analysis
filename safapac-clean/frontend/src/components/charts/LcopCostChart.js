import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Chart, registerables } from 'chart.js';

// Register all Chart.js components
Chart.register(...registerables);

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
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Destroy existing chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');

    if (isComparison && comparisonData && comparisonData.length > 0) {
      // Stacked horizontal bar chart for comparison mode
      chartInstance.current = createStackedBarChart(ctx, comparisonData, colors);
    } else if (lcopData) {
      // Pie chart for single scenario mode
      chartInstance.current = createPieChart(ctx, lcopData, colors);
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
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
      plugins: {
        legend: {
          display: true,
          position: 'right',
          labels: {
            color: colors?.text || '#000000',
            font: {
              size: 11
            },
            padding: 10,
            boxWidth: 15
          }
        },
        tooltip: {
          backgroundColor: colors?.cardBackground || '#ffffff',
          titleColor: colors?.text || '#000000',
          bodyColor: colors?.text || '#000000',
          borderColor: colors?.border || '#e5e7eb',
          borderWidth: 1,
          padding: 10,
          displayColors: true,
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed;
              const percentage = percentages[context.dataIndex].toFixed(1);
              return `${label}: $${value.toFixed(2)}/unit (${percentage}%)`;
            }
          }
        },
        title: {
          display: true,
          text: 'Levelized Cost of Production Breakdown',
          color: colors?.text || '#000000',
          font: {
            size: 14,
            weight: 'bold'
          },
          padding: {
            top: 10,
            bottom: 20
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
    type: 'bar',
    data: {
      labels: scenarioNames,
      datasets: datasets
    },
    options: {
      indexAxis: 'y', // Horizontal bars
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          stacked: true,
          ticks: {
            color: colors?.text || '#000000',
            font: {
              size: 10
            },
            callback: function(value) {
              return '$' + value.toFixed(0);
            }
          },
          title: {
            display: true,
            text: 'LCOP (USD/unit)',
            color: colors?.text || '#000000',
            font: {
              size: 11,
              weight: 'bold'
            }
          },
          grid: {
            color: colors?.border || '#e5e7eb',
            borderColor: colors?.border || '#e5e7eb'
          }
        },
        y: {
          stacked: true,
          ticks: {
            color: colors?.text || '#000000',
            font: {
              size: 10
            },
            callback: function(value, index) {
              const name = scenarioNames[index];
              // Truncate long names
              return name.length > 20 ? name.substring(0, 17) + '...' : name;
            }
          },
          grid: {
            display: false
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            color: colors?.text || '#000000',
            font: {
              size: 10
            },
            padding: 8,
            boxWidth: 12
          }
        },
        tooltip: {
          backgroundColor: colors?.cardBackground || '#ffffff',
          titleColor: colors?.text || '#000000',
          bodyColor: colors?.text || '#000000',
          borderColor: colors?.border || '#e5e7eb',
          borderWidth: 1,
          padding: 10,
          displayColors: true,
          callbacks: {
            label: function(context) {
              const label = context.dataset.label || '';
              const value = context.parsed.x;

              // Calculate percentage of total LCOP for this scenario
              const scenarioIndex = context.dataIndex;
              const scenarioData = comparisonData[scenarioIndex];
              const total = scenarioData.lcopData.total || 0;
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';

              return `${label}: $${value.toFixed(2)} (${percentage}%)`;
            },
            footer: function(tooltipItems) {
              if (tooltipItems.length > 0) {
                const scenarioIndex = tooltipItems[0].dataIndex;
                const scenarioData = comparisonData[scenarioIndex];
                const total = scenarioData.lcopData.total || 0;
                return `Total LCOP: $${total.toFixed(2)}/unit`;
              }
              return '';
            }
          }
        },
        title: {
          display: true,
          text: 'LCOP Comparison Across Scenarios',
          color: colors?.text || '#000000',
          font: {
            size: 14,
            weight: 'bold'
          },
          padding: {
            top: 10,
            bottom: 20
          }
        }
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
