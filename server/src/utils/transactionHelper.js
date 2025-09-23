/**
 * Database transaction helper utilities
 * Provides transaction management for database operations
 */

const { sql } = require('../db');

/**
 * Execute a function within a database transaction
 * @param {Object} pool - Database connection pool
 * @param {Function} operation - Function to execute within transaction
 * @returns {Promise} - Result of the operation
 */
const withTransaction = async (pool, operation) => {
  const transaction = new sql.Transaction(pool);
  
  try {
    await transaction.begin();
    
    // Execute the operation with the transaction
    const result = await operation(transaction);
    
    await transaction.commit();
    return result;
    
  } catch (err) {
    try {
      await transaction.rollback();
      console.log('🔄 Transaktion erfolgreich zurückgesetzt');
    } catch (rollbackErr) {
      console.error('❌ Fehler beim Zurücksetzen der Transaktion:', rollbackErr.message);
    }
    
    // Re-throw the original error
    throw err;
  }
};

/**
 * Helper to create a new request from transaction
 * @param {Object} transaction - SQL transaction object
 * @returns {Object} - SQL request object
 */
const createRequest = (transaction) => {
  return new sql.Request(transaction);
};

module.exports = {
  withTransaction,
  createRequest
};