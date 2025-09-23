/**
 * Standardized API response formatter
 * Provides consistent response structure across all endpoints
 */

const formatResponse = (success, data = null, message = null, errors = null) => {
  const response = {
    success,
    timestamp: new Date().toISOString()
  };

  if (data !== null) {
    response.data = data;
  }

  if (message) {
    response.message = message;
  }

  if (errors && errors.length > 0) {
    response.errors = errors;
  }

  return response;
};

const formatSuccess = (data = null, message = 'Vorgang erfolgreich') => {
  return formatResponse(true, data, message);
};

const formatError = (message = 'Vorgang fehlgeschlagen', errors = null) => {
  return formatResponse(false, null, message, errors);
};

const formatValidationError = (errors) => {
  return formatResponse(false, null, 'Validierung fehlgeschlagen', errors);
};

module.exports = {
  formatResponse,
  formatSuccess,
  formatError,
  formatValidationError
};