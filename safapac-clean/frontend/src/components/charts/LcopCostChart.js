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
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const ctx = chartRef.current.getContext('2d');

    // Destroy existing chart instance stored on canvas ref
    if (chartRef.current.chartInstance) {
      chartRef.current.chartInstance.destroy();
      chartRef.current.chartInstance = null;
    }

    // Also destroy the ref-based instance
    if (chartInstance.current) {
      chartInstance.current.destroy();
      chartInstance.current = null;
    }

    // Always animate when creating a new chart
    const shouldAnimate = true;

    if (isComparison && comparisonData && comparisonData.length > 0) {
      // Stacked horizontal bar chart for comparison mode
      chartInstance.current = createStackedBarChart(ctx, comparisonData, colors, shouldAnimate);
      chartRef.current.chartInstance = chartInstance.current;
    } else if (lcopData) {
      // Pie chart for single scenario mode
      chartInstance.current = createPieChart(ctx, lcopData, colors, shouldAnimate);
      chartRef.current.chartInstance = chartInstance.current;
    }
  }, [lcopData, comparisonData, isComparison, colors]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas ref={chartRef}></canvas>
    </div>
  );
};

// Create pie chart for single scenario
const createPieChart = (ctx, lcopData, colors, shouldAnimate = true) => {
  const { capital, feedstock, hydrogen, electricity, indirect } = lcopData;

  // Calculate percentages based on sum of components (matching economic outputs display)
  const values = [capital, feedstock, hydrogen, electricity, indirect];
  const componentsSum = values.reduce((sum, val) => sum + val, 0);
  const percentages = values.map(v => componentsSum > 0 ? (v / componentsSum) * 100 : 0);

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
      animation: {
        duration: shouldAnimate ? 1000 : 0
      },
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
            return `${label}: $${value.toFixed(2)}/T (${percentage}%)`;
          }
        }
      },
      title: {
        display: true,
        text: 'Levelized Cost of Production Breakdown',
        fontColor: colors?.text || '#000000',
        fontSize: 14,
        fontStyle: 'bold',
        padding: 20
      }
    }
  });
};

// Create stacked horizontal bar chart for comparison mode
const createStackedBarChart = (ctx, comparisonData, colors, shouldAnimate = true) => {
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
    type: 'horizontalBar',
    data: {
      labels: scenarioNames,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: shouldAnimate ? 1000 : 0
      },
      scales: {
        xAxes: [{
          stacked: true,
          ticks: {
            fontColor: colors?.text || '#000000',
            fontSize: 10,
            callback: function(value) {
              return value.toFixed(0);
            }
          },
          scaleLabel: {
            display: true,
            labelString: 'Levelized Cost of Production ($/T)',
            fontColor: colors?.text || '#000000',
            fontSize: 11,
            fontStyle: 'bold'
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
      },
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

            // Calculate percentage based on sum of components (matching economic outputs)
            const scenarioIndex = tooltipItem.index;
            const scenarioData = comparisonData[scenarioIndex];
            const components = [
              scenarioData.lcopData.capital,
              scenarioData.lcopData.feedstock,
              scenarioData.lcopData.hydrogen,
              scenarioData.lcopData.electricity,
              scenarioData.lcopData.indirect
            ];
            const componentsSum = components.reduce((sum, val) => sum + val, 0);
            const percentage = componentsSum > 0 ? ((value / componentsSum) * 100).toFixed(1) : '0.0';

            return `${label}: $${value.toFixed(2)}/T (${percentage}%)`;
          },
          footer: function(tooltipItems) {
            if (tooltipItems.length > 0) {
              const scenarioIndex = tooltipItems[0].index;
              const scenarioData = comparisonData[scenarioIndex];
              const components = [
                scenarioData.lcopData.capital,
                scenarioData.lcopData.feedstock,
                scenarioData.lcopData.hydrogen,
                scenarioData.lcopData.electricity,
                scenarioData.lcopData.indirect
              ];
              const componentsSum = components.reduce((sum, val) => sum + val, 0);
              return `Total LCOP: $${componentsSum.toFixed(2)}/T`;
            }
            return '';
          }
        }
      },
      title: {
        display: true,
        text: 'LCOP Comparison Across Scenarios',
        fontColor: colors?.text || '#000000',
        fontSize: 14,
        fontStyle: 'bold',
        padding: 20
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
