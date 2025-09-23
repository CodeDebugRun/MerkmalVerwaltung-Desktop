const { poolPromise, sql } = require('../db');
const { formatSuccess, formatError, formatValidationError } = require('../utils/responseFormatter');
const { validateMerkmalstexte, validateId } = require('../utils/validation');
const { withTransaction, createRequest } = require('../utils/transactionHelper');
const {
  bulkUpdatePositions,
  getNextAvailablePosition,
  getCurrentPosition
} = require('../utils/positionManager');

// Bulk position editing - Legacy merkmalsposition_edit.jsp functionality
const bulkUpdateMerkmalstextePositions = async (req, res, next) => {
  const { identnr, merkmal, newPosition } = req.body;
  
  // Validate required fields
  if (!identnr || !merkmal) {
    return res.status(400).json(formatValidationError(['Identnr und Merkmal sind erforderlich für Bulk-Position-Update']));
  }
  
  if (!newPosition || newPosition <= 0) {
    return res.status(400).json(formatValidationError(['Neue Position muss eine gültige Zahl größer 0 sein']));
  }
  
  try {
    const pool = await poolPromise;
    
    // Execute bulk position update within transaction
    await withTransaction(pool, async (transaction) => {
      await bulkUpdatePositions(transaction, identnr, merkmal, parseInt(newPosition));
    });
    
    res.status(200).json(formatSuccess(null, `Bulk-Position-Update erfolgreich für ${identnr}/${merkmal}`));
  } catch (err) {
    next(err);
  }
};

// Check for null ID records
const checkNullIds = async (req, res, next) => {
  
  try {
    const pool = await poolPromise;
    
    const result = await pool.request()
      .query(`
        SELECT *
        FROM merkmalstexte 
        WHERE id IS NULL
        ORDER BY identnr, merkmal
      `);
    
    
    if (result.recordset.length > 0) {
      result.recordset.forEach((record, index) => {
        console.log(`[${index + 1}] identnr: ${record.identnr}, merkmal: ${record.merkmal}`);
      });
    }
    
    const responseData = {
      nullIdRecords: result.recordset,
      count: result.recordset.length,
      hasNullIds: result.recordset.length > 0
    };
    
    res.status(200).json(formatSuccess(responseData, 
      result.recordset.length > 0 
        ? `${result.recordset.length} Datensätze mit NULL-ID gefunden`
        : 'Keine Datensätze mit NULL-ID gefunden'
    ));
  } catch (err) {
    next(err);
  }
};

// Check for duplicate Ident-Nr entries
const checkDuplicateIdentnrs = async (req, res, next) => {
  
  try {
    const pool = await poolPromise;
    
    const result = await pool.request()
      .query(`
        SELECT 
          identnr, 
          COUNT(*) as record_count,
          MIN(id) as first_id,
          MAX(id) as last_id
        FROM merkmalstexte 
        WHERE identnr IS NOT NULL 
        GROUP BY identnr
        HAVING COUNT(*) > 1
        ORDER BY record_count DESC, identnr
      `);
    
    
    if (result.recordset.length > 0) {
      result.recordset.forEach((record, index) => {
        console.log(`[${index + 1}] ${record.identnr}: ${record.record_count} kayıt - ID aralığı: ${record.first_id}-${record.last_id}`);
      });
    }
    
    // Tüm Ident-Nr'ların istatistiklerini de al
    const statsResult = await pool.request()
      .query(`
        SELECT 
          COUNT(DISTINCT identnr) as unique_identnrs,
          COUNT(*) as total_records,
          AVG(CAST(record_counts.record_count AS FLOAT)) as avg_records_per_identnr
        FROM (
          SELECT identnr, COUNT(*) as record_count
          FROM merkmalstexte 
          WHERE identnr IS NOT NULL 
          GROUP BY identnr
        ) as record_counts
      `);
    
    const stats = statsResult.recordset[0];
    
    const responseData = {
      duplicates: result.recordset,
      duplicateCount: result.recordset.length,
      hasDuplicates: result.recordset.length > 0,
      stats: {
        uniqueIdentnrs: stats.unique_identnrs,
        totalRecords: stats.total_records,
        duplicateIdentnrs: result.recordset.length,
        avgRecordsPerIdentnr: Math.round(stats.avg_records_per_identnr * 100) / 100
      }
    };
    
    res.status(200).json(formatSuccess(responseData, 
      result.recordset.length > 0 
        ? `${result.recordset.length} Ident-Nr mit mehreren Datensätzen gefunden`
        : 'Keine doppelten Ident-Nr gefunden - jede Ident-Nr hat nur einen Datensatz'
    ));
  } catch (err) {
    next(err);
  }
};

