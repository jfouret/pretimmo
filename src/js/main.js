/**
 * Main Controller - Initialization and Orchestration
 * Mortgage Dynamic Simulator - Entry point that bootstraps the application
 * Coordinates all modules: State, Formulas, UI, Charts, Events
 */

// Use global Config object (set by config.js)
var { AppDefaults, ItemDefaults } = window.Config || {};

// Extend the MortgageSimulator namespace with other modules
MortgageSimulator.Formulas = MortgageSimulator.Formulas || {};
MortgageSimulator.UI = UI;
MortgageSimulator.Charts = Charts;
MortgageSimulator.Events = Events;

// Main Controller IIFE
(() => {
  
  // ============================================
  // INITIALIZATION LOGIC
  // ============================================
  
  /**
   * Initialize default state values
   * Sets up the application with sensible defaults
   */
  const initDefaultState = () => {
    try {
      // Set default duration
      MortgageSimulator.setDuration(AppDefaults.duration);
      
      // Set default property type
      MortgageSimulator.setPropertyType(AppDefaults.propertyType);
      
      // Set default property price
      MortgageSimulator.setPropertyPrice(AppDefaults.propertyPrice);
      
      // Set default available capital
      MortgageSimulator.setCapital(AppDefaults.capital);
      
      // Set default frais dossier
      MortgageSimulator.setFraisDossier(AppDefaults.fraisDossier);
      
      // Set default ages
      MortgageSimulator.setAges({ ...AppDefaults.ages });
      
      // Note: Default revenue is already added in state.js defaultState
      
      // Optionally add one empty charge row
      // Commented out as per requirements (optional)
      // const charge = MortgageSimulator.addCharge({
      //   type: ItemDefaults.charge.type,
      //   amount: ItemDefaults.charge.amount,
      //   frequency: ItemDefaults.charge.frequency
      // });
      
      console.log('✓ Default state initialized');
    } catch (error) {
      console.error('Failed to initialize default state:', error);
      throw error;
    }
  };
  
  /**
   * Initialize UI elements with default values
   * Renders dynamic rows and sets input field values
   */
  const initializeUI = () => {
    try {
      // Render dynamic rows from state
      UI.renderDynamicRows();
      
      // Set duration display
      const durationDisplay = document.getElementById('duration-value');
      if (durationDisplay) {
        durationDisplay.textContent = MortgageSimulator.getDuration();
      }
      
      // Set duration slider value
      const durationSlider = document.getElementById('loan-duration');
      if (durationSlider) {
        durationSlider.value = MortgageSimulator.getDuration();
      }
      
      // Set property type radio buttons
      const propertyType = MortgageSimulator.getPropertyType();
      const propertyOldRadio = document.getElementById('property-old');
      const propertyNewRadio = document.getElementById('property-new');
      if (propertyOldRadio && propertyNewRadio) {
        if (propertyType === 'old') {
          propertyOldRadio.checked = true;
        } else {
          propertyNewRadio.checked = true;
        }
      }
      
      // Set property price slider and input
      const propertyPrice = MortgageSimulator.getPropertyPrice();
      const propertySlider = document.getElementById('property-price-slider');
      const propertyInput = document.getElementById('property-price-input');
      const propertyDisplay = document.getElementById('property-price-display');
      
      if (propertySlider) {
        propertySlider.value = propertyPrice;
      }
      if (propertyInput) {
        propertyInput.value = propertyPrice;
      }
      if (propertyDisplay) {
        propertyDisplay.textContent = UI.formatNumber(propertyPrice);
      }
      
      // Set available capital input
      const capitalInput = document.getElementById('available-capital');
      if (capitalInput) {
        capitalInput.value = MortgageSimulator.getCapital();
      }
      
      // Set frais dossier input
      const fraisInput = document.getElementById('frais-dossier');
      if (fraisInput) {
        fraisInput.value = MortgageSimulator.getFraisDossier();
      }
      
      // Set rate inputs
      const rates = MortgageSimulator.getRates();
      const rate15Input = document.getElementById('rate-15');
      const rate20Input = document.getElementById('rate-20');
      const rate25Input = document.getElementById('rate-25');
      
      if (rate15Input) rate15Input.value = rates[15];
      if (rate20Input) rate20Input.value = rates[20];
      if (rate25Input) rate25Input.value = rates[25];
      
      // Set age input for person 1
      const agePerson1Input = document.getElementById('age-person1');
      if (agePerson1Input) {
        agePerson1Input.value = MortgageSimulator.getAges().person1 || '';
      }

      // Initialize Gigogne UI
      const gigogne = MortgageSimulator.getGigogne();
      const gigogneEnabled = document.getElementById('gigogne-enabled');
      const gigogneMaxAmount = document.getElementById('gigogne-max-amount');
      const gigogneDuration = document.getElementById('gigogne-duration');
      const gigogneRate = document.getElementById('gigogne-rate');
      const gigogneDurationValue = document.getElementById('gigogne-duration-value');

      if (gigogneEnabled) gigogneEnabled.checked = gigogne.enabled;
      if (gigogneMaxAmount) gigogneMaxAmount.value = gigogne.maxAmount;
      if (gigogneDuration) gigogneDuration.value = gigogne.duration;
      if (gigogneRate) gigogneRate.value = gigogne.rate;
      if (gigogneDurationValue) gigogneDurationValue.textContent = gigogne.duration;

      // Render gigogne fields visibility
      if (UI.renderGigogneFields) {
        UI.renderGigogneFields(gigogne.enabled);
      }

      // Initialize Primary Rate Override
      const primaryRateOverride = MortgageSimulator.getPrimaryRateOverride();
      const primaryRateInput = document.getElementById('primary-rate');
      if (primaryRateInput) {
        if (primaryRateOverride !== null) {
          primaryRateInput.value = primaryRateOverride;
        } else {
          // If no override, show interpolated rate
          const currentRate = MortgageSimulator.Formulas.interpolateRate(
            MortgageSimulator.getDuration(),
            MortgageSimulator.getRates()
          );
          primaryRateInput.value = currentRate;
        }
      }
      
      // Show summary tab by default
      UI.showTab('summary');
            
      console.log('✓ UI initialized');
    } catch (error) {
      console.error('Failed to initialize UI:', error);
      throw error;
    }
  };
  
  /**
   * Display console welcome message
   * Shows application info and available API methods
   */
  const showWelcomeMessage = () => {
    const version = '1.0.0';
    const app = '🏠 Mortgage Dynamic Simulator';
    
    console.log('%c' + app, 'color: #2563eb; font-size: 20px; font-weight: bold;');
    console.log('%cVersion ' + version, 'color: #16a34a; font-size: 12px;');
    console.log('');
    console.log('%c📚 Documentation', 'color: #ea580c; font-weight: bold;');
    console.log('This simulator helps you calculate mortgage capacity and visualize payment schedules.');
    console.log('');
    console.log('%c🔧 Available API:', 'color: #ea580c; font-weight: bold;');
    console.log('  MortgageSimulator.getState()           - Get complete state snapshot');
    console.log('  MortgageSimulator.toJSON()              - Export state as JSON');
    console.log('  MortgageSimulator.fromJSON(json)        - Import state from JSON');
    console.log('  MortgageSimulator.reset()               - Reset to defaults');
    console.log('  Events.recalculate()                    - Manually trigger recalculation');
    console.log('');
    console.log('%c✨ Ready to simulate!', 'color: #16a34a; font-weight: bold;');
    console.log('');
  };
  
  /**
   * Show user-friendly error message in UI
   * @param {string} message - Error message to display
   */
  const showErrorMessage = (message) => {
    // Try to find a suitable container for the error
    const resultsPanel = document.querySelector('.results-panel');
    const body = document.body;
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger m-3';
    errorDiv.setAttribute('role', 'alert');
    errorDiv.innerHTML = `
      <h4 class="alert-heading">Erreur d'initialisation</h4>
      <p>${message}</p>
      <hr>
      <p class="mb-0">Veuillez recharger la page. Si le problème persiste, consultez la console pour plus de détails.</p>
    `;
    
    if (resultsPanel) {
      resultsPanel.prepend(errorDiv);
    } else {
      body.prepend(errorDiv);
    }
  };
  
  /**
   * Main initialization function
   * Called on DOMContentLoaded
   */
  const init = () => {
    try {
      console.log('🚀 Initializing Mortgage Simulator...');
      
      // 1. Display welcome message
      showWelcomeMessage();
      
      // 2. Initialize default state
      initDefaultState();
      
      // 3. Initialize UI with defaults
      initializeUI();
      
      // 4. Bind all event handlers
      if (Events && Events.bindEvents) {
        Events.bindEvents();
        console.log('✓ Event handlers bound');
      } else {
        throw new Error('Events module not available or bindEvents not found');
      }
      
      // 5. Trigger initial calculation with defaults
      // Note: Events.bindEvents() already calls recalculate() at the end
      // So we don't need to call it again here
      
      console.log('✅ Mortgage Simulator initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Mortgage Simulator:', error);
      showErrorMessage('Une erreur est survenue lors du chargement de l\'application.');
      
      // Re-throw to ensure error is visible
      throw error;
    }
  };
  
  // ============================================
  // BOOTSTRAP ON DOM READY
  // ============================================
  
  // Wait for DOM to be fully loaded before initializing
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM already loaded, initialize immediately
    init();
  }
  
  // ============================================
  // PUBLIC API (Optional debugging/extension)
  // ============================================
  
  // Expose init to namespace for manual re-initialization if needed
  MortgageSimulator.init = init;
  
})();

// Export for ES6 modules (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MortgageSimulator;
}
