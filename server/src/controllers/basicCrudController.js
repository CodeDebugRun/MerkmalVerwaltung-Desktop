const { poolPromise, sql } = require('../db');
const { formatSuccess, formatError, formatValidationError } = require('../utils/responseFormatter');
const { validateMerkmalstexte, validateId } = require('../utils/validation');
const { bulkUpdatePositions, getCurrentPosition } = require('../utils/positionManager');

// Funktion zum Abrufen aller Datensätze (READ ALL) - mit Pagination-Unterstützung
const getAllMerkmalstexte = async (req, res, next) => {
  try {
    const pool = await poolPromise;

    // Extract pagination parameters with defaults and validation
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(parseInt(req.query.limit) || 25, 100)); // Max 100 per page, default 25
    const offset = (page - 1) * limit;


    // Get total count for pagination metadata
    const countResult = await pool.request().query('SELECT COUNT(*) as total FROM merkmalstexte');
    const totalCount = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalCount / limit);

    // Get paginated records with proper ordering
    const result = await pool.request()
      .input('offset', sql.Int, offset)
      .input('limit', sql.Int, limit)
      .query(`
        SELECT * FROM merkmalstexte
        ORDER BY merkmalsposition, identnr, merkmal
        OFFSET @offset ROWS
        FETCH NEXT @limit ROWS ONLY
      `);


    // Felder für das Frontend zuordnen
    const recordsWithNewFields = result.recordset.map(record => ({
      ...record,
      // Wir ordnen die tatsächlichen Datenbankspalten den Frontend-Feldern zu
      position: record.merkmalsposition,
      sonderAbt: record.maka,
      fertigungsliste: record.fertigungsliste
    }));


    // Return data with pagination metadata
    const responseData = {
      data: recordsWithNewFields,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalCount: totalCount,
        pageSize: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    };

    res.status(200).json(formatSuccess(responseData, `Seite ${page} von ${totalPages} erfolgreich abgerufen`));
  } catch (err) {
    next(err);
  }
};

// Funktion zum Abrufen eines einzelnen Datensatzes nach ID (READ ONE)
const getMerkmalstextById = async (req, res, next) => {
  const { id } = req.params;

  const validation = validateId(id);
  if (!validation.isValid) {
    return res.status(400).json(formatValidationError(validation.errors));
  }

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM merkmalstexte WHERE id = @id');

    if (result.recordset.length === 0) {
      return res.status(404).json(formatError(`Datensatz mit ID ${id} nicht gefunden`));
    }

    const record = result.recordset[0];

    // Felder für das Frontend zuordnen
    const recordWithNewFields = {
      ...record,
      position: record.merkmalsposition,
      sonderAbt: record.maka,
      fertigungsliste: record.fertigungsliste
    };

    res.status(200).json(formatSuccess(recordWithNewFields, 'Datensatz erfolgreich abgerufen'));
  } catch (err) {
    next(err);
  }
};

// Funktion zum Erstellen eines neuen Datensatzes (CREATE)
const createMerkmalstext = async (req, res, next) => {
  const validation = validateMerkmalstexte(req.body);
  if (!validation.isValid) {
    return res.status(400).json(formatValidationError(validation.errors));
  }

  const { identnr, merkmal, auspraegung, drucktext, sondermerkmal, position, sonderAbt, fertigungsliste } = req.body;

  try {
    const pool = await poolPromise;

    // Check for exact duplicate combination: same identnr + merkmal + auspraegung + drucktext
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

    // Simple position logic: use provided position or default to 0
    const finalPosition = position || 0;

    const result = await pool.request()
      .input('identnr', sql.NVarChar, identnr)
      .input('merkmal', sql.NVarChar, merkmal)
      .input('auspraegung', sql.NVarChar, auspraegung)
      .input('drucktext', sql.NVarChar, drucktext)
      .input('sondermerkmal', sql.NVarChar, sondermerkmal || '')
      .input('merkmalsposition', sql.Int, finalPosition)
      .input('maka', sql.Int, sonderAbt || 0)
      .input('fertigungsliste', sql.Int, fertigungsliste || 0)
      .query(`
        INSERT INTO merkmalstexte (identnr, merkmal, auspraegung, drucktext, sondermerkmal, merkmalsposition, maka, fertigungsliste)
        VALUES (@identnr, @merkmal, @auspraegung, @drucktext, @sondermerkmal, @merkmalsposition, @maka, @fertigungsliste);
        SELECT * FROM merkmalstexte WHERE id = SCOPE_IDENTITY()
      `);

    if (result.recordset && result.recordset.length > 0) {
      const newRecord = result.recordset[0];

      // Felder für das Frontend zuordnen
      const recordWithNewFields = {
        ...newRecord,
        position: newRecord.merkmalsposition,
        sonderAbt: newRecord.maka,
        fertigungsliste: newRecord.fertigungsliste
      };

      res.status(201).json(formatSuccess(recordWithNewFields, 'Datensatz erfolgreich erstellt'));
    } else {
      res.status(500).json(formatError('Fehler beim Erstellen des Datensatzes'));
    }
  } catch (err) {
    next(err);
  }
};

