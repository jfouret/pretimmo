/**
 * Events Module - Event Bindings and Handlers
 * Handles all user interactions for the Mortgage Dynamic Simulator
 * Coordinates State updates, formula calculations, and UI rendering
 */

// Use global Config object (set by config.js)
var { ItemDefaults } = window.Config || {};

const Events = (() => {
  
  // ============================================
  // UTILITY: DEBOUNCE
  // ============================================

  /**
   * Debounce function to limit rate of function calls
   * @param {Function} fn - Function to debounce
   * @param {number} delay - Delay in milliseconds
   * @returns {Function} Debounced function
   */
  const debounce = (fn, delay) => {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
  };

  // ============================================
  // RECALCULATION ENGINE
  // ============================================

  /**
   * Main recalculation function
   * Reads State → runs formulas → updates State → updates UI & Charts
   */
  const recalculate = () => {
    // Get current state
    const state = MortgageSimulator.getState();
    
    // 1. Calculate income and capacity
    const monthlyIncome = MortgageSimulator.Formulas.calcTotalMonthlyIncome(state.revenues);
    const monthlyCharges = MortgageSimulator.Formulas.calcTotalMonthlyCharges(state.charges);
    const maxMonthlyPayment = MortgageSimulator.Formulas.calcMaxMonthlyPayment(monthlyIncome, monthlyCharges);
    
    // 2. Get interpolated interest rate for current duration
    let currentRate = MortgageSimulator.Formulas.interpolateRate(state.duration, state.rates);
    
    // Handle override
    const override = MortgageSimulator.getPrimaryRateOverride();
    if (override !== null) {
      currentRate = override;
    }
    
    // Update UI for primary rate (if UI module has this method)
    if (UI.updatePrimaryRateDisplay) {
      UI.updatePrimaryRateDisplay(currentRate);
    }
    
    // 3. Calculate maximum loan capacity (without insurance consideration)
    // If gigogne is enabled, this might change? 
    // For now, keep standard max loan calculation as baseline
    const maxLoan = MortgageSimulator.Formulas.calcMaxLoan(
      maxMonthlyPayment,
      currentRate,
      state.duration
    );
    MortgageSimulator.setMaxLoan(maxLoan);
    
    // 4. Calculate maximum property price WITH INSURANCE OPTIMIZATION
    // This uses the new optimization function that accounts for insurance in the circular dependency
    const ages = state.ages;
    const age = ages.person1 || 0;
    const gigogne = MortgageSimulator.getGigogne();
    
    let optimizedMaxPriceResult;

    if (gigogne.enabled) {
      optimizedMaxPriceResult = MortgageSimulator.Formulas.optimizeMaxPropertyPriceWithGigogne(
        state.capital,
        maxMonthlyPayment,
        state.fraisDossier,
        state.propertyType,
        currentRate,
        state.duration,
        gigogne.rate,
        gigogne.duration,
        gigogne.maxAmount,
        age
      );
    } else {
      optimizedMaxPriceResult = MortgageSimulator.Formulas.optimizeMaxPropertyPriceWithInsurance(
        state.capital,
        maxMonthlyPayment,
        state.fraisDossier,
        state.propertyType,
        currentRate,
        state.duration,
        age
      );
    }
    
    // Use the optimized max property price
    MortgageSimulator.setMaxPropertyPrice(optimizedMaxPriceResult.price);
    
    // Update property price slider max to optimized max + 10%
    const sliderMaxPrice = Math.round(optimizedMaxPriceResult.price * 1.10);
    const propertyPriceSlider = document.getElementById('property-price-slider');
    if (propertyPriceSlider) {
      propertyPriceSlider.max = sliderMaxPrice;
      
      // If current property price exceeds new max, adjust it
      if (state.propertyPrice > sliderMaxPrice) {
        MortgageSimulator.setPropertyPrice(sliderMaxPrice);
        propertyPriceSlider.value = sliderMaxPrice;
        
        const display = document.getElementById('property-price-display');
        if (display) {
          display.textContent = UI.formatNumber(sliderMaxPrice);
        }
        
        UI.syncInput('property-price-input', sliderMaxPrice);
      }
    }
    
    // Update property price input max as well
    const propertyPriceInput = document.getElementById('property-price-input');
    if (propertyPriceInput) {
      propertyPriceInput.max = sliderMaxPrice;
    }
    
    // 5. Calculate required loan for selected property price
    const requiredLoanResult = MortgageSimulator.Formulas.calcRequiredLoan(
      state.propertyPrice,
      state.capital,
      state.fraisDossier,
      state.propertyType
    );
    MortgageSimulator.setRequiredLoan(requiredLoanResult.loan);
    
    // Store notary fees and caution fees
    MortgageSimulator.setNotaryFees(requiredLoanResult.notaryFees || 0);
    MortgageSimulator.setCautionFees(requiredLoanResult.caution || 0);
    
    // GIGOGNE LOGIC START
    let monthlyPayment, monthlyInsurance, monthlyPaymentWithInsurance, totalCost, taeg, amortizationTable;
    let insuranceRate = 0;
    if (state.ages.person1) {
      insuranceRate = MortgageSimulator.Formulas.getInsuranceRate(state.ages.person1);
    }

    if (gigogne.enabled) {
      // Calculate optimal secondary amount
      const optimalSecondary = MortgageSimulator.Formulas.calcOptimalSecondaryAmount(
        requiredLoanResult.loan,
        currentRate,
        state.duration,
        gigogne.rate,
        gigogne.duration,
        gigogne.maxAmount
      );
      
      MortgageSimulator.setGigogneOptimalAmount(optimalSecondary);
      
      // Get actual amount (limited by maxAmount, handled in setter)
      const actualGigogne = MortgageSimulator.getGigogne().actualAmount;
      const primaryAmount = requiredLoanResult.loan - actualGigogne;
      
      // Calculate smooth mensuality
      monthlyPayment = MortgageSimulator.Formulas.calcSmoothMensuality(
        primaryAmount,
        currentRate,
        state.duration,
        actualGigogne,
        gigogne.rate,
        gigogne.duration
      );
      
      MortgageSimulator.setMonthlyPayment(monthlyPayment);
      
      // Calculate insurance (on total initial capital)
      monthlyInsurance = MortgageSimulator.Formulas.calcMonthlyInsurance(
        requiredLoanResult.loan,
        insuranceRate
      );
      MortgageSimulator.setMonthlyInsurance(monthlyInsurance);
      
      monthlyPaymentWithInsurance = monthlyPayment + monthlyInsurance;
      MortgageSimulator.setMonthlyPaymentWithInsurance(monthlyPaymentWithInsurance);
      
      // Generate gigogne amortization table
      amortizationTable = MortgageSimulator.Formulas.generateGigogneAmortizationTable({
        p1: primaryAmount,
        r1: currentRate,
        n1: state.duration,
        p2: actualGigogne,
        r2: gigogne.rate,
        n2: gigogne.duration,
        insuranceRate: insuranceRate
      });
      MortgageSimulator.setAmortizationTable(amortizationTable);
      
      // Calculate total cost
      totalCost = amortizationTable[amortizationTable.length - 1].totalPaid;
      MortgageSimulator.setTotalCost(totalCost);
      
      // Calculate TAEG
      taeg = MortgageSimulator.Formulas.calcTAEG(
        requiredLoanResult.loan,
        monthlyPaymentWithInsurance,
        state.duration,
        currentRate,
        insuranceRate
      );
      MortgageSimulator.setTaeg(taeg);
      
      // Update UI for gigogne specific fields
      if (UI.updateGigogneInfo) {
        UI.updateGigogneInfo(optimalSecondary, actualGigogne);
      }

    } else {
      // STANDARD LOGIC
      
      // 6. Calculate monthly payment for required loan
      monthlyPayment = MortgageSimulator.Formulas.calcMonthlyPayment(
        requiredLoanResult.loan,
        currentRate,
        state.duration
      );
      MortgageSimulator.setMonthlyPayment(monthlyPayment);
      
      // 7. Calculate insurance
      monthlyInsurance = MortgageSimulator.Formulas.calcMonthlyInsurance(
        requiredLoanResult.loan,
        insuranceRate
      );
      MortgageSimulator.setMonthlyInsurance(monthlyInsurance);
      monthlyPaymentWithInsurance = monthlyPayment + monthlyInsurance;
      MortgageSimulator.setMonthlyPaymentWithInsurance(monthlyPaymentWithInsurance);
      
      // 8. Calculate total cost and TAEG
      totalCost = (monthlyPayment + monthlyInsurance) * state.duration * 12;
      MortgageSimulator.setTotalCost(totalCost);
      
      // Use optimized TAEG calculation with optimization-js
      taeg = MortgageSimulator.Formulas.calcTAEG(
        requiredLoanResult.loan,
        monthlyPaymentWithInsurance, // Total monthly payment including insurance
        state.duration,
        currentRate, // Nominal rate
        insuranceRate // Insurance rate
      );
      MortgageSimulator.setTaeg(taeg);
      
      // 9. Generate amortization table
      amortizationTable = MortgageSimulator.Formulas.generateAmortizationTable(
        requiredLoanResult.loan,
        currentRate,
        state.duration,
        insuranceRate
      );
      MortgageSimulator.setAmortizationTable(amortizationTable);
    }
    // GIGOGNE LOGIC END
    
    // 10. Update UI - Summary
    const debtRatio = monthlyIncome > 0 ? (monthlyPaymentWithInsurance / monthlyIncome) * 100 : 0;
    UI.renderSummary({
      maxBudget: optimizedMaxPriceResult.price,
      maxPropertyPrice: optimizedMaxPriceResult.price,
      propertyPrice: state.propertyPrice,
      loanAmount: requiredLoanResult.loan,
      requiredLoan: requiredLoanResult.loan,
      monthlyPayment: monthlyPayment,
      monthlyPaymentWithInsurance: monthlyPaymentWithInsurance,
      totalCost: totalCost,
      taeg: taeg,
      debtRatio: debtRatio,
      notaryFees: requiredLoanResult.notaryFees || 0,
      cautionFees: requiredLoanResult.caution || 0,
      capital: state.capital,
      fraisDossier: state.fraisDossier,
      // Add gigogne info for summary
      gigogne: gigogne.enabled ? {
        primaryAmount: requiredLoanResult.loan - MortgageSimulator.getGigogne().actualAmount,
        secondaryAmount: MortgageSimulator.getGigogne().actualAmount
      } : null
    });
    
    // 11. Update table view
    const tableView = MortgageSimulator.getTableView();
    UI.renderTable(amortizationTable, tableView);
    
    // 12. Update charts (if Charts module is available)
    if (typeof Charts !== 'undefined' && Charts.updateAll) {
      const totalInterest = totalCost - requiredLoanResult.loan - (monthlyInsurance * state.duration * 12);
      const totalInsurance = monthlyInsurance * state.duration * 12;
      
      const chartData = {
        principal: requiredLoanResult.loan,
        interest: totalInterest,
        insurance: totalInsurance,
        amortization: amortizationTable,
        gigogne: gigogne.enabled // Pass gigogne flag
      };
      Charts.updateAll(chartData);
    }
  };

  // Debounced version for rapid input changes
  const debouncedRecalculate = debounce(recalculate, 150);

  // ============================================
  // EVENT HANDLERS: GIGOGNE
  // ============================================

  const handleGigogneToggle = (e) => {
    const enabled = e.target.checked;
    MortgageSimulator.setGigogneEnabled(enabled);
    if (UI.renderGigogneFields) {
      UI.renderGigogneFields(enabled);
    }
    debouncedRecalculate();
  };

  const handleGigogneMaxAmountChange = (e) => {
    const amount = parseFloat(e.target.value) || 0;
    MortgageSimulator.setGigogneMaxAmount(amount);
    debouncedRecalculate();
  };

  const handleGigogneDurationChange = (e) => {
    const duration = parseInt(e.target.value);
    MortgageSimulator.setGigogneDuration(duration);
    
    const display = document.getElementById('gigogne-duration-value');
    if (display) display.textContent = duration;
    
    debouncedRecalculate();
  };

  const handleGigogneRateChange = (e) => {
    const rate = parseFloat(e.target.value) || 0;
    MortgageSimulator.setGigogneRate(rate);
    debouncedRecalculate();
  };

  const handlePrimaryRateChange = (e) => {
    const val = e.target.value;
    if (val === '') {
      MortgageSimulator.setPrimaryRateOverride(null);
    } else {
      MortgageSimulator.setPrimaryRateOverride(parseFloat(val));
    }
    debouncedRecalculate();
  };

  // ============================================
  // EVENT HANDLERS: REVENUE/CHARGE DYNAMIC ROWS
  // ============================================

  /**
   * Handle add revenue button click
   */
  const handleAddRevenue = () => {
    const newRevenue = MortgageSimulator.addRevenue({
      type: ItemDefaults.revenue.type,
      amount: ItemDefaults.revenue.amount,
      frequency: ItemDefaults.revenue.frequency,
    });
    UI.addRevenueRow(newRevenue);
    debouncedRecalculate();
  };

  /**
   * Handle add charge button click
   */
  const handleAddCharge = () => {
    const newCharge = MortgageSimulator.addCharge({
      type: ItemDefaults.charge.type,
      amount: ItemDefaults.charge.amount,
      frequency: ItemDefaults.charge.frequency,
    });
    UI.addChargeRow(newCharge);
    debouncedRecalculate();
  };

  /**
   * Handle revenue row changes (event delegation)
   * @param {Event} e - Event object
   */
  const handleRevenueRowChange = (e) => {
    const target = e.target;
    const row = target.closest('[data-row-type="revenue"]');
    if (!row) return;

    const id = parseInt(row.dataset.id);
    
    // Handle remove button
    if (target.dataset.action === 'remove') {
      MortgageSimulator.removeRevenue(id);
      UI.removeRevenueRow(id);
      debouncedRecalculate();
      return;
    }
    
    // Handle field changes
    const field = target.dataset.field;
    if (!field) return;
    
    // Get all revenues and update the specific one
    const revenues = MortgageSimulator.getRevenues();
    const revenue = revenues.find(r => r.id === id);
    if (!revenue) return;
    
    if (field === 'type') {
      revenue.type = target.value;
    } else if (field === 'amount') {
      revenue.amount = parseFloat(target.value) || 0;
    } else if (field === 'frequency') {
      revenue.frequency = target.value;
    }
    
    // Update state
    MortgageSimulator.setRevenues(revenues);
    debouncedRecalculate();
  };

  /**
   * Handle charge row changes (event delegation)
   * @param {Event} e - Event object
   */
  const handleChargeRowChange = (e) => {
    const target = e.target;
    const row = target.closest('[data-row-type="charge"]');
    if (!row) return;

    const id = parseInt(row.dataset.id);
    
    // Handle remove button
    if (target.dataset.action === 'remove') {
      MortgageSimulator.removeCharge(id);
      UI.removeChargeRow(id);
      debouncedRecalculate();
      return;
    }
    
    // Handle field changes
    const field = target.dataset.field;
    if (!field) return;
    
    // Get all charges and update the specific one
    const charges = MortgageSimulator.getCharges();
    const charge = charges.find(c => c.id === id);
    if (!charge) return;
    
    if (field === 'type') {
      charge.type = target.value;
    } else if (field === 'amount') {
      charge.amount = parseFloat(target.value) || 0;
    } else if (field === 'frequency') {
      charge.frequency = target.value;
    }
    
    // Update state
    MortgageSimulator.setCharges(charges);
    debouncedRecalculate();
  };

  // ============================================
  // EVENT HANDLERS: PERSONAL INFO
  // ============================================

  /**
   * Handle age person 1 input change
   * @param {Event} e - Event object
   */
  const handleAgePerson1Change = (e) => {
    const age = parseInt(e.target.value) || null;
    
    // Update state
    const ages = MortgageSimulator.getAges();
    ages.person1 = age;
    MortgageSimulator.setAges(ages);
    
    debouncedRecalculate();
  };

  /**
   * Handle age person 1 blur - validate age range
   * @param {Event} e - Event object
   */
  const handleAgePerson1Blur = (e) => {
    let age = parseInt(e.target.value);
    
    // Validate range only on blur
    if (age && (age < 18 || age > 75)) {
      age = Math.max(18, Math.min(75, age));
      e.target.value = age;
      
      // Update state with validated age
      const ages = MortgageSimulator.getAges();
      ages.person1 = age;
      MortgageSimulator.setAges(ages);
      
      debouncedRecalculate();
    }
  };

  // ============================================
  // EVENT HANDLERS: CAPITAL & FEES
  // ============================================

  /**
   * Handle available capital input change
   * @param {Event} e - Event object
   */
  const handleCapitalChange = (e) => {
    const capital = parseFloat(e.target.value) || 0;
    MortgageSimulator.setCapital(Math.max(0, capital));
    debouncedRecalculate();
  };

  /**
   * Handle frais de dossier input change
   * @param {Event} e - Event object
   */
  const handleFraisDossierChange = (e) => {
    const frais = parseFloat(e.target.value) || 0;
    MortgageSimulator.setFraisDossier(Math.max(0, frais));
    debouncedRecalculate();
  };

  // ============================================
  // EVENT HANDLERS: LOAN PARAMETERS
  // ============================================

  /**
   * Handle loan duration slider change
   * @param {Event} e - Event object
   */
  const handleDurationChange = (e) => {
    const duration = parseInt(e.target.value);
    MortgageSimulator.setDuration(duration);
    
    // Update display
    const display = document.getElementById('duration-value');
    if (display) {
      display.textContent = duration;
    }
    
    debouncedRecalculate();
  };

  /**
   * Handle rate input changes
   * @param {Event} e - Event object
   */
  const handleRateChange = (e) => {
    const input = e.target;
    const duration = input.id.replace('rate-', ''); // Extract duration (15, 20, 25)
    const rate = parseFloat(input.value) || 0;
    
    // Update rates in state
    const rates = MortgageSimulator.getRates();
    rates[duration] = rate;
    MortgageSimulator.setRates(rates);
    
    debouncedRecalculate();
  };

  // ============================================
  // EVENT HANDLERS: PROPERTY
  // ============================================

  /**
   * Handle property type change
   * @param {Event} e - Event object
   */
  const handlePropertyTypeChange = (e) => {
    if (e.target.name !== 'property-type') return;
    
    const propertyType = e.target.value; // 'old' or 'new'
    MortgageSimulator.setPropertyType(propertyType);
    debouncedRecalculate();
  };

  /**
   * Handle property price slider change
   * @param {Event} e - Event object
   */
  const handlePropertyPriceSliderChange = (e) => {
    const price = parseFloat(e.target.value) || 0;
    
    // Update display
    const display = document.getElementById('property-price-display');
    if (display) {
      display.textContent = UI.formatNumber(price);
    }
    
    // Sync with input
    UI.syncInput('property-price-input', price);
    
    // Update state
    MortgageSimulator.setPropertyPrice(price);
    debouncedRecalculate();
  };

  /**
   * Handle property price input change
   * @param {Event} e - Event object
   */
  const handlePropertyPriceInputChange = (e) => {
    const price = parseFloat(e.target.value) || 0;
    
    // Update display
    const display = document.getElementById('property-price-display');
    if (display) {
      display.textContent = UI.formatNumber(price);
    }
    
    // Sync with slider
    UI.syncSlider('property-price-slider', price);
    
    // Update state
    MortgageSimulator.setPropertyPrice(price);
    debouncedRecalculate();
  };

  // ============================================
  // EVENT HANDLERS: TABS
  // ============================================

  /**
   * Handle tab navigation click
   * @param {Event} e - Event object
   */
  const handleTabClick = (e) => {
    e.preventDefault();
    
    const button = e.target.closest('[data-bs-toggle="tab"]');
    if (!button) return;
    
    // Extract tab ID from button ID (format: tab-{id})
    const tabId = button.id.replace('tab-', '');
    
    // Update UI
    UI.showTab(tabId);
    
    // Update state
    MortgageSimulator.setActiveTab(tabId);
  };

  // ============================================
  // EVENT HANDLERS: TABLE CONTROLS
  // ============================================

  /**
   * Handle export CSV button click
   */
  const handleExportCSV = () => {
    const amortizationTable = MortgageSimulator.getComputed().amortizationTable;
    UI.exportCSV(amortizationTable);
  };

  /**
   * Handle toggle view button click
   */
  const handleToggleView = () => {
    const currentView = MortgageSimulator.getTableView();
    const newView = currentView === 'monthly' ? 'yearly' : 'monthly';
    
    // Update state
    MortgageSimulator.setTableView(newView);
    
    // Update UI
    UI.switchTableView(newView);
    
    // Re-render table
    const amortizationTable = MortgageSimulator.getComputed().amortizationTable;
    UI.renderTable(amortizationTable, newView);
  };

  // ============================================
  // BIND ALL EVENTS
  // ============================================

  /**
   * Bind all event listeners
   * Called once on application initialization
   */
  const bindEvents = () => {
    // Revenue/Charge add buttons
    const addRevenueBtn = document.getElementById('add-revenue-btn');
    if (addRevenueBtn) {
      addRevenueBtn.addEventListener('click', handleAddRevenue);
    }

    const addChargeBtn = document.getElementById('add-charge-btn');
    if (addChargeBtn) {
      addChargeBtn.addEventListener('click', handleAddCharge);
    }

    // Event delegation for dynamic revenue/charge rows
    const revenueRows = document.getElementById('revenue-rows');
    if (revenueRows) {
      revenueRows.addEventListener('click', handleRevenueRowChange);
      revenueRows.addEventListener('change', handleRevenueRowChange);
      revenueRows.addEventListener('input', handleRevenueRowChange);
    }

    const chargeRows = document.getElementById('charge-rows');
    if (chargeRows) {
      chargeRows.addEventListener('click', handleChargeRowChange);
      chargeRows.addEventListener('change', handleChargeRowChange);
      chargeRows.addEventListener('input', handleChargeRowChange);
    }

    // Personal info
    const agePerson1 = document.getElementById('age-person1');
    if (agePerson1) {
      agePerson1.addEventListener('input', handleAgePerson1Change);
      agePerson1.addEventListener('blur', handleAgePerson1Blur);
    }

    // Capital & Fees
    const availableCapital = document.getElementById('available-capital');
    if (availableCapital) {
      availableCapital.addEventListener('input', handleCapitalChange);
    }

    const fraisDossier = document.getElementById('frais-dossier');
    if (fraisDossier) {
      fraisDossier.addEventListener('input', handleFraisDossierChange);
    }

    // Loan parameters
    const loanDuration = document.getElementById('loan-duration');
    if (loanDuration) {
      loanDuration.addEventListener('input', handleDurationChange);
    }

    const rate15 = document.getElementById('rate-15');
    if (rate15) {
      rate15.addEventListener('input', handleRateChange);
    }

    const rate20 = document.getElementById('rate-20');
    if (rate20) {
      rate20.addEventListener('input', handleRateChange);
    }

    const rate25 = document.getElementById('rate-25');
    if (rate25) {
      rate25.addEventListener('input', handleRateChange);
    }

    // Property type (radio buttons)
    const propertyOld = document.getElementById('property-old');
    if (propertyOld) {
      propertyOld.addEventListener('change', handlePropertyTypeChange);
    }

    const propertyNew = document.getElementById('property-new');
    if (propertyNew) {
      propertyNew.addEventListener('change', handlePropertyTypeChange);
    }

    // Property price
    const propertyPriceSlider = document.getElementById('property-price-slider');
    if (propertyPriceSlider) {
      propertyPriceSlider.addEventListener('input', handlePropertyPriceSliderChange);
    }

    const propertyPriceInput = document.getElementById('property-price-input');
    if (propertyPriceInput) {
      propertyPriceInput.addEventListener('input', handlePropertyPriceInputChange);
    }

    // Tab navigation
    const tabButtons = document.querySelectorAll('[data-bs-toggle="tab"]');
    tabButtons.forEach(button => {
      button.addEventListener('click', handleTabClick);
    });

    // Table controls
    const exportCsvBtn = document.getElementById('export-csv-btn');
    if (exportCsvBtn) {
      exportCsvBtn.addEventListener('click', handleExportCSV);
    }

    const toggleViewBtn = document.getElementById('toggle-view-btn');
    if (toggleViewBtn) {
      toggleViewBtn.addEventListener('click', handleToggleView);
    }

    // Gigogne
    const gigogneEnabled = document.getElementById('gigogne-enabled');
    if (gigogneEnabled) {
      gigogneEnabled.addEventListener('change', handleGigogneToggle);
    }

    const gigogneMaxAmount = document.getElementById('gigogne-max-amount');
    if (gigogneMaxAmount) {
      gigogneMaxAmount.addEventListener('input', handleGigogneMaxAmountChange);
    }

    const gigogneDuration = document.getElementById('gigogne-duration');
    if (gigogneDuration) {
      gigogneDuration.addEventListener('input', handleGigogneDurationChange);
    }

    const gigogneRate = document.getElementById('gigogne-rate');
    if (gigogneRate) {
      gigogneRate.addEventListener('input', handleGigogneRateChange);
    }

    const primaryRate = document.getElementById('primary-rate');
    if (primaryRate) {
      primaryRate.addEventListener('input', handlePrimaryRateChange);
    }

    // Initial calculation on load
    recalculate();
  };

  // ============================================
  // PUBLIC API
  // ============================================

  return {
    bindEvents,
    recalculate,
    debounce,
  };
})();

// Export for ES6 modules (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Events;
}
