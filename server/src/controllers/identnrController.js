const { poolPromise, sql } = require('../db');
const { formatSuccess, formatError, formatValidationError } = require('../utils/responseFormatter');
const { validateMerkmalstexte, validateId } = require('../utils/validation');
const { withTransaction, createRequest } = require('../utils/transactionHelper');
const {
  getNextAvailablePosition
} = require('../utils/positionManager');

// Get all unique Ident-Nr values (simple list)
const getAllIdentnrs = async (req, res, next) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .query(`
        SELECT DISTINCT identnr
        FROM merkmalstexte
        WHERE identnr IS NOT NULL
        ORDER BY identnr
      `);

    const identnrs = result.recordset.map(record => record.identnr);

    res.status(200).json(formatSuccess(identnrs,
      `${identnrs.length} eindeutige Ident-Nr erfolgreich abgerufen`));
  } catch (err) {
    next(err);
  }
};

// Get count of unique Ident-Nr values with statistics
const getIdentnrCount = async (req, res, next) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .query(`
        SELECT
          COUNT(DISTINCT identnr) as unique_identnr_count,
          COUNT(*) as total_records
        FROM merkmalstexte
        WHERE identnr IS NOT NULL
      `);

    const stats = result.recordset[0];

    const responseData = {
      uniqueIdentnrs: stats.unique_identnr_count,
      totalRecords: stats.total_records,
      avgRecordsPerIdentnr: Math.round(stats.total_records / stats.unique_identnr_count * 100) / 100
    };

    res.status(200).json(formatSuccess(responseData,
      `${stats.unique_identnr_count} eindeutige Ident-Nr gefunden (${stats.total_records} Datensätze insgesamt)`));
  } catch (err) {
    next(err);
  }
};

// Get all records by Ident-Nr with field mapping
const getMerkmalstexteByIdentnr = async (req, res, next) => {
  const { identnr } = req.params;

  if (!identnr) {
    return res.status(400).json(formatValidationError(['Ident-Nr ist erforderlich']));
  }

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('identnr', sql.VarChar, identnr)
      .query(`
        SELECT * FROM merkmalstexte
        WHERE identnr = @identnr
        ORDER BY merkmalsposition, merkmal
      `);

    // Field mapping for frontend compatibility
    const recordsWithMappedFields = result.recordset.map(record => ({
      ...record,
      position: record.merkmalsposition,
      sonderAbt: record.maka,
      fertigungsliste: record.fertigungsliste
    }));

    res.status(200).json(formatSuccess(recordsWithMappedFields,
      `${result.recordset.length} Datensätze für Ident-Nr ${identnr} gefunden`));
  } catch (err) {
    next(err);
  }
};

// Create new record for specific Ident-Nr with advanced position management
const createMerkmalstextForIdentnr = async (req, res, next) => {
  const { identnr } = req.params;

  if (!identnr) {
    return res.status(400).json(formatValidationError(['Ident-Nr ist erforderlich']));
  }

  const { merkmal, auspraegung, drucktext, sondermerkmal, position, sonderAbt, fertigungsliste } = req.body;

  // Validate input data (identnr from params)
  const dataToValidate = { identnr, merkmal, auspraegung, drucktext, sondermerkmal, position, sonderAbt, fertigungsliste };
  const validation = validateMerkmalstexte(dataToValidate);
  if (!validation.isValid) {
    return res.status(400).json(formatValidationError(validation.errors));
  }

  try {
    const pool = await poolPromise;

    // Check for exact duplicate combination
    const duplicateCheck = await pool.request()
      .input('identnr', sql.NVarChar, identnr)
      .input('merkmal', sql.NVarChar, merkmal)
      .input('auspraegung', sql.NVarChar, auspraegung)
      .input('drucktext', sql.NVarChar, drucktext)
      .query(`
        SELECT COUNT(*) as count
        FROM merkmalstexte
        WHERE identnr = @identnr
          AND merkmal = @merkmal
          AND auspraegung = @auspraegung
          AND drucktext = @drucktext
      `);

    if (duplicateCheck.recordset[0].count > 0) {
      return res.status(400).json(formatValidationError([
        `Datensatz existiert bereits: Ident-Nr "${identnr}" mit der exakten Kombination Merkmal "${merkmal}", Ausprägung "${auspraegung}" und Drucktext "${drucktext}"`
      ]));
    }

    // Position logic: use provided position or default to 0
    let finalPosition = position ? parseInt(position) : 0;

    // Execute within transaction for data integrity
    const result = await withTransaction(pool, async (transaction) => {

      const request = createRequest(transaction);

      return await request
        .input('identnr', sql.VarChar, identnr)
        .input('merkmal', sql.VarChar, merkmal)
        .input('auspraegung', sql.VarChar, auspraegung)
        .input('drucktext', sql.VarChar, drucktext)
        .input('sondermerkmal', sql.VarChar, sondermerkmal || '')
        .input('merkmalsposition', sql.Int, finalPosition)
        .input('maka', sql.Int, sonderAbt ? parseInt(sonderAbt) : null)
        .input('fertigungsliste', sql.Int, fertigungsliste ? parseInt(fertigungsliste) : null)
        .query(`
          INSERT INTO merkmalstexte (identnr, merkmal, auspraegung, drucktext, sondermerkmal, merkmalsposition, maka, fertigungsliste)
          VALUES (@identnr, @merkmal, @auspraegung, @drucktext, @sondermerkmal, @merkmalsposition, @maka, @fertigungsliste);
          SELECT * FROM merkmalstexte WHERE id = SCOPE_IDENTITY()
        `);
    });

    // Field mapping for frontend
    const record = result.recordset[0];
    const createdRecord = {
      ...record,
      position: record.merkmalsposition || null,
      sonderAbt: record.maka || null,
      fertigungsliste: record.fertigungsliste || null
    };

    res.status(201).json(formatSuccess(createdRecord, `Datensatz für Ident-Nr ${identnr} erfolgreich erstellt`));
  } catch (err) {
    next(err);
  }
};

