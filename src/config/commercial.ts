/**
 * TechProyect Commercial Policy Constants (v1.0)
 */

export const COMMERCIAL_CONFIG = {
    // Taxation
    DEFAULT_VAT_RATE: 0.19,
    
    // Payments & Collection
    DEFAULT_PAYMENT_TERMS_DAYS: 30,
    YELLOW_THRESHOLD_DAYS: 7,
    RED_THRESHOLD_DAYS: 0,
    
    // Currencies
    BASE_CURRENCY: 'CLP',
    SUPPORTED_CURRENCIES: ['CLP', 'USD', 'UF'],
    
    // FX Policy
    DEFAULT_DOLLAR_SURCHARGE: 5.0, // Fixed surcharge for risk
    
    // Project Defaults
    DEFAULT_MARGIN_PCT: 0.30,
    
    // Pagination
    ITEMS_PER_PAGE: 12
};