// Advanced filtering endpoint - Legacy merkmalstexte.jsp functionality

// Get grouped datasets for main listing - gruplandırılmış ana liste
const getGroupedMerkmalstexte = async (req, res, next) => {

  try {
    const pool = await poolPromise;

    // No backend pagination - return all grouped records

    // Get total count for pagination metadata (grouped data count)
    const countResult = await pool.request().query(`
      WITH GroupedData AS (
        SELECT
          merkmal, auspraegung, drucktext,
          merkmalsposition, maka,
          CASE
            WHEN sondermerkmal IS NULL OR LTRIM(RTRIM(sondermerkmal)) = ''
            THEN 'EMPTY'
            ELSE sondermerkmal
          END as normalized_sondermerkmal,
          CASE
            WHEN fertigungsliste IS NULL OR fertigungsliste = 0
            THEN 'EMPTY'
            ELSE CAST(fertigungsliste AS NVARCHAR)
          END as normalized_fertigungsliste
        FROM merkmalstexte
        GROUP BY
          merkmal, auspraegung, drucktext, merkmalsposition, maka,
          CASE
            WHEN sondermerkmal IS NULL OR LTRIM(RTRIM(sondermerkmal)) = ''
            THEN 'EMPTY'
            ELSE sondermerkmal
          END,
          CASE
            WHEN fertigungsliste IS NULL OR fertigungsliste = 0
            THEN 'EMPTY'
            ELSE CAST(fertigungsliste AS NVARCHAR)
          END
      )
      SELECT COUNT(*) as total FROM GroupedData
    `);
    const totalCount = countResult.recordset[0].total;


    // Get all grouped records without pagination
    const result = await pool.request()
      .query(`
        WITH GroupedData AS (
          SELECT
            merkmal, auspraegung, drucktext,
            merkmalsposition, maka,
            CASE
              WHEN sondermerkmal IS NULL OR LTRIM(RTRIM(sondermerkmal)) = ''
              THEN 'EMPTY'
              ELSE sondermerkmal
            END as normalized_sondermerkmal,
            CASE
              WHEN fertigungsliste IS NULL OR fertigungsliste = 0
              THEN 'EMPTY'
              ELSE CAST(fertigungsliste AS NVARCHAR)
            END as normalized_fertigungsliste,
            STRING_AGG(identnr, ',') as identnr_list,
            STRING_AGG(CAST(id AS NVARCHAR), ',') as id_list,
            COUNT(*) as record_count,
            MIN(id) as first_id
          FROM merkmalstexte
          GROUP BY
            merkmal, auspraegung, drucktext, merkmalsposition, maka,
            CASE
              WHEN sondermerkmal IS NULL OR LTRIM(RTRIM(sondermerkmal)) = ''
              THEN 'EMPTY'
              ELSE sondermerkmal
            END,
            CASE
              WHEN fertigungsliste IS NULL OR fertigungsliste = 0
              THEN 'EMPTY'
              ELSE CAST(fertigungsliste AS NVARCHAR)
            END
        )
        SELECT
          first_id,
          merkmal,
          auspraegung,
          drucktext,
          CASE WHEN normalized_sondermerkmal = 'EMPTY' THEN '' ELSE normalized_sondermerkmal END as sondermerkmal,
          CASE WHEN normalized_fertigungsliste = 'EMPTY' THEN 0 ELSE CAST(normalized_fertigungsliste AS INT) END as fertigungsliste,
          merkmalsposition,
          maka,
          identnr_list,
          id_list,
          record_count
        FROM GroupedData
        ORDER BY merkmal, auspraegung, drucktext
      `);


    // Map fields for frontend compatibility
    const recordsWithNewFields = result.recordset.map(record => ({
      id: record.first_id, // Use first ID as primary ID for frontend
      identnr: record.identnr_list, // All identnrs as comma-separated string (hidden in list)
      merkmal: record.merkmal,
      auspraegung: record.auspraegung,
      drucktext: record.drucktext,
      sondermerkmal: record.sondermerkmal || '',
      position: record.merkmalsposition,
      sonderAbt: record.maka,
      fertigungsliste: record.fertigungsliste || 0,
      // Hidden metadata for inline edit
      _groupData: {
        record_count: record.record_count,
        id_list: record.id_list,
        identnr_list: record.identnr_list
      }
    }));


    // Return data with pagination metadata
    const responseData = {
      data: recordsWithNewFields,
      totalCount: totalCount
    };

    res.status(200).json(formatSuccess(responseData, `${totalCount} gruplandırılmış kayıt erfolgreich abgerufen`));
  } catch (err) {
    next(err);
  }
};


