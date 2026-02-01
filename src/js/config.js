// src/js/config.js - Centralized configuration and default values

// Expose to global scope for concatenated build
window.Config = window.Config || {};

var AppDefaults = {
  duration: 20,
  propertyType: 'old',
  propertyPrice: 250000,  // Fixed bug: was 0 in state.js
  capital: 50000,
  fraisDossier: 1000,
  ages: { person1: 30 },
  rates: { 15: 3.09, 20: 3.17, 25: 3.25 },
  activeTab: 'summary',
  tableView: 'monthly',
};

var ItemDefaults = {
  revenue: {
    type: 'Salaire',      // Fixed: was 'salary' in state.js, now consistent
    amount: 2800,
    frequency: 'monthly'
  },
  charge: {
    type: 'Loyer',
    amount: 0,
    frequency: 'monthly'
  }
};

var UIOptions = {
  revenueTypes: ['Salaire', 'Prime', 'Revenus fonciers', 'Autre'],
  chargeTypes: ['Loyer', 'Crédit', 'Pension', 'Autre'],
};

var FormulaConstants = {
  // Debt ratio threshold
  debtRatio: 0.35,  // 35% rule
  
  // Insurance rate by age bracket (annual rate as decimal)
  insuranceRates: {
    upTo25: 0.0012,      // 0.12%
    upTo40: 0.00235,     // 0.235%
    upTo50: 0.00385,     // 0.385%
    upTo65: 0.0055,      // 0.55%
    over65: 0.0065       // 0.65%
  },
  
  // Emoluments brackets (notary fees - sliding scale rates)
  emolumentRates: {
    bracket1: 0.03870,   // 3.870% for portion up to 6500
    bracket2: 0.01596,   // 1.596% for portion from 6500 to 17000
    bracket3: 0.01064,   // 1.064% for portion from 17000 to 60000
    bracket4: 0.00799    // 0.799% for portion above 60000
  },
  emolumentThresholds: {
    tier1: 6500,
    tier2: 17000,
    tier3: 60000
  },
  emolumentTVA: 1.20,    // 20% TVA on emoluments
  
  // Property taxes
  propertyTax: {
    new: 0.00715,        // 0.715% for new property
    old: 0.058           // 5.80% for old property
  },
  
  // Débours (disbursements) - fixed estimate
  debours: 1000,
  
  // Contribution Sécurité Immobilière
  contribution: {
    rate: 0.001,         // 0.10% of property price
    minimum: 15          // Minimum 15€
  },
  
  // Caution Crédit Logement
  caution: {
    threshold: 500000,              // Threshold for rate change
    commissionRateLow: 0.012,       // 1.20% for loans <= 500000
    commissionFixed: 6000,          // Fixed part for loans > 500000
    commissionRateHigh: 0.005,      // 0.50% above 500000
    fmgRate: 0.005,                 // 0.50% FMG (Fonds Mutuel de Garantie)
    minimum: 1000                   // Minimum total caution
  },
  
  // TAEG calculation (Newton-Raphson)
  taeg: {
    initialGuess: 0.003,            // ~3.6% annual rate (monthly: 0.003)
    maxIterations: 100,
    tolerance: 0.000001,
    minRate: 0.0001,                // Prevent negative rates
    maxRate: 0.1                    // Cap at 10% monthly
  },
  
  // Iterative calculations (property price/loan)
  iteration: {
    maxIterations: 10,
    convergenceThreshold: 100,      // €100 tolerance
    initialFeesEstimate: 0.10       // 10% estimate for initial calculation
  }
};

// Expose all config objects globally
Object.assign(window.Config, {
  AppDefaults,
  ItemDefaults,
  UIOptions,
  FormulaConstants
});
