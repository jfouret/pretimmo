/**
 * UI Module - DOM Manipulation Helpers
 * Handles all UI rendering and DOM updates for the Mortgage Dynamic Simulator
 */

// Use global Config object (set by config.js)
var { UIOptions } = window.Config || {};

const UI = (() => {
  
  // ============================================
  // FORMATTING HELPERS
  // ============================================

  /**
   * Format amount as currency (€)
   * @param {number} amount - Amount to format
   * @returns {string} Formatted currency string
   */
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '—';
    }
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  /**
   * Format value as percentage
   * @param {number} value - Value to format (0-100)
   * @returns {string} Formatted percentage string
   */
  const formatPercent = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
      return '—';
    }
    return new Intl.NumberFormat('fr-FR', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value / 100);
  };

  /**
   * Format number with thousand separators
   * @param {number} value - Value to format
   * @returns {string} Formatted number string
   */
  const formatNumber = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
      return '—';
    }
    return new Intl.NumberFormat('fr-FR').format(value);
  };

  // ============================================
  // DYNAMIC ROW MANAGEMENT
  // ============================================

  /**
   * Create HTML for a revenue/charge row
   * @param {Object} data - Row data {id, type, amount, frequency}
   * @param {string} rowType - 'revenue' or 'charge'
   * @returns {HTMLElement} Row element
   */
  const createRow = (data, rowType) => {
    const row = document.createElement('div');
    row.className = 'row g-2 mb-2 align-items-center';
    row.dataset.id = data.id;
    row.dataset.rowType = rowType;

    // Dropdown for type
    const colType = document.createElement('div');
    colType.className = 'col-md-4';
    
    const select = document.createElement('select');
    select.className = 'form-select form-select-sm';
    select.dataset.field = 'type';
    
    const types = rowType === 'revenue' 
      ? UIOptions.revenueTypes
      : UIOptions.chargeTypes;
    
    types.forEach(type => {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = type;
      option.selected = (type === data.type);
      select.appendChild(option);
    });
    
    colType.appendChild(select);
    row.appendChild(colType);

    // Amount input
    const colAmount = document.createElement('div');
    colAmount.className = 'col-md-4';
    
    const inputAmount = document.createElement('input');
    inputAmount.type = 'number';
    inputAmount.className = 'form-control form-control-sm';
    inputAmount.placeholder = 'Montant';
    inputAmount.min = '0';
    inputAmount.step = '100';
    inputAmount.value = data.amount || '';
    inputAmount.dataset.field = 'amount';
    
    colAmount.appendChild(inputAmount);
    row.appendChild(colAmount);

    // Frequency toggle
    const colFreq = document.createElement('div');
    colFreq.className = 'col-md-3';
    
    const btnGroup = document.createElement('div');
    btnGroup.className = 'btn-group btn-group-sm w-100';
    btnGroup.setAttribute('role', 'group');
    
    const inputMonthly = document.createElement('input');
    inputMonthly.type = 'radio';
    inputMonthly.className = 'btn-check';
    inputMonthly.name = `freq-${rowType}-${data.id}`;
    inputMonthly.id = `freq-m-${rowType}-${data.id}`;
    inputMonthly.value = 'monthly';
    inputMonthly.checked = (data.frequency === 'monthly');
    inputMonthly.dataset.field = 'frequency';
    
    const labelMonthly = document.createElement('label');
    labelMonthly.className = 'btn btn-outline-secondary';
    labelMonthly.setAttribute('for', `freq-m-${rowType}-${data.id}`);
    labelMonthly.textContent = 'Mois';
    
    const inputYearly = document.createElement('input');
    inputYearly.type = 'radio';
    inputYearly.className = 'btn-check';
    inputYearly.name = `freq-${rowType}-${data.id}`;
    inputYearly.id = `freq-y-${rowType}-${data.id}`;
    inputYearly.value = 'yearly';
    inputYearly.checked = (data.frequency === 'yearly');
    inputYearly.dataset.field = 'frequency';
    
    const labelYearly = document.createElement('label');
    labelYearly.className = 'btn btn-outline-secondary';
    labelYearly.setAttribute('for', `freq-y-${rowType}-${data.id}`);
    labelYearly.textContent = 'Année';
    
    btnGroup.appendChild(inputMonthly);
    btnGroup.appendChild(labelMonthly);
    btnGroup.appendChild(inputYearly);
    btnGroup.appendChild(labelYearly);
    
    colFreq.appendChild(btnGroup);
    row.appendChild(colFreq);

    // Remove button
    const colBtn = document.createElement('div');
    colBtn.className = 'col-md-1';
    
    const btnRemove = document.createElement('button');
    btnRemove.type = 'button';
    btnRemove.className = 'btn btn-sm btn-danger w-100';
    btnRemove.dataset.action = 'remove';
    btnRemove.innerHTML = '&times;';
    btnRemove.setAttribute('aria-label', 'Supprimer');
    
    colBtn.appendChild(btnRemove);
    row.appendChild(colBtn);

    return row;
  };

  /**
   * Add a revenue row to the DOM
   * @param {Object} data - Revenue data {id, type, amount, frequency}
   */
  const addRevenueRow = (data) => {
    const container = document.getElementById('revenue-rows');
    if (!container) return;
    
    const row = createRow(data, 'revenue');
    container.appendChild(row);
  };

  /**
   * Remove a revenue row from the DOM
   * @param {number} id - Revenue ID to remove
   */
  const removeRevenueRow = (id) => {
    const container = document.getElementById('revenue-rows');
    if (!container) return;
    
    const row = container.querySelector(`[data-id="${id}"][data-row-type="revenue"]`);
    if (row) {
      row.remove();
    }
  };

  /**
   * Add a charge row to the DOM
   * @param {Object} data - Charge data {id, type, amount, frequency}
   */
  const addChargeRow = (data) => {
    const container = document.getElementById('charge-rows');
    if (!container) return;
    
    const row = createRow(data, 'charge');
    container.appendChild(row);
  };

  /**
   * Remove a charge row from the DOM
   * @param {number} id - Charge ID to remove
   */
  const removeChargeRow = (id) => {
    const container = document.getElementById('charge-rows');
    if (!container) return;
    
    const row = container.querySelector(`[data-id="${id}"][data-row-type="charge"]`);
    if (row) {
      row.remove();
    }
  };

  /**
   * Clear and re-render all dynamic rows from state
   * Requires MortgageSimulator global to be available
   */
  const renderDynamicRows = () => {
    if (typeof MortgageSimulator === 'undefined') return;
    
    // Clear and re-render revenues
    const revenueContainer = document.getElementById('revenue-rows');
    if (revenueContainer) {
      revenueContainer.innerHTML = '';
      const revenues = MortgageSimulator.getRevenues();
      revenues.forEach(revenue => addRevenueRow(revenue));
    }
    
    // Clear and re-render charges
    const chargeContainer = document.getElementById('charge-rows');
    if (chargeContainer) {
      chargeContainer.innerHTML = '';
      const charges = MortgageSimulator.getCharges();
      charges.forEach(charge => addChargeRow(charge));
    }
  };

  // ============================================
  // SUMMARY DASHBOARD
  // ============================================

  /**
   * Get color class based on debt ratio thresholds
   * @param {number} ratio - Debt ratio percentage
   * @returns {string} Bootstrap color class
   */
  const getDebtRatioColor = (ratio) => {
    if (ratio <= 33) return 'bg-success';
    if (ratio <= 35) return 'bg-warning';
    return 'bg-danger';
  };

  /**
   * Update summary dashboard with computed values
   * @param {Object} data - Summary data object
   */
  const renderSummary = (data) => {
    // Maximum budget
    const maxBudgetEl = document.getElementById('summary-max-budget');
    if (maxBudgetEl) {
      maxBudgetEl.textContent = formatCurrency(data.maxBudget || data.maxPropertyPrice);
    }

    // Property price
    const propertyPriceEl = document.getElementById('summary-property-price');
    if (propertyPriceEl) {
      propertyPriceEl.textContent = formatCurrency(data.propertyPrice);
    }

    // Loan amount
    const loanAmountEl = document.getElementById('summary-loan-amount');
    if (loanAmountEl) {
      loanAmountEl.textContent = formatCurrency(data.loanAmount || data.requiredLoan);
    }

    // Monthly payment (without insurance)
    const monthlyPaymentEl = document.getElementById('summary-monthly-payment');
    if (monthlyPaymentEl) {
      monthlyPaymentEl.textContent = formatCurrency(data.monthlyPayment);
    }

    // Monthly payment (with insurance)
    const monthlyWithInsuranceEl = document.getElementById('summary-monthly-with-insurance');
    if (monthlyWithInsuranceEl) {
      monthlyWithInsuranceEl.textContent = formatCurrency(data.monthlyPaymentWithInsurance);
    }

    // Total cost
    const totalCostEl = document.getElementById('summary-total-cost');
    if (totalCostEl) {
      totalCostEl.textContent = formatCurrency(data.totalCost);
    }

    // Notary fees
    const notaryFeesEl = document.getElementById('summary-notary-fees');
    if (notaryFeesEl) {
      notaryFeesEl.textContent = formatCurrency(data.notaryFees || 0);
    }

    // Caution fees
    const cautionFeesEl = document.getElementById('summary-caution-fees');
    if (cautionFeesEl) {
      cautionFeesEl.textContent = formatCurrency(data.cautionFees || 0);
    }

    // Debt ratio
    const debtRatioBar = document.getElementById('debt-ratio-bar');
    const debtRatioText = document.getElementById('debt-ratio-text');
    if (debtRatioBar && debtRatioText) {
      const ratio = data.debtRatio || 0;
      const displayRatio = Math.min(ratio, 100); // Cap at 100% for display
      
      debtRatioBar.style.width = `${displayRatio}%`;
      debtRatioBar.setAttribute('aria-valuenow', displayRatio);
      debtRatioText.textContent = formatPercent(ratio);
      
      // Update color based on threshold
      debtRatioBar.className = `progress-bar ${getDebtRatioColor(ratio)}`;
    }

    // Formula calculation display
    const formulaValueEl = document.getElementById('formula-value');
    if (formulaValueEl) {
      const propertyPrice = data.propertyPrice || 0;
      const notaryFees = data.notaryFees || 0;
      const fraisDossier = data.fraisDossier || 0;
      const cautionFees = data.cautionFees || 0;
      const capital = data.capital || 0;
      const calculatedLoan = propertyPrice + notaryFees + fraisDossier + cautionFees - capital;
      
      formulaValueEl.innerHTML = `${formatCurrency(propertyPrice)} + ${formatCurrency(notaryFees)} + ${formatCurrency(fraisDossier)} + ${formatCurrency(cautionFees)} - ${formatCurrency(capital)} = <strong>${formatCurrency(calculatedLoan)}</strong>`;
    }
  };

  // ============================================
  // TAB NAVIGATION
  // ============================================

  /**
   * Show a specific tab and hide others
   * @param {string} tabId - ID of the tab to show (without 'content-' prefix)
   */
  const showTab = (tabId) => {
    // Get all tab panes
    const tabPanes = document.querySelectorAll('.tab-pane');
    tabPanes.forEach(pane => {
      pane.classList.remove('show', 'active');
    });

    // Show selected tab
    const selectedPane = document.getElementById(`content-${tabId}`);
    if (selectedPane) {
      selectedPane.classList.add('show', 'active');
    }

    // Update nav button states
    const navButtons = document.querySelectorAll('[data-bs-toggle="tab"]');
    navButtons.forEach(btn => {
      btn.classList.remove('active');
      if (btn.id === `tab-${tabId}`) {
        btn.classList.add('active');
      }
    });

    // If switching to donut (Repartition) tab, render donut chart
    if (tabId === 'donut') {
      // Use setTimeout to ensure canvas is visible before rendering
      setTimeout(() => {
        renderDonutChart();
      }, 50);
    }
  };

  /**
   * Render the donut chart with current state data
   * Called when switching to the Repartition tab
   */
  const renderDonutChart = () => {
    if (typeof MortgageSimulator === 'undefined' || !MortgageSimulator.Charts) {
      return;
    }

    const Charts = MortgageSimulator.Charts;
    const state = MortgageSimulator.getState();
    const computed = MortgageSimulator.getComputed();

    if (!computed || !computed.totalCost) {
      return;
    }

    // Calculate chart data from current state
    const monthlyInsurance = computed.monthlyInsurance || 0;
    const totalInsurance = monthlyInsurance * (state ? state.duration : 240) * 12;
    const totalInterest = computed.totalCost - (computed.requiredLoan || 0) - totalInsurance;

    Charts.renderDonut({
      principal: computed.requiredLoan || 0,
      interest: totalInterest,
      insurance: totalInsurance
    });
  };

  /**
   * Switch between monthly and yearly view for amortization table
   * @param {string} view - 'monthly' or 'yearly'
   */
  const switchTableView = (view) => {
    const toggleBtn = document.getElementById('toggle-view-btn');
    if (toggleBtn) {
      if (view === 'monthly') {
        toggleBtn.innerHTML = '📅 Vue par année';
      } else {
        toggleBtn.innerHTML = '📅 Vue par mois';
      }
    }
  };

  // ============================================
  // SLIDER/INPUT SYNC
  // ============================================

  /**
   * Update slider position when input changes
   * @param {string} sliderId - Slider element ID
   * @param {number} value - New value
   */
  const syncSlider = (sliderId, value) => {
    const slider = document.getElementById(sliderId);
    if (slider) {
      slider.value = value;
    }
  };

  /**
   * Update input value when slider changes
   * @param {string} inputId - Input element ID
   * @param {number} value - New value
   */
  const syncInput = (inputId, value) => {
    const input = document.getElementById(inputId);
    if (input) {
      input.value = value;
    }
  };

  // ============================================
  // AMORTIZATION TABLE
  // ============================================

  /**
   * Aggregate monthly data into yearly view
   * @param {Array} data - Monthly amortization data
   * @returns {Array} Yearly aggregated data
   */
  const aggregateYearly = (data) => {
    const yearly = [];
    let currentYear = null;
    let yearData = null;

    data.forEach((row, index) => {
      const year = Math.ceil((index + 1) / 12);
      
      if (year !== currentYear) {
        if (yearData) {
          yearly.push(yearData);
        }
        currentYear = year;
        yearData = {
          month: index + 1,
          year: year,
          payment: 0,
          principalPart: 0,
          interestPart: 0,
          insurance: 0,
          totalPaid: row.totalPaid || 0,
          remainingCapital: row.remainingCapital || 0,
        };
      }
      
      yearData.payment += (row.payment || 0);
      yearData.principalPart += (row.principalPart || 0);
      yearData.interestPart += (row.interestPart || 0);
      yearData.insurance += (row.insurance || 0);
      yearData.totalPaid = row.totalPaid || 0;
      yearData.remainingCapital = row.remainingCapital || 0;
    });
    
    if (yearData) {
      yearly.push(yearData);
    }
    
    return yearly;
  };

  /**
   * Render amortization table
   * @param {Array} data - Amortization table data
   * @param {string} view - 'monthly' or 'yearly'
   */
  const renderTable = (data, view = 'monthly') => {
    const tbody = document.getElementById('amortization-table-body');
    if (!tbody) return;

    // Clear existing rows
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
      const emptyRow = document.createElement('tr');
      const emptyCell = document.createElement('td');
      emptyCell.colSpan = 8;
      emptyCell.className = 'text-center text-muted py-5';
      emptyCell.textContent = 'Remplissez les informations pour générer le tableau';
      emptyRow.appendChild(emptyCell);
      tbody.appendChild(emptyRow);
      return;
    }

    // Process data based on view
    const processedData = view === 'yearly' ? aggregateYearly(data) : data;

    // Render rows (with pagination for large datasets)
    const maxRows = view === 'yearly' ? processedData.length : Math.min(processedData.length, 300);
    
    for (let i = 0; i < maxRows; i++) {
      const row = processedData[i];
      const tr = document.createElement('tr');

      // Month
      const tdMonth = document.createElement('td');
      tdMonth.textContent = view === 'yearly' ? `Année ${row.year}` : row.month || (i + 1);
      tr.appendChild(tdMonth);

      // Year
      const tdYear = document.createElement('td');
      tdYear.textContent = row.year || Math.ceil((i + 1) / 12);
      tr.appendChild(tdYear);

      // Payment
      const tdPayment = document.createElement('td');
      tdPayment.textContent = formatCurrency(row.payment);
      tr.appendChild(tdPayment);

      // Principal
      const tdPrincipal = document.createElement('td');
      tdPrincipal.textContent = formatCurrency(row.principalPart);
      tr.appendChild(tdPrincipal);

      // Interest
      const tdInterest = document.createElement('td');
      tdInterest.textContent = formatCurrency(row.interestPart);
      tr.appendChild(tdInterest);

      // Insurance
      const tdInsurance = document.createElement('td');
      tdInsurance.textContent = formatCurrency(row.insurance);
      tr.appendChild(tdInsurance);

      // Total paid
      const tdTotalPaid = document.createElement('td');
      tdTotalPaid.textContent = formatCurrency(row.totalPaid);
      tr.appendChild(tdTotalPaid);

      // Remaining capital
      const tdRemaining = document.createElement('td');
      tdRemaining.textContent = formatCurrency(row.remainingCapital);
      tr.appendChild(tdRemaining);

      tbody.appendChild(tr);
    }

    // Add pagination info if data was truncated
    if (view === 'monthly' && processedData.length > maxRows) {
      const infoRow = document.createElement('tr');
      const infoCell = document.createElement('td');
      infoCell.colSpan = 8;
      infoCell.className = 'text-center text-muted py-3 fst-italic';
      infoCell.textContent = `Affichage des ${maxRows} premiers mois sur ${processedData.length}. Utilisez la vue annuelle ou exportez en CSV pour voir l'intégralité.`;
      infoRow.appendChild(infoCell);
      tbody.appendChild(infoRow);
    }
  };

  /**
   * Export amortization table as CSV
   * @param {Array} data - Amortization table data
   */
  const exportCSV = (data) => {
    if (!data || data.length === 0) {
      alert('Aucune donnée à exporter');
      return;
    }

    // CSV header
    const header = 'Mois,Année,Mensualité,Capital,Intérêts,Assurance,Total Payé,Capital Restant\n';
    
    // CSV rows
    const rows = data.map((row, index) => {
      const month = row.month || (index + 1);
      const year = row.year || Math.ceil((index + 1) / 12);
      return [
        month,
        year,
        row.payment || 0,
        row.principalPart || 0,
        row.interestPart || 0,
        row.insurance || 0,
        row.totalPaid || 0,
        row.remainingCapital || 0,
      ].join(',');
    }).join('\n');

    const csv = header + rows;

    // Create download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `amortissement_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ============================================
  // VALIDATION FEEDBACK
  // ============================================

  /**
   * Show validation state on an input element
   * @param {string} elementId - Element ID
   * @param {boolean} isValid - Validation state
   * @param {string} message - Error/success message
   */
  const showValidation = (elementId, isValid, message = '') => {
    const element = document.getElementById(elementId);
    if (!element) return;

    // Remove existing validation classes
    element.classList.remove('is-valid', 'is-invalid');

    // Add appropriate class
    if (isValid) {
      element.classList.add('is-valid');
    } else {
      element.classList.add('is-invalid');
    }

    // Handle feedback message
    const parent = element.parentElement;
    if (!parent) return;

    // Remove existing feedback
    const existingFeedback = parent.querySelector('.invalid-feedback, .valid-feedback');
    if (existingFeedback) {
      existingFeedback.remove();
    }

    // Add new feedback if message provided
    if (message) {
      const feedback = document.createElement('div');
      feedback.className = isValid ? 'valid-feedback' : 'invalid-feedback';
      feedback.textContent = message;
      parent.appendChild(feedback);
    }
  };

  /**
   * Enable an element
   * @param {string} elementId - Element ID
   */
  const enableElement = (elementId) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.disabled = false;
      element.classList.remove('disabled');
    }
  };

  /**
   * Disable an element
   * @param {string} elementId - Element ID
   */
  const disableElement = (elementId) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.disabled = true;
      element.classList.add('disabled');
    }
  };

  // ============================================
  // PUBLIC API
  // ============================================

  return {
    // Formatting
    formatCurrency,
    formatPercent,
    formatNumber,
    
    // Dynamic rows
    addRevenueRow,
    removeRevenueRow,
    addChargeRow,
    removeChargeRow,
    renderDynamicRows,
    
    // Summary
    renderSummary,
    
    // Tabs
    showTab,
    switchTableView,
    renderDonutChart,
    
    // Slider/Input sync
    syncSlider,
    syncInput,
    
    // Table
    renderTable,
    exportCSV,
    
    // Validation
    showValidation,
    enableElement,
    disableElement,
  };
})();

// Export for ES6 modules (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UI;
}
