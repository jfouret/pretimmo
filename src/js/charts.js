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
    warningArea: 'rgba(234, 88, 12, 0.6)',
    // Gigogne colors
    secondary: '#0ea5e9',    // Light Blue - Principal P2
    secondaryLight: 'rgba(14, 165, 233, 0.8)',
    secondaryArea: 'rgba(14, 165, 233, 0.6)',
    success2: '#86efac',     // Light Green - Interest P2
    success2Area: 'rgba(134, 239, 172, 0.6)',
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
    
    let labels, datasetData, backgroundColors;

    if (data.gigogne) {
      // Gigogne breakdown
      // We need P1/P2 split for principal and interest.
      // The data object passed to renderDonut needs to contain these if we want to show them.
      // Currently updateAll passes { principal, interest, insurance, gigogne }.
      // We need to calculate P1/P2 split from amortization table or pass it explicitly.
      // Let's assume updateAll passes the full amortization table so we can sum it up.
      
      const amort = data.amortization || [];
      let p1 = 0, p2 = 0, i1 = 0, i2 = 0;
      amort.forEach(row => {
        p1 += row.principalP1 || 0;
        p2 += row.principalP2 || 0;
        i1 += row.interestP1 || 0;
        i2 += row.interestP2 || 0;
      });
      
      labels = [
        'Principal P1',
        'Principal P2',
        'Intérêts P1',
        'Intérêts P2',
        'Assurance'
      ];
      datasetData = [p1, p2, i1, i2, data.insurance];
      backgroundColors = [
        colors.primary,
        colors.secondary,
        colors.success,
        colors.success2,
        colors.warning
      ];
    } else {
      labels = [
        'Principal (capital remboursé)',
        'Intérêts',
        'Assurance'
      ];
      datasetData = [data.principal, data.interest, data.insurance];
      backgroundColors = [
        colors.primary,
        colors.success,
        colors.warning
      ];
    }

    instances.donut = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: datasetData,
          backgroundColor: backgroundColors,
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
    const isGigogne = data.gigogne;
    
    // Group by year for better visualization (monthly data would be too dense)
    const yearlyData = {};
    amort.forEach(row => {
      const year = row.year;
      if (!yearlyData[year]) {
        yearlyData[year] = {
          principalPart: 0,
          interestPart: 0,
          insurance: 0,
          // Gigogne
          principalP1: 0,
          principalP2: 0,
          interestP1: 0,
          interestP2: 0,
          count: 0
        };
      }
      yearlyData[year].principalPart += row.principalPart || (row.principalP1 + row.principalP2);
      yearlyData[year].interestPart += row.interestPart || (row.interestP1 + row.interestP2);
      yearlyData[year].insurance += row.insurance;
      
      if (isGigogne) {
        yearlyData[year].principalP1 += row.principalP1 || 0;
        yearlyData[year].principalP2 += row.principalP2 || 0;
        yearlyData[year].interestP1 += row.interestP1 || 0;
        yearlyData[year].interestP2 += row.interestP2 || 0;
      }
      
      yearlyData[year].count++;
    });

    // Convert to arrays
    const years = Object.keys(yearlyData).map(Number).sort((a, b) => a - b);
    const insuranceData = years.map(year => yearlyData[year].insurance);
    
    let datasets;
    if (isGigogne) {
      const p1Data = years.map(year => yearlyData[year].principalP1);
      const p2Data = years.map(year => yearlyData[year].principalP2);
      const i1Data = years.map(year => yearlyData[year].interestP1);
      const i2Data = years.map(year => yearlyData[year].interestP2);
      
      datasets = [
        {
          label: 'Assurance',
          data: insuranceData,
          backgroundColor: colors.warningArea,
          borderColor: colors.warning,
          borderWidth: 1
        },
        {
          label: 'Intérêts P2',
          data: i2Data,
          backgroundColor: colors.success2Area,
          borderColor: colors.success2,
          borderWidth: 1
        },
        {
          label: 'Intérêts P1',
          data: i1Data,
          backgroundColor: colors.successArea,
          borderColor: colors.success,
          borderWidth: 1
        },
        {
          label: 'Principal P2',
          data: p2Data,
          backgroundColor: colors.secondaryArea,
          borderColor: colors.secondary,
          borderWidth: 1
        },
        {
          label: 'Principal P1',
          data: p1Data,
          backgroundColor: colors.primaryArea,
          borderColor: colors.primary,
          borderWidth: 1
        }
      ];
    } else {
      const principalData = years.map(year => yearlyData[year].principalPart);
      const interestData = years.map(year => yearlyData[year].interestPart);
      
      datasets = [
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
      ];
    }

    instances.area = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: years.map(y => `Année ${y}`),
        datasets: datasets
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
    const isGigogne = data.gigogne;
    
    // Simpler approach: use end of each year
    const yearDataMap = {};
    let runningTotal = 0;
    
    amort.forEach(row => {
      if (!yearDataMap[row.year]) {
        yearDataMap[row.year] = {
          remainingCapital: 0,
          remainingCapitalP1: 0,
          remainingCapitalP2: 0,
          totalPaid: 0,
          year: row.year
        };
      }
      yearDataMap[row.year] = {
        remainingCapital: row.remainingCapital || (row.remainingCapitalP1 + row.remainingCapitalP2),
        remainingCapitalP1: row.remainingCapitalP1 || 0,
        remainingCapitalP2: row.remainingCapitalP2 || 0,
        totalPaid: runningTotal + row.payment + row.insurance,
        year: row.year
      };
      runningTotal += row.payment + row.insurance;
    });

    const years = Object.keys(yearDataMap).map(Number).sort((a, b) => a - b);
    const finalLabels = years.map(y => `Année ${y}`);
    const finalTotalPaid = years.map(y => yearDataMap[y].totalPaid);
    
    let datasets;
    if (isGigogne) {
      const finalRemainingP1 = years.map(y => yearDataMap[y].remainingCapitalP1);
      const finalRemainingP2 = years.map(y => yearDataMap[y].remainingCapitalP2);
      
      datasets = [
        {
          label: 'Capital restant P1',
          data: finalRemainingP1,
          borderColor: colors.primary,
          backgroundColor: colors.primaryLight,
          borderWidth: 2,
          fill: false,
          tension: 0.1,
          pointRadius: 3
        },
        {
          label: 'Capital restant P2',
          data: finalRemainingP2,
          borderColor: colors.secondary,
          backgroundColor: colors.secondaryLight,
          borderWidth: 2,
          fill: false,
          tension: 0.1,
          pointRadius: 3,
          borderDash: [5, 5]
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
          borderDash: [2, 2]
        }
      ];
    } else {
      const finalRemaining = years.map(y => yearDataMap[y].remainingCapital);
      datasets = [
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
      ];
    }

    instances.line = new Chart(canvas, {
      type: 'line',
      data: {
        labels: finalLabels,
        datasets: datasets
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
      insurance: data.insurance || 0,
      gigogne: data.gigogne,
      amortization: data.amortization // Pass full amortization for gigogne split
    });

    renderStackedArea({
      amortization: data.amortization || [],
      gigogne: data.gigogne
    });

    renderLineChart({
      amortization: data.amortization || [],
      gigogne: data.gigogne
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