// Delete all records for specific Ident-Nr with transaction support
const deleteMerkmalstexteByIdentnr = async (req, res, next) => {
  const { identnr } = req.params;

  if (!identnr) {
    return res.status(400).json(formatValidationError(['Ident-Nr ist erforderlich']));
  }

  try {
    const pool = await poolPromise;

    // Execute within transaction for data integrity
    const result = await withTransaction(pool, async (transaction) => {
      const request = createRequest(transaction);

      // Delete all records with this identnr
      const deleteResult = await request
        .input('identnr', sql.VarChar, identnr)
        .query('DELETE FROM merkmalstexte WHERE identnr = @identnr');

      return deleteResult;
    });

    const deletedCount = result.rowsAffected[0];

    if (deletedCount === 0) {
      return res.status(404).json(formatError(`Keine Datensätze für Ident-Nr ${identnr} gefunden`));
    }

    res.status(200).json(formatSuccess(
      { deletedCount },
      `${deletedCount} Datensätze für Ident-Nr ${identnr} erfolgreich gelöscht`
    ));
  } catch (err) {
    next(err);
  }
};

// Add new custom Ident-Nr to database with placeholder record
const addCustomIdentnr = async (req, res, next) => {
  const { identnr } = req.body;

  // Validate input
  if (!identnr || !identnr.trim()) {
    return res.status(400).json(formatValidationError(['Ident-Nr ist erforderlich']));
  }

  const trimmedIdentnr = identnr.trim();

  try {
    const pool = await poolPromise;

    // Check if identnr already exists
    const existsResult = await pool.request()
      .input('identnr', sql.VarChar, trimmedIdentnr)
      .query('SELECT COUNT(*) as count FROM merkmalstexte WHERE identnr = @identnr');

    const alreadyExists = existsResult.recordset[0].count > 0;

    if (alreadyExists) {
      return res.status(200).json(formatSuccess(
        { identnr: trimmedIdentnr, existed: true },
        `Ident-Nr ${trimmedIdentnr} existiert bereits`
      ));
    }

    // Create a placeholder record with minimal data to register the identnr
    const result = await withTransaction(pool, async (transaction) => {
      // Get next available position
      let finalPosition = await getNextAvailablePosition(pool);

      const request = createRequest(transaction);

      return await request
        .input('identnr', sql.VarChar, trimmedIdentnr)
        .input('merkmal', sql.VarChar, 'PLACEHOLDER')
        .input('auspraegung', sql.VarChar, 'PLACEHOLDER')
        .input('drucktext', sql.VarChar, 'PLACEHOLDER - Bitte bearbeiten')
        .input('sondermerkmal', sql.VarChar, '')
        .input('merkmalsposition', sql.Int, finalPosition)
        .input('maka', sql.Int, null)
        .input('fertigungsliste', sql.Int, 0)
        .query(`
          INSERT INTO merkmalstexte (identnr, merkmal, auspraegung, drucktext, sondermerkmal, merkmalsposition, maka, fertigungsliste)
          VALUES (@identnr, @merkmal, @auspraegung, @drucktext, @sondermerkmal, @merkmalsposition, @maka, @fertigungsliste);
          SELECT * FROM merkmalstexte WHERE id = SCOPE_IDENTITY()
        `);
    });

    const createdRecord = result.recordset[0];

    res.status(201).json(formatSuccess({
      identnr: trimmedIdentnr,
      existed: false,
      placeholderRecord: {
        ...createdRecord,
        position: createdRecord.merkmalsposition,
        sonderAbt: createdRecord.maka,
        fertigungsliste: createdRecord.fertigungsliste
      }
    }, `Neue Ident-Nr ${trimmedIdentnr} erfolgreich hinzugefügt (Platzhalter-Datensatz erstellt)`));
  } catch (err) {
    next(err);
  }
};

