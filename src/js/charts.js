/**
 * Charts.js - Chart.js rendering functions
 * Mortgage Dynamic Simulator - Data Visualization Module
 */

const Charts = (() => {
  // Store chart instances to manage lifecycle
  const instances = {
    donut: null,
    area: null,
    line: null
  };

  // Colors from CSS variables (Bootstrap-style theme)
  const colors = {
    primary: '#2563eb',      // Blue - Principal
    success: '#16a34a',      // Green - Interest
    warning: '#ea580c',      // Orange - Insurance
    primaryLight: 'rgba(37, 99, 235, 0.8)',
    successLight: 'rgba(22, 163, 74, 0.8)',
    warningLight: 'rgba(234, 88, 12, 0.8)',
    primaryArea: 'rgba(37, 99, 235, 0.6)',
    successArea: 'rgba(22, 163, 74, 0.6)',
    warningArea: 'rgba(234, 88, 12, 0.6)'
  };

  /**
   * Format currency for tooltips and labels
   */
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  /**
   * Format percentage
   */
  const formatPercentage = (value) => {
    return value.toFixed(1) + '%';
  };

  /**
   * Destroy all chart instances
   */
  const destroyAll = () => {
    Object.keys(instances).forEach(key => {
      if (instances[key]) {
        instances[key].destroy();
        instances[key] = null;
      }
    });
  };

  /**
   * Render Donut Chart - Cost Breakdown (Tab 2)
   * Canvas: #chart-donut
   * Shows Principal, Interest, Insurance split
   * 
   * @param {Object} data - { principal, interest, insurance }
   */
  const renderDonut = (data) => {
    // Destroy existing instance
    if (instances.donut) {
      instances.donut.destroy();
    }

    const canvas = document.getElementById('chart-donut');
    if (!canvas) {
      console.warn('Canvas #chart-donut not found');
      return;
    }

    // Handle empty data
    if (!data || (!data.principal && !data.interest && !data.insurance)) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const total = data.principal + data.interest + data.insurance;
    const percentages = {
      principal: ((data.principal / total) * 100),
      interest: ((data.interest / total) * 100),
      insurance: ((data.insurance / total) * 100)
    };

    instances.donut = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: [
          'Principal (capital remboursé)',
          'Intérêts',
          'Assurance'
        ],
        datasets: [{
          data: [data.principal, data.interest, data.insurance],
          backgroundColor: [
            colors.primary,
            colors.success,
            colors.warning
          ],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              font: {
                size: 13
              },
              generateLabels: (chart) => {
                const data = chart.data;
                if (data.labels.length && data.datasets.length) {
                  return data.labels.map((label, i) => {
                    const value = data.datasets[0].data[i];
                    const percentage = ((value / total) * 100).toFixed(1);
                    return {
                      text: `${label}: ${formatCurrency(value)} (${percentage}%)`,
                      fillStyle: data.datasets[0].backgroundColor[i],
                      hidden: false,
                      index: i
                    };
                  });
                }
                return [];
              }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed;
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${formatCurrency(value)} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  };

  /**
   * Render Stacked Area/Bar Chart - Payment Evolution (Tab 3)
   * Canvas: #chart-area
   * Shows how payments are split between Principal, Interest, Insurance over time
   * 
   * @param {Object} data - { amortization: [{month, year, principalPart, interestPart, insurance, ...}] }
   */
  const renderStackedArea = (data) => {
    // Destroy existing instance
    if (instances.area) {
      instances.area.destroy();
    }

    const canvas = document.getElementById('chart-area');
    if (!canvas) {
      console.warn('Canvas #chart-area not found');
      return;
    }

    // Handle empty data
    if (!data || !data.amortization || data.amortization.length === 0) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const amort = data.amortization;
    
    // Group by year for better visualization (monthly data would be too dense)
    const yearlyData = {};
    amort.forEach(row => {
      const year = row.year;
      if (!yearlyData[year]) {
        yearlyData[year] = {
          principalPart: 0,
          interestPart: 0,
          insurance: 0,
          count: 0
        };
      }
      yearlyData[year].principalPart += row.principalPart;
      yearlyData[year].interestPart += row.interestPart;
      yearlyData[year].insurance += row.insurance;
      yearlyData[year].count++;
    });

    // Convert to arrays
    const years = Object.keys(yearlyData).map(Number).sort((a, b) => a - b);
    const principalData = years.map(year => yearlyData[year].principalPart);
    const interestData = years.map(year => yearlyData[year].interestPart);
    const insuranceData = years.map(year => yearlyData[year].insurance);

    instances.area = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: years.map(y => `Année ${y}`),
        datasets: [
          {
            label: 'Assurance',
            data: insuranceData,
            backgroundColor: colors.warningArea,
            borderColor: colors.warning,
            borderWidth: 1
          },
          {
            label: 'Intérêts',
            data: interestData,
            backgroundColor: colors.successArea,
            borderColor: colors.success,
            borderWidth: 1
          },
          {
            label: 'Principal',
            data: principalData,
            backgroundColor: colors.primaryArea,
            borderColor: colors.primary,
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          x: {
            stacked: true,
            grid: {
              display: false
            }
          },
          y: {
            stacked: true,
            beginAtZero: true,
            ticks: {
              callback: (value) => formatCurrency(value)
            },
            title: {
              display: true,
              text: 'Montant annuel (€)'
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              padding: 15,
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const value = context.parsed.y;
                return `${label}: ${formatCurrency(value)}`;
              },
              footer: (tooltipItems) => {
                let sum = 0;
                tooltipItems.forEach(item => {
                  sum += item.parsed.y;
                });
                return `Total: ${formatCurrency(sum)}`;
              }
            }
          }
        }
      }
    });
  };

  /**
   * Render Line Chart - Remaining Balance (Tab 4)
   * Canvas: #chart-line
   * Shows remaining capital over time
   * Optional: second line for total paid so far
   * 
   * @param {Object} data - { amortization: [{month, year, remainingCapital, totalPaid, ...}] }
   */
  const renderLineChart = (data) => {
    // Destroy existing instance
    if (instances.line) {
      instances.line.destroy();
    }

    const canvas = document.getElementById('chart-line');
    if (!canvas) {
      console.warn('Canvas #chart-line not found');
      return;
    }

    // Handle empty data
    if (!data || !data.amortization || data.amortization.length === 0) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const amort = data.amortization;
    
    // Sample data points - take one point per year for clearer visualization
    const sampledData = [];
    let currentYear = null;
    amort.forEach((row, index) => {
      if (index === 0 || row.year !== currentYear || index === amort.length - 1) {
        sampledData.push(row);
        currentYear = row.year;
      }
    });

    // Calculate cumulative total paid
    let cumulativePaid = 0;
    const labels = sampledData.map(row => `Année ${row.year}`);
    const remainingBalance = sampledData.map(row => row.remainingCapital);
    const totalPaidData = sampledData.map(row => {
      cumulativePaid += row.payment + row.insurance;
      return cumulativePaid;
    });

    // Reset for actual calculation (per year basis)
    const yearlyTotals = {};
    amort.forEach(row => {
      if (!yearlyTotals[row.year]) {
        yearlyTotals[row.year] = 0;
      }
      yearlyTotals[row.year] += (row.payment + row.insurance);
    });

    // Recalculate cumulative based on yearly
    cumulativePaid = 0;
    const correctTotalPaid = sampledData.map(row => {
      for (let y = 1; y <= row.year; y++) {
        if (yearlyTotals[y] && row.year === y) {
          cumulativePaid += yearlyTotals[y];
          break;
        } else if (yearlyTotals[y] && row.year > y && !yearlyTotals[y].counted) {
          cumulativePaid += yearlyTotals[y];
          yearlyTotals[y].counted = true;
        }
      }
      return cumulativePaid;
    });

    // Simpler approach: use end of each year
    const yearEndData = [];
    let runningTotal = 0;
    const yearDataMap = {};
    
    amort.forEach(row => {
      if (!yearDataMap[row.year]) {
        yearDataMap[row.year] = {
          remainingCapital: 0,
          totalPaid: 0,
          year: row.year
        };
      }
      yearDataMap[row.year] = {
        remainingCapital: row.remainingCapital,
        totalPaid: runningTotal + row.payment + row.insurance,
        year: row.year
      };
      runningTotal += row.payment + row.insurance;
    });

    const years = Object.keys(yearDataMap).map(Number).sort((a, b) => a - b);
    const finalLabels = years.map(y => `Année ${y}`);
    const finalRemaining = years.map(y => yearDataMap[y].remainingCapital);
    const finalTotalPaid = years.map(y => yearDataMap[y].totalPaid);

    instances.line = new Chart(canvas, {
      type: 'line',
      data: {
        labels: finalLabels,
        datasets: [
          {
            label: 'Capital restant dû',
            data: finalRemaining,
            borderColor: colors.primary,
            backgroundColor: colors.primaryLight,
            borderWidth: 2,
            fill: false,
            tension: 0.1,
            pointRadius: 3,
            pointHoverRadius: 5
          },
          {
            label: 'Total payé',
            data: finalTotalPaid,
            borderColor: colors.success,
            backgroundColor: colors.successLight,
            borderWidth: 2,
            fill: false,
            tension: 0.1,
            pointRadius: 3,
            pointHoverRadius: 5,
            borderDash: [5, 5]
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        interaction: {
          mode: 'index',
          intersect: false
        },
        scales: {
          x: {
            grid: {
              display: false
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => formatCurrency(value)
            },
            title: {
              display: true,
              text: 'Montant (€)'
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              padding: 15,
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const value = context.parsed.y;
                return `${label}: ${formatCurrency(value)}`;
              }
            }
          }
        }
      }
    });
  };

  /**
   * Update all charts with new data
   * 
   * @param {Object} data - Complete dataset with principal, interest, insurance, amortization
   */
  const updateAll = (data) => {
    if (!data) {
      console.warn('No data provided to updateAll()');
      return;
    }

    // Render each chart type
    renderDonut({
      principal: data.principal || 0,
      interest: data.interest || 0,
      insurance: data.insurance || 0
    });

    renderStackedArea({
      amortization: data.amortization || []
    });

    renderLineChart({
      amortization: data.amortization || []
    });
  };

  // Public API
  return {
    instances,
    renderDonut,
    renderStackedArea,
    renderLineChart,
    destroyAll,
    updateAll
  };
})();