// Update grouped records - updates all records in the group
const updateGroupedMerkmalstexte = async (req, res, next) => {
  try {
    const {
      originalData,  // Original group data to identify which records to update
      newData,       // New data to update with
      identnrs       // Array of identnrs that should be in this group
    } = req.body;


    const pool = await poolPromise;

    // Start a transaction
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // First, delete all existing records for this group
      await transaction.request()
        .input('merkmal', sql.NVarChar, originalData.merkmal)
        .input('auspraegung', sql.NVarChar, originalData.auspraegung)
        .input('drucktext', sql.NVarChar, originalData.drucktext)
        .input('sondermerkmal', sql.NVarChar, originalData.sondermerkmal || '')
        .input('position', sql.Int, originalData.position)
        .input('sonderAbt', sql.Int, originalData.sonderAbt)
        .input('fertigungsliste', sql.Int, originalData.fertigungsliste)
        .query(`
          DELETE FROM merkmalstexte
          WHERE merkmal = @merkmal
            AND auspraegung = @auspraegung
            AND drucktext = @drucktext
            AND ISNULL(sondermerkmal, '') = @sondermerkmal
            AND merkmalsposition = @position
            AND maka = @sonderAbt
            AND fertigungsliste = @fertigungsliste
        `);

      // Then insert new records for each identnr
      for (const identnr of identnrs) {
        await transaction.request()
          .input('identnr', sql.NVarChar, identnr)
          .input('merkmal', sql.NVarChar, newData.merkmal)
          .input('auspraegung', sql.NVarChar, newData.auspraegung)
          .input('drucktext', sql.NVarChar, newData.drucktext)
          .input('sondermerkmal', sql.NVarChar, newData.sondermerkmal || '')
          .input('position', sql.Int, newData.position || 0)
          .input('sonderAbt', sql.Int, newData.sonderAbt || 0)
          .input('fertigungsliste', sql.Int, newData.fertigungsliste || 0)
          .query(`
            INSERT INTO merkmalstexte (
              identnr, merkmal, auspraegung, drucktext,
              sondermerkmal, merkmalsposition, maka, fertigungsliste
            ) VALUES (
              @identnr, @merkmal, @auspraegung, @drucktext,
              @sondermerkmal, @position, @sonderAbt, @fertigungsliste
            )
          `);
      }

      await transaction.commit();

      res.json({
        success: true,
        message: `${identnrs.length} Datensätze erfolgreich aktualisiert`,
        timestamp: new Date().toISOString()
      });

    } catch (innerErr) {
      await transaction.rollback();
      throw innerErr;
    }

  } catch (err) {
    console.error('❌ [ERROR] updateGroupedMerkmalstexte error:', err);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Gruppendaten',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
};