// Clone all records from source identnr to target identnr (existing function kept)
const cloneIdentnr = async (req, res, next) => {
  const { sourceIdentnr, targetIdentnr } = req.body;

  // Validate required fields
  if (!sourceIdentnr || !targetIdentnr) {
    return res.status(400).json(formatValidationError(['Source Identnr und Target Identnr sind erforderlich']));
  }

  if (sourceIdentnr === targetIdentnr) {
    return res.status(400).json(formatValidationError(['Source und Target Identnr dürfen nicht identisch sein']));
  }

  try {
    const pool = await poolPromise;

    // Check if target identnr already has records
    const checkResult = await pool.request()
      .input('targetIdentnr', sql.NVarChar, targetIdentnr)
      .query('SELECT COUNT(*) as count FROM merkmalstexte WHERE identnr = @targetIdentnr');

    if (checkResult.recordset[0].count > 0) {
      return res.status(400).json(formatError(`Target Identnr "${targetIdentnr}" hat bereits Datensätze. Bitte wählen Sie eine andere Identnr.`));
    }

    // Get all records from source identnr
    const sourceResult = await pool.request()
      .input('sourceIdentnr', sql.NVarChar, sourceIdentnr)
      .query(`
        SELECT merkmal, auspraegung, drucktext, sondermerkmal, merkmalsposition, maka, fertigungsliste
        FROM merkmalstexte
        WHERE identnr = @sourceIdentnr
        ORDER BY merkmalsposition
      `);

    if (sourceResult.recordset.length === 0) {
      return res.status(404).json(formatError(`Source Identnr "${sourceIdentnr}" nicht gefunden oder hat keine Datensätze`));
    }

    // Clone all records to target identnr in a transaction
    const result = await withTransaction(pool, async (transaction) => {
      const clonedRecords = [];

      for (const record of sourceResult.recordset) {
        const request = createRequest(transaction);
        const insertResult = await request
          .input('targetIdentnr', sql.NVarChar, targetIdentnr)
          .input('merkmal', sql.NVarChar, record.merkmal)
          .input('auspraegung', sql.NVarChar, record.auspraegung)
          .input('drucktext', sql.NVarChar, record.drucktext)
          .input('sondermerkmal', sql.NVarChar, record.sondermerkmal || '')
          .input('merkmalsposition', sql.Int, record.merkmalsposition)
          .input('maka', sql.Int, record.maka || 0)
          .input('fertigungsliste', sql.Int, record.fertigungsliste || 0)
          .query(`
            INSERT INTO merkmalstexte (identnr, merkmal, auspraegung, drucktext, sondermerkmal, merkmalsposition, maka, fertigungsliste)
            VALUES (@targetIdentnr, @merkmal, @auspraegung, @drucktext, @sondermerkmal, @merkmalsposition, @maka, @fertigungsliste);
            SELECT * FROM merkmalstexte WHERE id = SCOPE_IDENTITY()
          `);

        if (insertResult.recordset && insertResult.recordset.length > 0) {
          const clonedRecord = insertResult.recordset[0];
          clonedRecords.push({
            ...clonedRecord,
            position: clonedRecord.merkmalsposition,
            sonderAbt: clonedRecord.maka,
            fertigungsliste: clonedRecord.fertigungsliste
          });
        }
      }

      return clonedRecords;
    });

    res.status(201).json(formatSuccess({
      sourceIdentnr,
      targetIdentnr,
      clonedRecords: result,
      recordCount: result.length
    }, `${result.length} Datensätze erfolgreich von "${sourceIdentnr}" zu "${targetIdentnr}" geklont`));

  } catch (err) {
    next(err);
  }
};

