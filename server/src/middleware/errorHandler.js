/**
 * Global error handling middleware
 * Provides standardized error responses
 */

const { formatError } = require('../utils/responseFormatter');

const errorHandler = (err, req, res, next) => {
  // Log error details for debugging
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Default error values
  let status = err.status || err.statusCode || 500;
  let message = 'Ein unerwarteter Fehler ist aufgetreten';

  // Handle specific error types
  if (err.code === 'EREQUEST') {
    // SQL Server errors
    status = 400;
    message = 'Datenbankfehler: Ungültige Anfrage';
  } else if (err.code === 'ECONNCLOSED') {
    // Connection closed errors
    status = 500;
    message = 'Datenbankverbindung unterbrochen';
  } else if (err.code === 'ETIMEOUT') {
    // Timeout errors
    status = 408;
    message = 'Anfrage-Zeitüberschreitung';
  } else if (err.message && err.message !== 'Internal server error') {
    // Use custom error message if available
    message = err.message;
  }

  // Don't expose sensitive information in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const errorResponse = formatError(message);
  
  if (isDevelopment) {
    errorResponse.debug = {
      stack: err.stack,
      code: err.code,
      originalMessage: err.message
    };
  }

  res.status(status).json(errorResponse);
};

module.exports = errorHandler;