// Copy group data for replication - get all records that match group criteria
const copyGroupData = async (req, res, next) => {
  const { merkmal, auspraegung, drucktext, sondermerkmal } = req.body;

  // Validate required fields
  if (!merkmal || !auspraegung || !drucktext) {
    return res.status(400).json(formatValidationError(['Merkmal, Auspraegung und Drucktext sind erforderlich']));
  }

  try {
    const pool = await poolPromise;

    // Build WHERE clause for group matching
    let whereClause = 'merkmal = @merkmal AND auspraegung = @auspraegung AND drucktext = @drucktext';

    const request = pool.request()
      .input('merkmal', sql.NVarChar, merkmal)
      .input('auspraegung', sql.NVarChar, auspraegung)
      .input('drucktext', sql.NVarChar, drucktext);

    console.log('🔍 Copy Group Debug:', { merkmal, auspraegung, drucktext, sondermerkmal });

    // Handle sondermerkmal (can be null, empty, or actual value) - match grouped query logic
    if (sondermerkmal === null || sondermerkmal === undefined || sondermerkmal === '' || sondermerkmal === 'EMPTY') {
      whereClause += ' AND (sondermerkmal IS NULL OR LTRIM(RTRIM(sondermerkmal)) = \'\')';
    } else {
      whereClause += ' AND sondermerkmal = @sondermerkmal';
      request.input('sondermerkmal', sql.NVarChar, sondermerkmal);
    }

    const result = await request.query(`
      SELECT
        identnr, merkmal, auspraegung, drucktext, sondermerkmal,
        merkmalsposition, maka, fertigungsliste
      FROM merkmalstexte
      WHERE ${whereClause}
      ORDER BY identnr, merkmalsposition
    `);

    const groupData = result.recordset;

    if (groupData.length === 0) {
      return res.status(404).json(formatError('Keine Datensätze für diese Gruppenkombination gefunden'));
    }

    // Return copyable group template data
    const copyableData = {
      merkmal: groupData[0].merkmal,
      auspraegung: groupData[0].auspraegung,
      drucktext: groupData[0].drucktext,
      sondermerkmal: groupData[0].sondermerkmal,
      maka: groupData[0].maka,
      fertigungsliste: groupData[0].fertigungsliste,
      recordCount: groupData.length,
      identnrList: [...new Set(groupData.map(r => r.identnr))].sort()
    };

    res.status(200).json(formatSuccess(copyableData, `Gruppendaten erfolgreich kopiert (${groupData.length} Datensätze)`));
  } catch (err) {
    next(err);
  }
};

// Create new group based on copied data
const createGroupFromCopy = async (req, res, next) => {
  const {
    merkmal, auspraegung, drucktext, sondermerkmal,
    maka, fertigungsliste, identnrList, merkmalsposition
  } = req.body;

  // Validate required fields
  if (!merkmal || !auspraegung || !drucktext || !identnrList || !Array.isArray(identnrList)) {
    return res.status(400).json(formatValidationError([
      'Merkmal, Auspraegung, Drucktext und IdentnrList sind erforderlich'
    ]));
  }

  if (identnrList.length === 0) {
    return res.status(400).json(formatValidationError(['IdentnrList darf nicht leer sein']));
  }

  try {
    const pool = await poolPromise;

    // Use position 0 if not provided
    const finalPosition = merkmalsposition ? parseInt(merkmalsposition) : 0;

    const result = await withTransaction(pool, async (transaction) => {
      const createdRecords = [];

      // Create one record for each identnr in the list
      for (const identnr of identnrList) {
        if (!identnr || identnr.trim() === '') {
          continue; // Skip empty identnr values
        }

        const request = createRequest(transaction);
        const insertResult = await request
          .input('identnr', sql.NVarChar, identnr.trim())
          .input('merkmal', sql.NVarChar, merkmal)
          .input('auspraegung', sql.NVarChar, auspraegung)
          .input('drucktext', sql.NVarChar, drucktext)
          .input('sondermerkmal', sql.NVarChar, (sondermerkmal === 'EMPTY' || !sondermerkmal) ? '' : sondermerkmal)
          .input('merkmalsposition', sql.Int, finalPosition)
          .input('maka', sql.Int, maka || 0)
          .input('fertigungsliste', sql.Int, fertigungsliste || 0)
          .query(`
            INSERT INTO merkmalstexte (identnr, merkmal, auspraegung, drucktext, sondermerkmal, merkmalsposition, maka, fertigungsliste)
            VALUES (@identnr, @merkmal, @auspraegung, @drucktext, @sondermerkmal, @merkmalsposition, @maka, @fertigungsliste);
            SELECT * FROM merkmalstexte WHERE id = SCOPE_IDENTITY()
          `);

        if (insertResult.recordset && insertResult.recordset.length > 0) {
          createdRecords.push(insertResult.recordset[0]);
        }
      }

      return createdRecords;
    });

    res.status(201).json(formatSuccess({
      createdRecords: result,
      recordCount: result.length,
      groupInfo: { merkmal, auspraegung, drucktext, sondermerkmal }
    }, `${result.length} neue Datensätze aus kopierten Gruppendaten erstellt`));

  } catch (err) {
    next(err);
  }
};

module.exports = {
  bulkUpdateMerkmalstextePositions,
  getGroupedMerkmalstexte,
  updateGroupedMerkmalstexte,
  checkNullIds,
  checkDuplicateIdentnrs,
  copyGroupData,
  createGroupFromCopy
};