// Copy record to multiple Ident-Nr values
const copyRecordToMultipleIdentnrs = async (req, res, next) => {
  const { id } = req.params;
  const { identnrs } = req.body;

  // Validate ID
  const idValidation = validateId(id);
  if (!idValidation.isValid) {
    return res.status(400).json(formatValidationError(idValidation.errors));
  }

  // Validate identnrs array
  if (!identnrs || !Array.isArray(identnrs) || identnrs.length === 0) {
    return res.status(400).json(formatValidationError(['Ident-Nr array ist erforderlich und darf nicht leer sein']));
  }

  try {
    const pool = await poolPromise;

    // Get original record
    const originalResult = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('SELECT * FROM merkmalstexte WHERE id = @id');

    if (originalResult.recordset.length === 0) {
      return res.status(404).json(formatError('Original Datensatz nicht gefunden'));
    }

    const originalRecord = originalResult.recordset[0];

    // Execute within transaction for data integrity
    const results = await withTransaction(pool, async (transaction) => {
      const createdRecords = [];

      // Use original record's position for all copies
      const originalPosition = originalRecord.merkmalsposition || 0;

      for (const targetIdentnr of identnrs) {
        // Skip if it's the same as original
        if (targetIdentnr === originalRecord.identnr) {
          continue;
        }

        // Check for exact duplicate before copying
        const duplicateRequest = createRequest(transaction);
        const duplicateCheck = await duplicateRequest
          .input('identnr', sql.VarChar, targetIdentnr)
          .input('merkmal', sql.VarChar, originalRecord.merkmal)
          .input('auspraegung', sql.VarChar, originalRecord.auspraegung)
          .input('drucktext', sql.VarChar, originalRecord.drucktext)
          .query(`
            SELECT COUNT(*) as count
            FROM merkmalstexte
            WHERE identnr = @identnr
              AND merkmal = @merkmal
              AND auspraegung = @auspraegung
              AND drucktext = @drucktext
          `);

        if (duplicateCheck.recordset[0].count > 0) {
          console.log(`⚠️ Skipping duplicate during copy: ${targetIdentnr} - ${originalRecord.merkmal}/${originalRecord.auspraegung}/${originalRecord.drucktext}`);
          continue; // Skip this record, continue with next
        }

        const request = createRequest(transaction);

        const result = await request
          .input('identnr', sql.VarChar, targetIdentnr)
          .input('merkmal', sql.VarChar, originalRecord.merkmal)
          .input('auspraegung', sql.VarChar, originalRecord.auspraegung)
          .input('drucktext', sql.VarChar, originalRecord.drucktext)
          .input('sondermerkmal', sql.VarChar, originalRecord.sondermerkmal || '')
          .input('merkmalsposition', sql.Int, originalPosition)
          .input('maka', sql.Int, originalRecord.maka)
          .input('fertigungsliste', sql.Int, originalRecord.fertigungsliste)
          .query(`
            INSERT INTO merkmalstexte (identnr, merkmal, auspraegung, drucktext, sondermerkmal, merkmalsposition, maka, fertigungsliste)
            VALUES (@identnr, @merkmal, @auspraegung, @drucktext, @sondermerkmal, @merkmalsposition, @maka, @fertigungsliste);
            SELECT * FROM merkmalstexte WHERE id = SCOPE_IDENTITY()
          `);

        if (result.recordset.length > 0) {
          const newRecord = result.recordset[0];
          createdRecords.push({
            ...newRecord,
            position: newRecord.merkmalsposition,
            sonderAbt: newRecord.maka,
            fertigungsliste: newRecord.fertigungsliste
          });
        }
      }

      return createdRecords;
    });

    res.status(201).json(formatSuccess({
      originalRecord: {
        ...originalRecord,
        position: originalRecord.merkmalsposition,
        sonderAbt: originalRecord.maka,
        fertigungsliste: originalRecord.fertigungsliste
      },
      createdRecords: results,
      copiedToIdentnrs: identnrs.filter(identnr => identnr !== originalRecord.identnr)
    }, `Datensatz in ${results.length} neue Ident-Nr kopiert`));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllIdentnrs,
  getIdentnrCount,
  getMerkmalstexteByIdentnr,
  createMerkmalstextForIdentnr,
  deleteMerkmalstexteByIdentnr,
  addCustomIdentnr,
  cloneIdentnr,
  copyRecordToMultipleIdentnrs
};