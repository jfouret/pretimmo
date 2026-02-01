/**
 * State Management Module
 * Centralized state management for the Mortgage Dynamic Simulator
 * Uses IIFE pattern for encapsulation and provides a clean public API
 */

// Use global Config object (set by config.js)
var { AppDefaults, ItemDefaults, GigogneDefaults } = window.Config || {};

const MortgageSimulator = (() => {
  // Private ID counter for dynamic rows
  let idCounter = 1;

  // Default state values
  const defaultState = {
    // User inputs
    revenues: [{id: idCounter++, type: ItemDefaults.revenue.type, amount: ItemDefaults.revenue.amount, frequency: ItemDefaults.revenue.frequency}],
    charges: [],
    ages: { ...AppDefaults.ages },
    capital: AppDefaults.capital,
    fraisDossier: AppDefaults.fraisDossier,
    rates: { ...AppDefaults.rates },
    duration: AppDefaults.duration,
    propertyType: AppDefaults.propertyType,
    propertyPrice: AppDefaults.propertyPrice,  // Fixed: now 250000
    
    // Gigogne state
    gigogne: { ...GigogneDefaults, optimalAmount: 0, actualAmount: 0 },
    primaryRateOverride: null,

    // Computed values (cached)
    maxLoan: 0,
    maxPropertyPrice: 0,
    requiredLoan: 0,
    monthlyPayment: 0,
    monthlyInsurance: 0,
    monthlyPaymentWithInsurance: 0,
    totalCost: 0,
    taeg: 0,
    amortizationTable: [],
    notaryFees: 0,
    cautionFees: 0,
    
    // UI state
    activeTab: AppDefaults.activeTab,
    tableView: AppDefaults.tableView,
  };

  // Application state (initialized from defaults)
  const state = { ...defaultState };

  /**
   * Generate a unique ID for dynamic rows
   * @returns {number} Unique ID
   */
  const generateId = () => {
    return idCounter++;
  };

  /**
   * Deep clone an object to prevent mutation
   * @param {Object} obj - Object to clone
   * @returns {Object} Cloned object
   */
  const deepClone = (obj) => {
    return JSON.parse(JSON.stringify(obj));
  };

  // Public API
  return {
    // ============================================
    // GETTERS
    // ============================================

    /**
     * Get complete state snapshot
     * @returns {Object} Deep copy of entire state
     */
    getState() {
      return deepClone(state);
    },

    /**
     * Get all revenues
     * @returns {Array} Array of revenue objects
     */
    getRevenues() {
      return [...state.revenues];
    },

    /**
     * Get all charges
     * @returns {Array} Array of charge objects
     */
    getCharges() {
      return [...state.charges];
    },

    /**
     * Get ages of both persons
     * @returns {Object} Ages object {person1}
     */
    getAges() {
      return { ...state.ages };
    },

    /**
     * Get available capital
     * @returns {number} Capital amount
     */
    getCapital() {
      return state.capital;
    },

    /**
     * Get frais de dossier
     * @returns {number} Frais de dossier amount
     */
    getFraisDossier() {
      return state.fraisDossier;
    },

    /**
     * Get interest rates by duration
     * @returns {Object} Rates object {15, 20, 25}
     */
    getRates() {
      return { ...state.rates };
    },

    /**
     * Get gigogne state
     * @returns {Object} Gigogne state object
     */
    getGigogne() {
      return { ...state.gigogne };
    },

    /**
     * Get primary rate override
     * @returns {number|null} Override rate or null
     */
    getPrimaryRateOverride() {
      return state.primaryRateOverride;
    },

    /**
     * Get loan duration
     * @returns {number} Duration in years
     */
    getDuration() {
      return state.duration;
    },

    /**
     * Get property type
     * @returns {string} Property type ('old' or 'new')
     */
    getPropertyType() {
      return state.propertyType;
    },

    /**
     * Get property price
     * @returns {number} Property price
     */
    getPropertyPrice() {
      return state.propertyPrice;
    },

    /**
     * Get all computed values
     * @returns {Object} Object containing all computed values
     */
    getComputed() {
      return {
        maxLoan: state.maxLoan,
        maxPropertyPrice: state.maxPropertyPrice,
        requiredLoan: state.requiredLoan,
        monthlyPayment: state.monthlyPayment,
        monthlyInsurance: state.monthlyInsurance,
        monthlyPaymentWithInsurance: state.monthlyPaymentWithInsurance,
        totalCost: state.totalCost,
        taeg: state.taeg,
        amortizationTable: [...state.amortizationTable],
      };
    },

    /**
     * Get notary fees
     * @returns {number} Notary fees amount
     */
    getNotaryFees() {
      return state.notaryFees;
    },

    /**
     * Get caution fees
     * @returns {number} Caution fees amount
     */
    getCautionFees() {
      return state.cautionFees;
    },

    /**
     * Get active tab
     * @returns {string} Active tab name
     */
    getActiveTab() {
      return state.activeTab;
    },

    /**
     * Get table view mode
     * @returns {string} Table view ('monthly' or 'yearly')
     */
    getTableView() {
      return state.tableView;
    },

    // ============================================
    // SETTERS - User Inputs
    // ============================================

    /**
     * Set all revenues at once
     * @param {Array} revenues - Array of revenue objects
     */
    setRevenues(revenues) {
      state.revenues = revenues.map(r => ({ ...r }));
    },

    /**
     * Add a new revenue
     * @param {Object} item - Revenue object {type, amount, frequency}
     * @returns {Object} The added revenue with generated ID
     */
    addRevenue(item) {
      const newRevenue = {
        id: generateId(),
        ...item,
      };
      state.revenues.push(newRevenue);
      return { ...newRevenue };
    },

    /**
     * Remove a revenue by ID
     * @param {number} id - Revenue ID to remove
     */
    removeRevenue(id) {
      state.revenues = state.revenues.filter(r => r.id !== id);
    },

    /**
     * Set all charges at once
     * @param {Array} charges - Array of charge objects
     */
    setCharges(charges) {
      state.charges = charges.map(c => ({ ...c }));
    },

    /**
     * Add a new charge
     * @param {Object} item - Charge object {type, amount, frequency}
     * @returns {Object} The added charge with generated ID
     */
    addCharge(item) {
      const newCharge = {
        id: generateId(),
        ...item,
      };
      state.charges.push(newCharge);
      return { ...newCharge };
    },

    /**
     * Remove a charge by ID
     * @param {number} id - Charge ID to remove
     */
    removeCharge(id) {
      state.charges = state.charges.filter(c => c.id !== id);
    },

    /**
     * Set ages for both persons
     * @param {Object} ages - Ages object {person1}
     */
    setAges(ages) {
      state.ages = { ...ages };
    },

    /**
     * Set available capital
     * @param {number} capital - Capital amount
     */
    setCapital(capital) {
      state.capital = capital;
    },

    /**
     * Set frais de dossier
     * @param {number} frais - Frais de dossier amount
     */
    setFraisDossier(frais) {
      state.fraisDossier = frais;
    },

    /**
     * Set interest rates
     * @param {Object} rates - Rates object {15, 20, 25}
     */
    setRates(rates) {
      state.rates = { ...rates };
    },

    /**
     * Set gigogne enabled state
     * @param {boolean} enabled - Enabled state
     */
    setGigogneEnabled(enabled) {
      state.gigogne.enabled = enabled;
    },

    /**
     * Set gigogne max amount
     * @param {number} amount - Max amount
     */
    setGigogneMaxAmount(amount) {
      state.gigogne.maxAmount = amount;
    },

    /**
     * Set gigogne duration
     * @param {number} duration - Duration in years
     */
    setGigogneDuration(duration) {
      state.gigogne.duration = duration;
    },

    /**
     * Set gigogne rate
     * @param {number} rate - Rate percentage
     */
    setGigogneRate(rate) {
      state.gigogne.rate = rate;
    },

    /**
     * Set gigogne optimal and actual amounts
     * @param {number} optimal - Calculated optimal amount
     */
    setGigogneOptimalAmount(optimal) {
      state.gigogne.optimalAmount = optimal;
      // Actual amount is limited by user-defined max
      state.gigogne.actualAmount = Math.min(optimal, state.gigogne.maxAmount);
    },

    /**
     * Set primary rate override
     * @param {number|null} rate - Rate or null
     */
    setPrimaryRateOverride(rate) {
      state.primaryRateOverride = rate;
    },

    /**
     * Set loan duration
     * @param {number} duration - Duration in years
     */
    setDuration(duration) {
      state.duration = duration;
    },

    /**
     * Set property type
     * @param {string} type - Property type ('old' or 'new')
     */
    setPropertyType(type) {
      state.propertyType = type;
    },

    /**
     * Set property price
     * @param {number} price - Property price
     */
    setPropertyPrice(price) {
      state.propertyPrice = price;
    },

    // ============================================
    // SETTERS - Computed Values
    // ============================================

    /**
     * Set maximum loan amount
     * @param {number} amount - Maximum loan amount
     */
    setMaxLoan(amount) {
      state.maxLoan = amount;
    },

    /**
     * Set maximum property price
     * @param {number} price - Maximum property price
     */
    setMaxPropertyPrice(price) {
      state.maxPropertyPrice = price;
    },

    /**
     * Set required loan amount
     * @param {number} amount - Required loan amount
     */
    setRequiredLoan(amount) {
      state.requiredLoan = amount;
    },

    /**
     * Set monthly payment (without insurance)
     * @param {number} amount - Monthly payment amount
     */
    setMonthlyPayment(amount) {
      state.monthlyPayment = amount;
    },

    /**
     * Set monthly insurance
     * @param {number} amount - Monthly insurance amount
     */
    setMonthlyInsurance(amount) {
      state.monthlyInsurance = amount;
    },

    /**
     * Set monthly payment with insurance
     * @param {number} amount - Monthly payment amount with insurance
     */
    setMonthlyPaymentWithInsurance(amount) {
      state.monthlyPaymentWithInsurance = amount;
    },

    /**
     * Set total cost of loan
     * @param {number} cost - Total cost
     */
    setTotalCost(cost) {
      state.totalCost = cost;
    },

    /**
     * Set TAEG (Annual Equivalent Rate)
     * @param {number} taeg - TAEG percentage
     */
    setTaeg(taeg) {
      state.taeg = taeg;
    },

    /**
     * Set amortization table
     * @param {Array} table - Amortization table array
     */
    setAmortizationTable(table) {
      state.amortizationTable = [...table];
    },

    /**
     * Set notary fees
     * @param {number} amount - Notary fees amount
     */
    setNotaryFees(amount) {
      state.notaryFees = amount;
    },

    /**
     * Set caution fees
     * @param {number} amount - Caution fees amount
     */
    setCautionFees(amount) {
      state.cautionFees = amount;
    },

    // ============================================
    // SETTERS - UI State
    // ============================================

    /**
     * Set active tab
     * @param {string} tab - Tab name
     */
    setActiveTab(tab) {
      state.activeTab = tab;
    },

    /**
     * Set table view mode
     * @param {string} view - View mode ('monthly' or 'yearly')
     */
    setTableView(view) {
      state.tableView = view;
    },

    // ============================================
    // UTILITY METHODS
    // ============================================

    /**
     * Reset all state to default values
     */
    reset() {
      // Reset all properties to defaults
      state.revenues = [{ id: idCounter++, ...ItemDefaults.revenue }];
      state.charges = [];
      state.ages = { ...AppDefaults.ages };
      state.capital = AppDefaults.capital;  // Fixed: was 0, now 50000
      state.fraisDossier = AppDefaults.fraisDossier;
      state.rates = { ...AppDefaults.rates };
      state.duration = AppDefaults.duration;
      state.propertyType = AppDefaults.propertyType;
      state.propertyPrice = AppDefaults.propertyPrice;  // Fixed: now 250000
      
      // Reset gigogne state
      state.gigogne = { ...GigogneDefaults, optimalAmount: 0, actualAmount: 0 };
      state.primaryRateOverride = null;

      // Reset computed values
      state.maxLoan = 0;
      state.maxPropertyPrice = 0;
      state.requiredLoan = 0;
      state.monthlyPayment = 0;
      state.monthlyInsurance = 0;
      state.monthlyPaymentWithInsurance = 0;
      state.totalCost = 0;
      state.taeg = 0;
      state.amortizationTable = [];
      state.notaryFees = 0;
      state.cautionFees = 0;
      
      // Reset UI state
      state.activeTab = AppDefaults.activeTab;
      state.tableView = AppDefaults.tableView;
      
      // Reset ID counter
      idCounter = 1;
    },

    /**
     * Export state as JSON string
     * @returns {string} JSON representation of state
     */
    toJSON() {
      return JSON.stringify(state, null, 2);
    },

    /**
     * Import state from JSON string
     * @param {string} json - JSON string to import
     * @returns {boolean} Success status
     */
    fromJSON(json) {
      try {
        const imported = JSON.parse(json);
        Object.assign(state, imported);
        return true;
      } catch (error) {
        console.error('Failed to import state from JSON:', error);
        return false;
      }
    },
  };
})();

// Export for ES6 modules (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MortgageSimulator;
}
