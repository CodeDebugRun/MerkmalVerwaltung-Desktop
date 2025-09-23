// Centralized Error Handling Utilities

// Error types for consistent handling
export const ERROR_TYPES = {
  NETWORK: 'network',
  API: 'api',
  VALIDATION: 'validation',
  UNKNOWN: 'unknown'
};

// Error messages mapping
export const ERROR_MESSAGES = {
  [ERROR_TYPES.NETWORK]: '⚠️ Demo-Modus: Verwende Testdaten (Server nicht erreichbar)',
  [ERROR_TYPES.API]: '⚠️ Demo-Modus: Verwende Testdaten (Database nicht verfügbar)',
  [ERROR_TYPES.VALIDATION]: '❌ Ungültige Eingabedaten',
  [ERROR_TYPES.UNKNOWN]: '❌ Ein unbekannter Fehler ist aufgetreten'
};

/**
 * Determines error type based on error object
 * @param {Error} error - The error object
 * @returns {string} Error type from ERROR_TYPES
 */
export const getErrorType = (error) => {
  if (!error) return ERROR_TYPES.UNKNOWN;

  const message = error.message?.toLowerCase() || '';

  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return ERROR_TYPES.NETWORK;
  }

  if (message.includes('api') || message.includes('server') || message.includes('database')) {
    return ERROR_TYPES.API;
  }

  if (message.includes('validation') || message.includes('invalid')) {
    return ERROR_TYPES.VALIDATION;
  }

  return ERROR_TYPES.UNKNOWN;
};

/**
 * Gets user-friendly error message based on error type
 * @param {Error} error - The error object
 * @param {string} customMessage - Optional custom message
 * @returns {string} User-friendly error message
 */
export const getErrorMessage = (error, customMessage = null) => {
  if (customMessage) return customMessage;

  const errorType = getErrorType(error);
  return ERROR_MESSAGES[errorType];
};

/**
 * Logs error with context information
 * @param {Error} error - The error object
 * @param {string} context - Context where error occurred
 * @param {Object} additionalData - Additional data to log
 */
export const logError = (error, context = 'Unknown', additionalData = {}) => {
  const logData = {
    context,
    message: error?.message || 'Unknown error',
    stack: error?.stack,
    timestamp: new Date().toISOString(),
    ...additionalData
  };

  console.error(`[${context}] Error:`, logData);
};

/**
 * Complete error handling utility
 * @param {Error} error - The error object
 * @param {Object} options - Configuration options
 * @param {Function} options.setError - Error state setter
 * @param {Function} options.setLoading - Loading state setter
 * @param {string} options.context - Context for logging
 * @param {any} options.fallbackData - Fallback data to set
 * @param {Function} options.setData - Data state setter
 * @param {string} options.customMessage - Custom error message
 * @param {boolean} options.showFallback - Whether to show fallback data
 */
export const handleError = (error, options = {}) => {
  const {
    setError,
    setLoading,
    context = 'API Call',
    fallbackData = null,
    setData,
    customMessage,
    showFallback = true
  } = options;

  // Log error with context
  logError(error, context);

  // Set loading to false if provided
  if (setLoading) {
    setLoading(false);
  }

  // Set error message if provided
  if (setError) {
    const errorMessage = getErrorMessage(error, customMessage);
    setError(errorMessage);
  }

  // Set fallback data if provided and enabled
  if (showFallback && setData && fallbackData !== null) {
    setData(fallbackData);
  }
};

/**
 * Async wrapper that handles errors automatically
 * @param {Function} asyncFn - Async function to execute
 * @param {Object} errorOptions - Error handling options
 * @returns {Promise} Promise that resolves with result or handles error
 */
export const withErrorHandling = async (asyncFn, errorOptions = {}) => {
  const { setLoading } = errorOptions;

  try {
    if (setLoading) setLoading(true);
    const result = await asyncFn();
    return { success: true, data: result };
  } catch (error) {
    handleError(error, errorOptions);
    return { success: false, error };
  } finally {
    if (setLoading) setLoading(false);
  }
};