// Funktion zum vollständigen Aktualisieren eines Datensatzes (UPDATE)
const updateMerkmalstext = async (req, res, next) => {
  const { id } = req.params;

  const idValidation = validateId(id);
  if (!idValidation.isValid) {
    return res.status(400).json(formatValidationError(idValidation.errors));
  }

  const validation = validateMerkmalstexte(req.body);
  if (!validation.isValid) {
    return res.status(400).json(formatValidationError(validation.errors));
  }

  const { identnr, merkmal, auspraegung, drucktext, sondermerkmal, position, sonderAbt, fertigungsliste } = req.body;

  try {
    const pool = await poolPromise;

    // Check if record exists
    const checkResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM merkmalstexte WHERE id = @id');

    if (checkResult.recordset.length === 0) {
      return res.status(404).json(formatError(`Datensatz mit ID ${id} nicht gefunden`));
    }

    const currentRecord = checkResult.recordset[0];

    // Simple position logic: use provided position or keep current
    const finalPosition = position !== undefined ? position : currentRecord.merkmalsposition;

    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('identnr', sql.NVarChar, identnr)
      .input('merkmal', sql.NVarChar, merkmal)
      .input('auspraegung', sql.NVarChar, auspraegung)
      .input('drucktext', sql.NVarChar, drucktext)
      .input('sondermerkmal', sql.NVarChar, sondermerkmal || '')
      .input('merkmalsposition', sql.Int, finalPosition)
      .input('maka', sql.Int, sonderAbt || 0)
      .input('fertigungsliste', sql.Int, fertigungsliste || 0)
      .query(`
        UPDATE merkmalstexte
        SET identnr = @identnr, merkmal = @merkmal, auspraegung = @auspraegung,
            drucktext = @drucktext, sondermerkmal = @sondermerkmal,
            merkmalsposition = @merkmalsposition, maka = @maka, fertigungsliste = @fertigungsliste
        WHERE id = @id;
        SELECT * FROM merkmalstexte WHERE id = @id
      `);

    if (result.recordset && result.recordset.length > 0) {
      const updatedRecord = result.recordset[0];

      // Felder für das Frontend zuordnen
      const recordWithNewFields = {
        ...updatedRecord,
        position: updatedRecord.merkmalsposition,
        sonderAbt: updatedRecord.maka,
        fertigungsliste: updatedRecord.fertigungsliste
      };

      res.status(200).json(formatSuccess(recordWithNewFields, 'Datensatz erfolgreich aktualisiert'));
    } else {
      res.status(500).json(formatError('Fehler beim Aktualisieren des Datensatzes'));
    }
  } catch (err) {
    next(err);
  }
};

