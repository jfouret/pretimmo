/**
 * Formulas Module
 * All calculation functions implementing the mortgage formulas
 * Uses pure functions where possible for predictability and testability
 */

// Extend the MortgageSimulator namespace
MortgageSimulator.Formulas = (() => {
  
  // ============================================
  // 1. INCOME & CAPACITY (35% RULE)
  // ============================================

  /**
   * Calculate total monthly income from revenues
   * Converts yearly revenues to monthly (divided by 12)
   * @param {Array} revenues - Array of revenue objects {type, amount, frequency}
   * @returns {number} Total monthly income
   */
  const calcTotalMonthlyIncome = (revenues) => {
    if (!Array.isArray(revenues) || revenues.length === 0) {
      return 0;
    }
    
    return revenues.reduce((total, revenue) => {
      const amount = parseFloat(revenue.amount) || 0;
      const monthlyAmount = revenue.frequency === 'yearly' ? amount / 12 : amount;
      return total + monthlyAmount;
    }, 0);
  };

  /**
   * Calculate total monthly charges
   * Converts yearly charges to monthly (divided by 12)
   * @param {Array} charges - Array of charge objects {type, amount, frequency}
   * @returns {number} Total monthly charges
   */
  const calcTotalMonthlyCharges = (charges) => {
    if (!Array.isArray(charges) || charges.length === 0) {
      return 0;
    }
    
    return charges.reduce((total, charge) => {
      const amount = parseFloat(charge.amount) || 0;
      const monthlyAmount = charge.frequency === 'yearly' ? amount / 12 : amount;
      return total + monthlyAmount;
    }, 0);
  };

  /**
   * Calculate maximum monthly payment based on 35% rule
   * Formula: Income × 0.35 - Charges
   * @param {number} income - Total monthly income
   * @param {number} charges - Total monthly charges
   * @returns {number} Maximum monthly loan payment (excluding insurance)
   */
  const calcMaxMonthlyPayment = (income, charges) => {
    const maxPayment = income * 0.35 - charges;
    return Math.max(0, maxPayment); // Cannot be negative
  };

  // ============================================
  // 2. INSURANCE CALCULATION
  // ============================================

  /**
   * Get insurance rate based on age
   * Uses midpoint of rate range for each age bracket
   * @param {number} age - Age of borrower
   * @returns {number} Insurance rate as decimal (e.g., 0.0012 for 0.12%)
   */
  const getInsuranceRate = (age) => {
    if (!age || age < 0) {
      return 0;
    }
    
    // Age brackets with midpoint rates
    if (age <= 25) {
      return 0.0012; // 0.12%
    } else if (age <= 40) {
      return 0.00235; // 0.235%
    } else if (age <= 50) {
      return 0.00385; // 0.385%
    } else if (age <= 65) {
      return 0.0055; // 0.55%
    } else {
      return 0.0065; // 0.65%
    }
  };

  /**
   * Calculate monthly insurance payment
   * Insurance applies to initial borrowed capital (constant over loan duration)
   * Formula: Capital × annualRate / 12
   * @param {number} borrowedCapital - Initial loan amount
   * @param {number} insuranceRate - Annual insurance rate as decimal
   * @returns {number} Monthly insurance payment
   */
  const calcMonthlyInsurance = (borrowedCapital, insuranceRate) => {
    if (!borrowedCapital || borrowedCapital <= 0 || !insuranceRate) {
      return 0;
    }
    
    return (borrowedCapital * insuranceRate) / 12;
  };

  // ============================================
  // 3. INTEREST RATE INTERPOLATION
  // ============================================

  /**
   * Linear interpolation for interest rates between known durations
   * Formula: rate(D) = rate(D1) + (rate(D2) - rate(D1)) × (D - D1) / (D2 - D1)
   * @param {number} duration - Duration in years (15-25)
   * @param {Object} rates - Rates object {15, 20, 25}
   * @returns {number} Interpolated annual rate
   */
  const interpolateRate = (duration, rates) => {
    // Validate inputs
    if (!duration || !rates) {
      return 0;
    }
    
    // If exact match exists, return it
    if (rates[duration]) {
      return rates[duration];
    }
    
    // Determine which two points to interpolate between
    let d1, d2;
    if (duration < 15) {
      return rates[15]; // Use minimum rate
    } else if (duration <= 20) {
      d1 = 15;
      d2 = 20;
    } else if (duration <= 25) {
      d1 = 20;
      d2 = 25;
    } else {
      return rates[25]; // Use maximum rate
    }
    
    // Linear interpolation
    const rate1 = rates[d1];
    const rate2 = rates[d2];
    const interpolated = rate1 + (rate2 - rate1) * (duration - d1) / (d2 - d1);
    
    return interpolated;
  };

  // ============================================
  // 4. MAXIMUM BORROWING CAPACITY
  // ============================================

  /**
   * Calculate maximum loan using annuity formula solved for Principal
   * Formula: MaxLoan = MonthlyPayment × [(1 - (1 + r)^(-n)) / r]
   * @param {number} monthlyPayment - Maximum monthly payment (from 35% rule)
   * @param {number} annualRate - Annual interest rate as percentage (e.g., 3.09)
   * @param {number} durationYears - Loan duration in years
   * @returns {number} Maximum loan amount
   */
  const calcMaxLoan = (monthlyPayment, annualRate, durationYears) => {
    if (!monthlyPayment || monthlyPayment <= 0 || !annualRate || !durationYears) {
      return 0;
    }
    
    const monthlyRate = annualRate / 12 / 100; // Convert to monthly decimal
    const numMonths = durationYears * 12;
    
    // Handle edge case of zero interest
    if (monthlyRate === 0) {
      return monthlyPayment * numMonths;
    }
    
    // Annuity formula solved for Principal
    const maxLoan = monthlyPayment * (1 - Math.pow(1 + monthlyRate, -numMonths)) / monthlyRate;
    
    return maxLoan;
  };

  /**
   * Calculate monthly payment using standard annuity formula
   * Formula: MonthlyPayment = Loan × [r × (1 + r)^n] / [(1 + r)^n - 1]
   * @param {number} loan - Loan amount
   * @param {number} annualRate - Annual interest rate as percentage (e.g., 3.09)
   * @param {number} durationYears - Loan duration in years
   * @returns {number} Monthly payment (excluding insurance)
   */
  const calcMonthlyPayment = (loan, annualRate, durationYears) => {
    if (!loan || loan <= 0 || !annualRate || !durationYears) {
      return 0;
    }
    
    const monthlyRate = annualRate / 12 / 100; // Convert to monthly decimal
    const numMonths = durationYears * 12;
    
    // Handle edge case of zero interest
    if (monthlyRate === 0) {
      return loan / numMonths;
    }
    
    // Standard annuity formula
    const payment = loan * (monthlyRate * Math.pow(1 + monthlyRate, numMonths)) / 
                    (Math.pow(1 + monthlyRate, numMonths) - 1);
    
    return payment;
  };

  // ============================================
  // 5. FRAIS DE NOTAIRE (NOTARY FEES)
  // ============================================

  /**
   * Calculate Émoluments (notary's fee) with sliding scale + TVA
   * @param {number} price - Property price
   * @returns {number} Émoluments including 20% TVA
   */
  const calcEmoluments = (price) => {
    let emoluments = 0;
    
    // Sliding scale brackets
    if (price > 60000) {
      emoluments += (price - 60000) * 0.00799;
      price = 60000;
    }
    if (price > 17000) {
      emoluments += (price - 17000) * 0.01064;
      price = 17000;
    }
    if (price > 6500) {
      emoluments += (price - 6500) * 0.01596;
      price = 6500;
    }
    if (price > 0) {
      emoluments += price * 0.03870;
    }
    
    // Add 20% TVA
    return emoluments * 1.20;
  };

  /**
   * Calculate notary fees for property purchase
   * Different formulas for old vs new properties
   * @param {number} propertyPrice - Property price
   * @param {string} propertyType - 'old' or 'new'
   * @returns {number} Total notary fees
   */
  const calcNotaryFees = (propertyPrice, propertyType) => {
    if (!propertyPrice || propertyPrice <= 0) {
      return 0;
    }
    
    // 1. Émoluments (same for both, sliding scale + TVA)
    const emoluments = calcEmoluments(propertyPrice);
    
    // 2. Taxes (different for old vs new)
    let taxes;
    if (propertyType === 'new') {
      // New property: Taxe de publicité foncière ~0.715%
      taxes = propertyPrice * 0.00715;
    } else {
      // Old property: Droits de mutation ~5.80%
      // (4.50% departmental + 1.20% municipal + 2.37% collection fee on departmental)
      taxes = propertyPrice * 0.058;
    }
    
    // 3. Débours (disbursements) - fixed estimate
    const debours = 1000;
    
    // 4. Contribution Sécurité Immobilière (0.10% of price, min 15€)
    const contribution = Math.max(15, propertyPrice * 0.001);
    
    const totalFees = emoluments + taxes + debours + contribution;
    
    return totalFees;
  };

  // ============================================
  // 6. CAUTION CRÉDIT LOGEMENT
  // ============================================

  /**
   * Calculate Caution Crédit Logement (loan guarantee)
   * Formula: Commission + FMG (Fonds Mutuel de Garantie)
   * @param {number} loanAmount - Loan amount
   * @returns {number} Total caution cost
   */
  const calcCautionCreditLogement = (loanAmount) => {
    if (!loanAmount || loanAmount <= 0) {
      return 0;
    }
    
    // 1. Commission (non-refundable)
    let commission;
    if (loanAmount <= 500000) {
      commission = loanAmount * 0.012; // 1.20%
    } else {
      commission = 6000 + (loanAmount - 500000) * 0.005; // 6000€ + 0.50% above 500k
    }
    
    // 2. FMG (Fonds Mutuel de Garantie) - 0.50% of loan
    // Partially refundable at loan end, but counted in full for cost calculation
    const fmg = loanAmount * 0.005; // 0.50%
    
    const totalCaution = commission + fmg;
    
    // Minimum total: 1000€
    return Math.max(1000, totalCaution);
  };

  // ============================================
  // 7. MAXIMUM PROPERTY PRICE (ITERATIVE)
  // ============================================

  /**
   * Calculate maximum affordable property price (iterative)
   * Price = Capital + MaxLoan - Fees
   * Fees depend on price, so requires iteration to converge
   * @param {number} capital - Available capital
   * @param {number} maxLoan - Maximum loan capacity
   * @param {number} fraisDossier - Frais de dossier
   * @param {string} propertyType - 'old' or 'new'
   * @returns {Object} {price, notaryFees, caution, totalFees}
   */
  const calcMaxPropertyPrice = (capital, maxLoan, fraisDossier, propertyType) => {
    if (!capital || capital < 0 || !maxLoan || maxLoan <= 0) {
      return { price: 0, notaryFees: 0, caution: 0, totalFees: 0 };
    }
    
    // Initial estimate: Price = Capital + MaxLoan
    let estimatedPrice = capital + maxLoan;
    let previousPrice = 0;
    let iterations = 0;
    const maxIterations = 10; // Safety limit
    const convergenceThreshold = 100; // €100 tolerance
    
    // Iterate until convergence
    while (Math.abs(estimatedPrice - previousPrice) > convergenceThreshold && iterations < maxIterations) {
      previousPrice = estimatedPrice;
      
      // Calculate fees for current estimate
      const notaryFees = calcNotaryFees(estimatedPrice, propertyType);
      const caution = calcCautionCreditLogement(maxLoan);
      const totalFees = notaryFees + fraisDossier + caution;
      
      // Adjust price: Price = Capital + MaxLoan - Fees
      estimatedPrice = capital + maxLoan - totalFees;
      
      iterations++;
    }
    
    // Final calculation with converged price
    const finalNotaryFees = calcNotaryFees(estimatedPrice, propertyType);
    const finalCaution = calcCautionCreditLogement(maxLoan);
    const finalTotalFees = finalNotaryFees + fraisDossier + finalCaution;
    
    return {
      price: Math.max(0, estimatedPrice),
      notaryFees: finalNotaryFees,
      caution: finalCaution,
      totalFees: finalTotalFees
    };
  };

  // ============================================
  // 8. REQUIRED LOAN FOR SELECTED PRICE
  // ============================================

  /**
   * Calculate required loan for a selected property price (iterative)
   * Loan = Price + Fees - Capital
   * Caution depends on loan amount, so requires iteration
   * @param {number} propertyPrice - Selected property price
   * @param {number} capital - Available capital
   * @param {number} fraisDossier - Frais de dossier
   * @param {string} propertyType - 'old' or 'new'
   * @returns {Object} {loan, caution, notaryFees, totalFees}
   */
  const calcRequiredLoan = (propertyPrice, capital, fraisDossier, propertyType) => {
    if (!propertyPrice || propertyPrice <= 0) {
      return { loan: 0, caution: 0, notaryFees: 0, totalFees: 0 };
    }
    
    // Calculate notary fees (independent of loan)
    const notaryFees = calcNotaryFees(propertyPrice, propertyType);
    
    // Initial loan estimate (assuming 10% for fees)
    let estimatedLoan = propertyPrice + propertyPrice * 0.10 - capital;
    let previousLoan = 0;
    let iterations = 0;
    const maxIterations = 10;
    const convergenceThreshold = 100; // €100 tolerance
    
    // Iterate until convergence
    while (Math.abs(estimatedLoan - previousLoan) > convergenceThreshold && iterations < maxIterations) {
      previousLoan = estimatedLoan;
      
      // Calculate caution based on current loan estimate
      const caution = calcCautionCreditLogement(estimatedLoan);
      const totalFees = notaryFees + fraisDossier + caution;
      
      // Recalculate loan: Loan = Price + Fees - Capital
      estimatedLoan = propertyPrice + totalFees - capital;
      
      // Ensure loan is not negative
      if (estimatedLoan < 0) {
        estimatedLoan = 0;
        break;
      }
      
      iterations++;
    }
    
    // Final calculation with converged loan
    const finalCaution = calcCautionCreditLogement(estimatedLoan);
    const finalTotalFees = notaryFees + fraisDossier + finalCaution;
    
    return {
      loan: Math.max(0, estimatedLoan),
      caution: finalCaution,
      notaryFees: notaryFees,
      totalFees: finalTotalFees
    };
  };

  // ============================================
  // 9. AMORTIZATION TABLE
  // ============================================

  /**
   * Generate complete amortization table for the loan
   * Returns array of monthly payment details
   * @param {number} loan - Loan amount
   * @param {number} annualRate - Annual interest rate as percentage
   * @param {number} durationYears - Loan duration in years
   * @param {number} insuranceRate - Annual insurance rate as decimal
   * @returns {Array} Array of monthly objects
   */
  const generateAmortizationTable = (loan, annualRate, durationYears, insuranceRate) => {
    if (!loan || loan <= 0 || !annualRate || !durationYears) {
      return [];
    }
    
    const monthlyRate = annualRate / 12 / 100;
    const numMonths = durationYears * 12;
    const monthlyPayment = calcMonthlyPayment(loan, annualRate, durationYears);
    const monthlyInsurance = calcMonthlyInsurance(loan, insuranceRate);
    
    const table = [];
    let remainingCapital = loan;
    let totalPaid = 0;
    
    for (let month = 1; month <= numMonths; month++) {
      // Calculate interest on remaining capital
      const interestPart = remainingCapital * monthlyRate;
      
      // Principal is the difference
      const principalPart = monthlyPayment - interestPart;
      
      // Update remaining capital
      remainingCapital -= principalPart;
      
      // Handle rounding in last month
      if (month === numMonths) {
        remainingCapital = 0;
      }
      
      // Update total paid
      totalPaid += monthlyPayment + monthlyInsurance;
      
      // Add row to table
      table.push({
        month: month,
        year: Math.ceil(month / 12),
        payment: monthlyPayment,
        principalPart: principalPart,
        interestPart: interestPart,
        insurance: monthlyInsurance,
        totalPaid: totalPaid,
        remainingCapital: Math.max(0, remainingCapital)
      });
    }
    
    return table;
  };

  // ============================================
  // 10. TAEG CALCULATION (ITERATIVE IRR)
  // ============================================

  /**
   * Calculate TAEG (Taux Annuel Effectif Global)
   * Uses iterative approximation to find the effective annual rate
   * TAEG reflects true cost including all fees
   * @param {number} loan - Net loan amount received
   * @param {number} totalCost - Total amount to be repaid (including all fees)
   * @param {number} durationYears - Loan duration in years
   * @returns {number} TAEG as percentage
   */
  const calcTAEG = (loan, totalCost, durationYears) => {
    if (!loan || loan <= 0 || !totalCost || totalCost <= loan || !durationYears) {
      return 0;
    }
    
    const numMonths = durationYears * 12;
    const monthlyPayment = totalCost / numMonths;
    
    // Newton-Raphson method to find monthly rate
    let rate = 0.003; // Initial guess ~3.6% annual
    let iterations = 0;
    const maxIterations = 100;
    const tolerance = 0.000001;
    
    while (iterations < maxIterations) {
      // Calculate present value at current rate
      const pv = monthlyPayment * (1 - Math.pow(1 + rate, -numMonths)) / rate;
      const diff = pv - loan;
      
      if (Math.abs(diff) < tolerance) {
        break;
      }
      
      // Calculate derivative for Newton-Raphson
      const dpv = monthlyPayment * (
        (1 - Math.pow(1 + rate, -numMonths)) / (rate * rate) -
        numMonths * Math.pow(1 + rate, -numMonths - 1) / rate
      );
      
      // Update rate
      rate = rate - diff / dpv;
      
      // Prevent negative or extreme rates
      if (rate < 0) rate = 0.0001;
      if (rate > 0.1) rate = 0.1; // Cap at 10% monthly (unrealistic)
      
      iterations++;
    }
    
    // Convert monthly rate to annual TAEG
    const taeg = rate * 12 * 100;
    
    return taeg;
  };

  // ============================================
  // PUBLIC API
  // ============================================

  return {
    // Income & Capacity (35% Rule)
    calcTotalMonthlyIncome,
    calcTotalMonthlyCharges,
    calcMaxMonthlyPayment,
    
    // Insurance
    getInsuranceRate,
    calcMonthlyInsurance,
    
    // Interest Rate
    interpolateRate,
    
    // Loan Calculations
    calcMaxLoan,
    calcMonthlyPayment,
    
    // Fees
    calcNotaryFees,
    calcCautionCreditLogement,
    
    // Property Price
    calcMaxPropertyPrice,
    calcRequiredLoan,
    
    // Amortization & TAEG
    generateAmortizationTable,
    calcTAEG,
  };
})();

// Export for ES6 modules (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MortgageSimulator;
}
