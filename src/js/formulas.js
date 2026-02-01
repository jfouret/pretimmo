/**
 * Formulas Module
 * All calculation functions implementing the mortgage formulas
 * Uses pure functions where possible for predictability and testability
 */

// Use global Config object (set by config.js)
var { FormulaConstants } = window.Config || {};

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
    const maxPayment = income * FormulaConstants.debtRatio - charges;
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
    
    const rates = FormulaConstants.insuranceRates;
    
    // Age brackets with rates from config
    if (age <= 25) {
      return rates.upTo25;
    } else if (age <= 40) {
      return rates.upTo40;
    } else if (age <= 50) {
      return rates.upTo50;
    } else if (age <= 65) {
      return rates.upTo65;
    } else {
      return rates.over65;
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
    var d1, d2;
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
    const rates = FormulaConstants.emolumentRates;
    const thresholds = FormulaConstants.emolumentThresholds;
    var emoluments = 0;
    
    // Sliding scale brackets
    if (price > thresholds.tier3) {
      emoluments += (price - thresholds.tier3) * rates.bracket4;
      price = thresholds.tier3;
    }
    if (price > thresholds.tier2) {
      emoluments += (price - thresholds.tier2) * rates.bracket3;
      price = thresholds.tier2;
    }
    if (price > thresholds.tier1) {
      emoluments += (price - thresholds.tier1) * rates.bracket2;
      price = thresholds.tier1;
    }
    if (price > 0) {
      emoluments += price * rates.bracket1;
    }
    
    // Add 20% TVA
    return emoluments * FormulaConstants.emolumentTVA;
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
    var taxes;
    if (propertyType === 'new') {
      // New property: Taxe de publicité foncière
      taxes = propertyPrice * FormulaConstants.propertyTax.new;
    } else {
      // Old property: Droits de mutation
      taxes = propertyPrice * FormulaConstants.propertyTax.old;
    }
    
    // 3. Débours (disbursements) - fixed estimate
    const debours = FormulaConstants.debours;
    
    // 4. Contribution Sécurité Immobilière (0.10% of price, min 15€)
    const contribution = Math.max(
      FormulaConstants.contribution.minimum,
      propertyPrice * FormulaConstants.contribution.rate
    );
    
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
    
    const cautionConfig = FormulaConstants.caution;
    
    // 1. Commission (non-refundable)
    var commission;
    if (loanAmount <= cautionConfig.threshold) {
      commission = loanAmount * cautionConfig.commissionRateLow;
    } else {
      commission = cautionConfig.commissionFixed + 
                   (loanAmount - cautionConfig.threshold) * cautionConfig.commissionRateHigh;
    }
    
    // 2. FMG (Fonds Mutuel de Garantie)
    // Partially refundable at loan end, but counted in full for cost calculation
    const fmg = loanAmount * cautionConfig.fmgRate;
    
    const totalCaution = commission + fmg;
    
    // Minimum total
    return Math.max(cautionConfig.minimum, totalCaution);
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
    
    const iterConfig = FormulaConstants.iteration;
    
    // Initial estimate: Price = Capital + MaxLoan
    var estimatedPrice = capital + maxLoan;
    var previousPrice = 0;
    var iterations = 0;
    
    // Iterate until convergence
    while (Math.abs(estimatedPrice - previousPrice) > iterConfig.convergenceThreshold && 
           iterations < iterConfig.maxIterations) {
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

  /**
   * Optimize maximum property price considering insurance costs
   * Uses binary search iteration to find the maximum affordable price where:
   * - Total monthly payment (loan + insurance) fits within available budget
   * - The circular dependency between insurance and loan is resolved
   * 
   * @param {number} capital - Available capital
   * @param {number} maxMonthlyPayment - Maximum monthly payment budget (from 35% rule)
   * @param {number} fraisDossier - Frais de dossier
   * @param {string} propertyType - 'old' or 'new'
   * @param {number} annualRate - Annual interest rate as percentage
   * @param {number} durationYears - Loan duration in years
   * @param {number} age - Borrower age (for insurance calculation)
   * @returns {Object} {price, notaryFees, caution, totalFees, loan, monthlyPayment, monthlyInsurance}
   */
  const optimizeMaxPropertyPriceWithInsurance = (
    capital,
    maxMonthlyPayment,
    fraisDossier,
    propertyType,
    annualRate,
    durationYears,
    age
  ) => {
    // Validate inputs
    if (!capital || capital < 0 || !maxMonthlyPayment || maxMonthlyPayment <= 0) {
      return { 
        price: 0, 
        notaryFees: 0, 
        caution: 0, 
        totalFees: 0, 
        loan: 0,
        monthlyPayment: 0,
        monthlyInsurance: 0
      };
    }
    
    // Get insurance rate for age
    const insuranceRate = getInsuranceRate(age);
    
    // Calculate initial max loan WITHOUT insurance consideration
    const initialMaxLoan = calcMaxLoan(maxMonthlyPayment, annualRate, durationYears);
    
    // Calculate initial max price WITHOUT insurance consideration
    const initialMaxPriceResult = calcMaxPropertyPrice(
      capital,
      initialMaxLoan,
      fraisDossier,
      propertyType
    );
    
    // If no valid starting price, return zeros
    if (initialMaxPriceResult.price <= 0) {
      return {
        price: 0,
        notaryFees: 0,
        caution: 0,
        totalFees: 0,
        loan: 0,
        monthlyPayment: 0,
        monthlyInsurance: 0
      };
    }
    
    /**
     * Helper function: Check if a property price is affordable (within budget)
     * @param {number} candidatePrice - Property price to test
     * @returns {Object} {affordable: boolean, totalMonthlyCost: number, shortfall: number}
     */
    const checkAffordability = (candidatePrice) => {
      // Calculate required loan for this price
      const loanResult = calcRequiredLoan(candidatePrice, capital, fraisDossier, propertyType);
      const requiredLoan = loanResult.loan;
      
      // If no loan needed, it's definitely affordable
      if (requiredLoan <= 0) {
        return { affordable: true, totalMonthlyCost: 0, shortfall: -maxMonthlyPayment };
      }
      
      // Calculate monthly loan payment
      const monthlyLoanPayment = calcMonthlyPayment(requiredLoan, annualRate, durationYears);
      
      // Calculate monthly insurance
      const monthlyInsurance = calcMonthlyInsurance(requiredLoan, insuranceRate);
      
      // Total monthly cost
      const totalMonthlyCost = monthlyLoanPayment + monthlyInsurance;
      
      // Calculate shortfall
      const shortfall = totalMonthlyCost - maxMonthlyPayment;
      
      return {
        affordable: shortfall <= 0,
        totalMonthlyCost: totalMonthlyCost,
        shortfall: shortfall,
        loan: requiredLoan,
        loanResult: loanResult
      };
    };
    
    // Binary search for optimal price
    var minPrice = 0;
    var maxPrice = initialMaxPriceResult.price;
    var optimalPrice = minPrice;
    const tolerance = 100; // €100 tolerance
    const maxIterations = 30;
    var iterations = 0;
    
    // Binary search iteration
    while (maxPrice - minPrice > tolerance && iterations < maxIterations) {
      const midPrice = (minPrice + maxPrice) / 2;
      const check = checkAffordability(midPrice);
      
      if (check.affordable) {
        // This price is affordable, try higher
        optimalPrice = midPrice;
        minPrice = midPrice;
      } else {
        // This price is too expensive, try lower
        maxPrice = midPrice;
      }
      
      iterations++;
    }
    
    // Final check at optimal price
    const finalCheck = checkAffordability(optimalPrice);
    
    // If we found an affordable price, return details
    if (optimalPrice > 0 && finalCheck.loanResult) {
      const finalLoan = finalCheck.loanResult.loan;
      return {
        price: optimalPrice,
        notaryFees: finalCheck.loanResult.notaryFees,
        caution: finalCheck.loanResult.caution,
        totalFees: finalCheck.loanResult.totalFees,
        loan: finalLoan,
        monthlyPayment: calcMonthlyPayment(finalLoan, annualRate, durationYears),
        monthlyInsurance: calcMonthlyInsurance(finalLoan, insuranceRate)
      };
    }
    
    // Fallback: return zeros if no solution found
    return {
      price: 0,
      notaryFees: 0,
      caution: 0,
      totalFees: 0,
      loan: 0,
      monthlyPayment: 0,
      monthlyInsurance: 0
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
    
    const iterConfig = FormulaConstants.iteration;
    
    // Calculate notary fees (independent of loan)
    const notaryFees = calcNotaryFees(propertyPrice, propertyType);
    
    // Initial loan estimate (using initial fees estimate)
    var estimatedLoan = propertyPrice + propertyPrice * iterConfig.initialFeesEstimate - capital;
    var previousLoan = 0;
    var iterations = 0;
    
    // Iterate until convergence
    while (Math.abs(estimatedLoan - previousLoan) > iterConfig.convergenceThreshold && 
           iterations < iterConfig.maxIterations) {
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
    var remainingCapital = loan;
    var totalPaid = 0;
    
    for (var month = 1; month <= numMonths; month++) {
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
   * Calculate TAEG using optimization-js (Powell's method)
   * Finds the true effective annual rate by minimizing the difference between
   * the actual monthly payment and the theoretical payment at a candidate TAEG
   * 
   * @param {number} loan - Net loan amount received
   * @param {number} monthlyPayment - Actual monthly payment (principal + interest + insurance)
   * @param {number} durationYears - Loan duration in years
   * @param {number} nominalRate - Nominal interest rate as percentage (starting estimate)
   * @param {number} insuranceRate - Annual insurance rate as decimal
   * @returns {number} TAEG as percentage
   */
  const calcTAEG = (loan, monthlyPayment, durationYears, nominalRate, insuranceRate) => {
    // Validate inputs
    if (!loan || loan <= 0 || !monthlyPayment || monthlyPayment <= 0 || !durationYears) {
      return 0;
    }
    
    const numMonths = durationYears * 12;
    
    /**
     * Objective function: Calculate absolute difference between
     * theoretical monthly payment at candidate TAEG and actual monthly payment
     * @param {Array} x - Array containing [candidateTAEGAnnual]
     * @returns {number} Absolute difference (to minimize)
     */
    const objectiveFunction = (x) => {
      const candidateTAEGAnnual = x[0]; // Annual rate as percentage
      
      // Prevent negative or unreasonable rates
      if (candidateTAEGAnnual < 0 || candidateTAEGAnnual > 50) {
        return 1e10; // Large penalty
      }
      
      // Convert to monthly rate
      const monthlyRateCandidate = candidateTAEGAnnual / 12 / 100;
      
      // Handle zero rate edge case
      if (monthlyRateCandidate === 0) {
        const theoreticalPayment = loan / numMonths;
        return Math.abs(theoreticalPayment - monthlyPayment);
      }
      
      // Calculate theoretical monthly payment at this TAEG
      const theoreticalPayment = loan * 
        (monthlyRateCandidate * Math.pow(1 + monthlyRateCandidate, numMonths)) / 
        (Math.pow(1 + monthlyRateCandidate, numMonths) - 1);
      
      // Return absolute difference
      return Math.abs(theoreticalPayment - monthlyPayment);
    };
    
    // Starting value: nominal rate + estimated insurance contribution
    // Insurance typically adds 0.3-0.5% to the annual rate
    const estimatedInsuranceContribution = insuranceRate ? (insuranceRate * 100 * 0.5) : 0.3;
    const startingValue = nominalRate + estimatedInsuranceContribution;
    
    try {
      // Run Powell's optimization
      const solution = optimjs.minimize_Powell(objectiveFunction, [startingValue]);
      
      // Extract optimized TAEG
      let optimizedTAEG = solution.argument[0];
      
      // Constraint: TAEG must be >= nominal rate (insurance adds cost)
      if (optimizedTAEG < nominalRate) {
        optimizedTAEG = nominalRate;
      }
      
      // Sanity check: reasonable range
      if (optimizedTAEG < 0 || optimizedTAEG > 50) {
        // Fallback to iterative method
        const totalCost = monthlyPayment * durationYears * 12;
        return calcTAEG(loan, totalCost, durationYears);
      }
      
      return optimizedTAEG;
    } catch (error) {
      console.error('TAEG optimization failed:', error);
    }
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
    optimizeMaxPropertyPriceWithInsurance,
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
