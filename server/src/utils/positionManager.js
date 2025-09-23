/**
 * Position management utilities for merkmalstexte
 * Replicates legacy JSP system position shifting logic
 */

const { sql } = require('../db');




/**
 * Bulk update positions for records with same identnr + merkmal
 * Replicates legacy merkmalsposition_edit.jsp functionality
 */
const bulkUpdatePositions = async (transaction, identnr, merkmal, newPosition) => {
  const request = new sql.Request(transaction);
  
  // Get all records with this identnr + merkmal
  const existingRecords = await request
    .input('identnr', sql.VarChar, identnr)
    .input('merkmal', sql.VarChar, merkmal)
    .query(`
      SELECT id, merkmalsposition 
      FROM merkmalstexte 
      WHERE identnr = @identnr AND merkmal = @merkmal
      ORDER BY merkmalsposition
    `);

  if (existingRecords.recordset.length === 0) {
    return;
  }

  // Position shifting disabled - allow duplicate positions for bulk updates
  if (newPosition && newPosition > 0) {
    
    // Update all records with same identnr + merkmal to sequential positions
    for (let i = 0; i < existingRecords.recordset.length; i++) {
      const record = existingRecords.recordset[i];
      const assignedPosition = newPosition + i;
      
      const updateRequest = new sql.Request(transaction);
      await updateRequest
        .input('id', sql.Int, record.id)
        .input('position', sql.Int, assignedPosition)
        .query(`
          UPDATE merkmalstexte 
          SET merkmalsposition = @position 
          WHERE id = @id
        `);
    }
    
    console.log(`🔄 Bulk-Update: ${existingRecords.recordset.length} Datensätze für ${identnr}/${merkmal} ab Position ${newPosition}`);
  }
};

/**
 * Get next available position
 * Ensures proper position assignment
 */
const getNextAvailablePosition = async (pool) => {
  const request = new sql.Request(pool);
  
  const result = await request.query(`
    SELECT ISNULL(MAX(merkmalsposition), 0) + 1 as nextPosition 
    FROM merkmalstexte
  `);
  
  return result.recordset[0].nextPosition;
};

/**
 * Get current position of a record
 */
const getCurrentPosition = async (pool, recordId) => {
  const request = new sql.Request(pool);
  
  const result = await request
    .input('id', sql.Int, recordId)
    .query(`
      SELECT merkmalsposition 
      FROM merkmalstexte 
      WHERE id = @id
    `);
    
  return result.recordset.length > 0 ? result.recordset[0].merkmalsposition : null;
};


module.exports = {
  bulkUpdatePositions,
  getNextAvailablePosition,
  getCurrentPosition
};