// Funktion zum partiellen Aktualisieren eines Datensatzes (PATCH)
const patchMerkmalstext = async (req, res, next) => {
  const { id } = req.params;

  const idValidation = validateId(id);
  if (!idValidation.isValid) {
    return res.status(400).json(formatValidationError(idValidation.errors));
  }

  // For PATCH, we don't require all fields, so we validate only provided ones
  const providedFields = Object.keys(req.body);
  if (providedFields.length === 0) {
    return res.status(400).json(formatValidationError(['Mindestens ein Feld muss zum Aktualisieren bereitgestellt werden']));
  }

  try {
    const pool = await poolPromise;

    // Check if record exists and get current values
    const checkResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM merkmalstexte WHERE id = @id');

    if (checkResult.recordset.length === 0) {
      return res.status(404).json(formatError(`Datensatz mit ID ${id} nicht gefunden`));
    }

    // Map frontend fields to database fields
    const fieldMapping = {
      position: 'merkmalsposition',
      sonderAbt: 'maka',
      fertigungsliste: 'fertigungsliste'
    };

    // Build dynamic UPDATE query
    const updateFields = [];
    const request = pool.request();
    request.input('id', sql.Int, id);

    // Handle all fields with simple logic
    for (const [key, value] of Object.entries(req.body)) {
      const dbField = fieldMapping[key] || key;
      updateFields.push(`${dbField} = @${dbField}`);

      // Set appropriate SQL type based on field
      if (key === 'sonderAbt' || key === 'fertigungsliste' || key === 'position') {
        request.input(dbField, sql.Int, value || 0);
      } else {
        request.input(dbField, sql.NVarChar, value || '');
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json(formatValidationError(['Keine gültigen Felder zum Aktualisieren gefunden']));
    }

    const updateQuery = `
      UPDATE merkmalstexte
      SET ${updateFields.join(', ')}
      WHERE id = @id;
      SELECT * FROM merkmalstexte WHERE id = @id
    `;

    const result = await request.query(updateQuery);

    if (result.recordset && result.recordset.length > 0) {
      const updatedRecord = result.recordset[0];

      // Felder für das Frontend zuordnen
      const recordWithNewFields = {
        ...updatedRecord,
        position: updatedRecord.merkmalsposition,
        sonderAbt: updatedRecord.maka,
        fertigungsliste: updatedRecord.fertigungsliste
      };

      res.status(200).json(formatSuccess(recordWithNewFields, 'Datensatz erfolgreich partiell aktualisiert'));
    } else {
      res.status(500).json(formatError('Fehler beim partiellen Aktualisieren des Datensatzes'));
    }
  } catch (err) {
    next(err);
  }
};

// Funktion zum Löschen eines Datensatzes (DELETE)
const deleteMerkmalstext = async (req, res, next) => {
  const { id } = req.params;

  const validation = validateId(id);
  if (!validation.isValid) {
    return res.status(400).json(formatValidationError(validation.errors));
  }

  try {
    const pool = await poolPromise;

    // Check if record exists
    const checkResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT id FROM merkmalstexte WHERE id = @id');

    if (checkResult.recordset.length === 0) {
      return res.status(404).json(formatError(`Datensatz mit ID ${id} nicht gefunden`));
    }

    // Delete the record
    const deleteResult = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM merkmalstexte WHERE id = @id');

    res.status(200).json(formatSuccess({
      deletedId: id,
      affectedRows: deleteResult.rowsAffected[0]
    }, 'Datensatz erfolgreich gelöscht'));
  } catch (err) {
    next(err);
  }
};

// Funktion zum Abrufen ähnlicher Datensätze
const getSimilarDatasets = async (req, res, next) => {
  const { id } = req.params;

  const validation = validateId(id);
  if (!validation.isValid) {
    return res.status(400).json(formatValidationError(validation.errors));
  }

  try {
    const pool = await poolPromise;

    // Get original record details
    const originalRecord = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT merkmal, auspraegung, drucktext, sondermerkmal FROM merkmalstexte WHERE id = @id');

    if (originalRecord.recordset.length === 0) {
      return res.status(404).json(formatError(`Datensatz mit ID ${id} nicht gefunden`));
    }

    const { merkmal, auspraegung, drucktext, sondermerkmal } = originalRecord.recordset[0];

    // Find all records with same dataset characteristics
    const similarRecords = await pool.request()
      .input('merkmal', sql.VarChar, merkmal)
      .input('auspraegung', sql.VarChar, auspraegung)
      .input('drucktext', sql.VarChar, drucktext)
      .input('sondermerkmal', sql.VarChar, sondermerkmal || '')
      .query(`
        SELECT id, identnr, merkmal, auspraegung, drucktext, sondermerkmal, merkmalsposition, maka, fertigungsliste
        FROM merkmalstexte
        WHERE merkmal = @merkmal
          AND auspraegung = @auspraegung
          AND drucktext = @drucktext
          AND ISNULL(sondermerkmal, '') = @sondermerkmal
        ORDER BY identnr, merkmalsposition
      `);

    // Map fields for frontend
    const recordsWithNewFields = similarRecords.recordset.map(record => ({
      ...record,
      position: record.merkmalsposition,
      sonderAbt: record.maka,
      fertigungsliste: record.fertigungsliste
    }));

    res.status(200).json(formatSuccess({
      originalId: parseInt(id),
      records: recordsWithNewFields,
      count: recordsWithNewFields.length
    }, `${recordsWithNewFields.length} ähnliche Datensätze gefunden`));

  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllMerkmalstexte,
  getMerkmalstextById,
  createMerkmalstext,
  updateMerkmalstext,
  patchMerkmalstext,
  deleteMerkmalstext,
  getSimilarDatasets
};