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

  const chart = new Chart(ctx, {
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
    plugins: [{
      // Custom plugin to draw value labels on pie slices
      afterDatasetsDraw: function(chart) {
        const ctx = chart.ctx;
        const meta = chart.getDatasetMeta(0);
        const centerX = meta.data[0]._model.x;
        const centerY = meta.data[0]._model.y;

        meta.data.forEach(function(slice, index) {
          const value = values[index];
          const percentage = percentages[index];

          if (value && value > 0) {
            // Get the center position of the slice
            const model = slice._model;
            const startAngle = model.startAngle;
            const endAngle = model.endAngle;
            const midAngle = startAngle + (endAngle - startAngle) / 2;
            const radius = (model.innerRadius + model.outerRadius) / 2;

            // Check if slice is small (less than 10% or small angle)
            const sliceAngle = endAngle - startAngle;
            const isSmallSlice = percentage < 10 || sliceAngle < 0.3; // ~17 degrees

            const label = `$${value.toFixed(2)}`;
            const percentLabel = `(${percentage.toFixed(2)}%)`;

            if (isSmallSlice) {
              // Draw label outside with leader line
              const outerRadius = model.outerRadius;
              const lineStartX = centerX + Math.cos(midAngle) * outerRadius;
              const lineStartY = centerY + Math.sin(midAngle) * outerRadius;

              const labelDistance = outerRadius + 30;
              const lineEndX = centerX + Math.cos(midAngle) * labelDistance;
              const lineEndY = centerY + Math.sin(midAngle) * labelDistance;

              // Draw leader line
              ctx.strokeStyle = colors?.text || '#000000';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(lineStartX, lineStartY);
              ctx.lineTo(lineEndX, lineEndY);
              ctx.stroke();

              // Draw label outside
              ctx.fillStyle = colors?.text || '#000000';
              ctx.font = 'bold 11px sans-serif';
              ctx.textAlign = lineEndX > centerX ? 'left' : 'right';
              ctx.textBaseline = 'middle';

              const labelX = lineEndX + (lineEndX > centerX ? 5 : -5);
              ctx.fillText(label, labelX, lineEndY - 6);
              ctx.fillText(percentLabel, labelX, lineEndY + 6);
            } else {
              // Draw label inside the slice
              const x = centerX + Math.cos(midAngle) * radius * 0.75;
              const y = centerY + Math.sin(midAngle) * radius * 0.75;

              ctx.fillStyle = '#000000ff';
              ctx.font = 'bold 11px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';

              ctx.fillText(label, x, y - 6);
              ctx.fillText(percentLabel, x, y + 6);
            }
          }
        });
      }
    }],
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

  return chart;
};

// Create comparative (grouped) horizontal bar chart for comparison mode
const createStackedBarChart = (ctx, comparisonData, colors, shouldAnimate = true) => {
  // Scenario colors for comparison (reuse from BreakevenBarChart)
  const SCENARIO_COLORS = [
    '#006D7C',  // Teal
    '#F59E0B',  // Amber
    '#8B5CF6',  // Purple
  ];

  // Cost component labels for y-axis
  const costComponents = [
    'Capital (TCI)',
    'Feedstock',
    'Hydrogen',
    'Electricity',
    'Indirect OPEX'
  ];

  // Prepare datasets for each scenario
  const datasets = comparisonData.map((scenario, index) => ({
    label: scenario.scenarioName || `Scenario ${index + 1}`,
    data: [
      scenario.lcopData.capital,
      scenario.lcopData.feedstock,
      scenario.lcopData.hydrogen,
      scenario.lcopData.electricity,
      scenario.lcopData.indirect
    ],
    backgroundColor: SCENARIO_COLORS[index % SCENARIO_COLORS.length],
    borderColor: colors?.cardBackground || '#ffffff',
    borderWidth: 1
  }));

  const chart = new Chart(ctx, {
    type: 'horizontalBar',
    data: {
      labels: costComponents,
      datasets: datasets
    },
    plugins: [{
      // Custom plugin to draw value labels on bars
      afterDatasetsDraw: function(chart) {
        const ctx = chart.ctx;
        chart.data.datasets.forEach(function(dataset, datasetIndex) {
          const meta = chart.getDatasetMeta(datasetIndex);
          if (!meta.hidden) {
            meta.data.forEach(function(bar, index) {
              const data = dataset.data[index];
              if (data && data > 0) {
                ctx.fillStyle = colors?.text || '#000000';
                ctx.font = 'bold 10px sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                const label = '$' + data.toFixed(2);
                const x = bar._model.x + 5; // 5px padding from end of bar
                const y = bar._model.y;
                ctx.fillText(label, x, y);
              }
            });
          }
        });
      }
    }],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: shouldAnimate ? 1000 : 0
      },
      scales: {
        xAxes: [{
          stacked: false,  // Grouped bars, not stacked
          ticks: {
            fontColor: colors?.text || '#000000',
            fontSize: 10,
            callback: function(value) {
              return '$' + value.toFixed(0);
            }
          },
          scaleLabel: {
            display: true,
            labelString: 'Cost ($/T)',
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
          stacked: false,  // Grouped bars, not stacked
          ticks: {
            fontColor: colors?.text || '#000000',
            fontSize: 10
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
            const scenarioName = data.datasets[tooltipItem.datasetIndex].label || '';
            const value = tooltipItem.xLabel;
            return `${scenarioName}: $${value.toFixed(2)}/T`;
          }
        }
      },
      title: {
        display: true,
        text: 'LCOP Comparison by Cost Component',
        fontColor: colors?.text || '#000000',
        fontSize: 14,
        fontStyle: 'bold',
        padding: 20
      }
    }
  });

  return chart;
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
