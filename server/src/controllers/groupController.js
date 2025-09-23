const { poolPromise, sql } = require('../db');
const { formatSuccess, formatError, formatValidationError } = require('../utils/responseFormatter');
const { withTransaction, createRequest } = require('../utils/transactionHelper');

// Funktion zum Abrufen gruppenweiser Merkmalstexte (Hauptgruppen-View)
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
        ),
        GroupedWithCounts AS (
          SELECT
            g.*,
            COUNT(m.id) as record_count,
            STRING_AGG(CAST(m.identnr AS NVARCHAR(MAX)), ', ') as identnr_list,
            STRING_AGG(CAST(m.id AS NVARCHAR(MAX)), ',') as id_list
          FROM GroupedData g
          LEFT JOIN merkmalstexte m ON
            m.merkmal = g.merkmal
            AND m.auspraegung = g.auspraegung
            AND m.drucktext = g.drucktext
            AND m.merkmalsposition = g.merkmalsposition
            AND m.maka = g.maka
            AND CASE
                  WHEN m.sondermerkmal IS NULL OR LTRIM(RTRIM(m.sondermerkmal)) = ''
                  THEN 'EMPTY'
                  ELSE m.sondermerkmal
                END = g.normalized_sondermerkmal
            AND CASE
                  WHEN m.fertigungsliste IS NULL OR m.fertigungsliste = 0
                  THEN 'EMPTY'
                  ELSE CAST(m.fertigungsliste AS NVARCHAR)
                END = g.normalized_fertigungsliste
          GROUP BY
            g.merkmal, g.auspraegung, g.drucktext, g.merkmalsposition, g.maka,
            g.normalized_sondermerkmal, g.normalized_fertigungsliste
        )
        SELECT
          ROW_NUMBER() OVER (ORDER BY merkmal ASC, auspraegung ASC, drucktext ASC) as id,
          merkmal,
          auspraegung,
          drucktext,
          normalized_sondermerkmal as sondermerkmal,
          merkmalsposition,
          maka,
          CASE
            WHEN normalized_fertigungsliste = 'EMPTY' THEN 0
            ELSE CAST(normalized_fertigungsliste AS INT)
          END as fertigungsliste,
          record_count,
          identnr_list,
          id_list
        FROM GroupedWithCounts
        ORDER BY merkmal ASC, auspraegung ASC, drucktext ASC
      `);

    // Process the results to match frontend expectations
    const processedResults = result.recordset.map(record => {
      // Convert EMPTY back to empty string for frontend
      const processedRecord = {
        ...record,
        sondermerkmal: record.sondermerkmal === 'EMPTY' ? '' : record.sondermerkmal,
        // Map database fields to frontend fields
        position: record.merkmalsposition,
        sonderAbt: record.maka,
        fertigungsliste: record.fertigungsliste
      };

      // Add group metadata
      processedRecord._groupData = {
        record_count: record.record_count,
        identnr_list: record.identnr_list,
        id_list: record.id_list
      };

      return processedRecord;
    });

    // Return data in expected format
    const responseData = {
      data: processedResults,
      totalCount: totalCount
    };

    res.status(200).json(formatSuccess(responseData, `${totalCount} Gruppen erfolgreich abgerufen`));
  } catch (err) {
    next(err);
  }
};

// Funktion zum gruppenweisen Aktualisieren von Merkmalstexten
const updateGroupedMerkmalstexte = async (req, res, next) => {
  const { originalData, newData, groupData } = req.body;

  // Validation
  if (!originalData || !newData) {
    return res.status(400).json(formatValidationError(['Original data und neue Daten sind erforderlich']));
  }

  try {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      let updatedRecords = [];

      if (groupData && groupData.id_list) {
        // Group update: update all records in the group
        const idList = groupData.id_list.split(',').map(id => parseInt(id.trim()));

        for (const id of idList) {
          if (!isNaN(id)) {
            const request = new sql.Request(transaction);
            const result = await request
              .input('id', sql.Int, id)
              .input('merkmal', sql.NVarChar, newData.merkmal)
              .input('auspraegung', sql.NVarChar, newData.auspraegung)
              .input('drucktext', sql.NVarChar, newData.drucktext)
              .input('sondermerkmal', sql.NVarChar, newData.sondermerkmal || '')
              .input('merkmalsposition', sql.Int, newData.position || 0)
              .input('maka', sql.Int, newData.sonderAbt || 0)
              .input('fertigungsliste', sql.Int, newData.fertigungsliste || 0)
              .query(`
                UPDATE merkmalstexte
                SET merkmal = @merkmal, auspraegung = @auspraegung, drucktext = @drucktext,
                    sondermerkmal = @sondermerkmal, merkmalsposition = @merkmalsposition,
                    maka = @maka, fertigungsliste = @fertigungsliste
                WHERE id = @id;
                SELECT * FROM merkmalstexte WHERE id = @id
              `);

            if (result.recordset && result.recordset.length > 0) {
              const updatedRecord = result.recordset[0];
              updatedRecords.push({
                ...updatedRecord,
                position: updatedRecord.merkmalsposition,
                sonderAbt: updatedRecord.maka,
                fertigungsliste: updatedRecord.fertigungsliste
              });
            }
          }
        }
      } else {
        // Single record update logic would go here if needed
        return res.status(400).json(formatValidationError(['Group data ist erforderlich für Gruppenaktualisierung']));
      }

      await transaction.commit();

      res.status(200).json(formatSuccess({
        updatedRecords,
        updateCount: updatedRecords.length,
        groupData
      }, `${updatedRecords.length} Datensätze in der Gruppe erfolgreich aktualisiert`));

    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
};

// Funktion zum massenweisen Löschen basierend auf Gruppendaten
const bulkDeleteByGroupData = async (req, res, next) => {
  const { groupData } = req.body;

  if (!groupData || !groupData.id_list) {
    return res.status(400).json(formatValidationError(['Group data mit id_list ist erforderlich']));
  }

  console.log('🗑️ Bulk Delete Debug:', {
    groupData,
    hasGroupId: !!groupData.groupId,
    idList: groupData.id_list
  });

  try {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const idList = groupData.id_list.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

      if (idList.length === 0) {
        await transaction.rollback();
        return res.status(400).json(formatValidationError(['Keine gültigen IDs zum Löschen gefunden']));
      }

      // Delete all records in the group
      const placeholders = idList.map((_, index) => `@id${index}`).join(',');
      const request = new sql.Request(transaction);

      // Add all IDs as parameters
      idList.forEach((id, index) => {
        request.input(`id${index}`, sql.Int, id);
      });

      const deleteResult = await request.query(`
        DELETE FROM merkmalstexte WHERE id IN (${placeholders})
      `);

      await transaction.commit();

      res.status(200).json(formatSuccess({
        deletedCount: deleteResult.rowsAffected[0],
        deletedIds: idList,
        groupData
      }, `${deleteResult.rowsAffected[0]} Datensätze der Gruppe erfolgreich gelöscht`));

    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
};

// Funktion zum Kopieren von Gruppendaten für Replikation
const copyGroupData = async (req, res, next) => {
  const { merkmal, auspraegung, drucktext, sondermerkmal, position, sonderAbt } = req.body;

  console.log('🔍 Copy Group Debug:', {
    merkmal, auspraegung, drucktext, sondermerkmal, position, sonderAbt
  });

  // Validation
  if (!merkmal || !auspraegung || !drucktext) {
    return res.status(400).json(formatValidationError(['Merkmal, Auspraegung und Drucktext sind erforderlich']));
  }

  try {
    const pool = await poolPromise;

    // Find all records that match the group criteria
    const result = await pool.request()
      .input('merkmal', sql.NVarChar, merkmal)
      .input('auspraegung', sql.NVarChar, auspraegung)
      .input('drucktext', sql.NVarChar, drucktext)
      .input('sondermerkmal', sql.NVarChar, sondermerkmal || '')
      .input('position', sql.Int, position)
      .input('sonderAbt', sql.Int, sonderAbt)
      .query(`
        SELECT * FROM merkmalstexte
        WHERE merkmal = @merkmal
          AND auspraegung = @auspraegung
          AND drucktext = @drucktext
          AND (
            (sondermerkmal = @sondermerkmal) OR
            (sondermerkmal IS NULL AND @sondermerkmal = '') OR
            (LTRIM(RTRIM(sondermerkmal)) = '' AND @sondermerkmal = '')
          )
          AND merkmalsposition = @position
          AND (maka = @sonderAbt OR maka IS NULL)
        ORDER BY merkmalsposition, identnr
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json(formatError('Keine passenden Datensätze für die Gruppenkopie gefunden'));
    }

    // Process the records for frontend
    const processedRecords = result.recordset.map(record => ({
      ...record,
      position: record.merkmalsposition,
      sonderAbt: record.maka,
      fertigungsliste: record.fertigungsliste
    }));

    res.status(200).json(formatSuccess({
      records: processedRecords,
      groupCriteria: { merkmal, auspraegung, drucktext, sondermerkmal },
      recordCount: processedRecords.length
    }, `${processedRecords.length} Datensätze für Gruppenkopie gefunden`));

  } catch (err) {
    next(err);
  }
};

// Funktion zum Erstellen einer neuen Gruppe aus kopierten Daten
const createGroupFromCopy = async (req, res, next) => {
  const { records, targetIdentnrs } = req.body;

  // Validation
  if (!records || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json(formatValidationError(['Datensätze zum Kopieren sind erforderlich']));
  }

  if (!targetIdentnrs || !Array.isArray(targetIdentnrs) || targetIdentnrs.length === 0) {
    return res.status(400).json(formatValidationError(['Ziel-Identnrs sind erforderlich']));
  }

  try {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const createdRecords = [];

      // Create records for each target identnr
      for (const targetIdentnr of targetIdentnrs) {
        for (const record of records) {
          // Check for exact duplicate before creating
          const duplicateRequest = new sql.Request(transaction);
          const duplicateCheck = await duplicateRequest
            .input('identnr', sql.NVarChar, targetIdentnr)
            .input('merkmal', sql.NVarChar, record.merkmal)
            .input('auspraegung', sql.NVarChar, record.auspraegung)
            .input('drucktext', sql.NVarChar, record.drucktext)
            .query(`
              SELECT COUNT(*) as count
              FROM merkmalstexte
              WHERE identnr = @identnr
                AND merkmal = @merkmal
                AND auspraegung = @auspraegung
                AND drucktext = @drucktext
            `);

          if (duplicateCheck.recordset[0].count > 0) {
            console.log(`⚠️ Skipping duplicate: ${targetIdentnr} - ${record.merkmal}/${record.auspraegung}/${record.drucktext}`);
            continue; // Skip this record, continue with next
          }

          const request = new sql.Request(transaction);
          const result = await request
            .input('identnr', sql.NVarChar, targetIdentnr)
            .input('merkmal', sql.NVarChar, record.merkmal)
            .input('auspraegung', sql.NVarChar, record.auspraegung)
            .input('drucktext', sql.NVarChar, record.drucktext)
            .input('sondermerkmal', sql.NVarChar, record.sondermerkmal || '')
            .input('merkmalsposition', sql.Int, record.position || record.merkmalsposition || 0)
            .input('maka', sql.Int, record.sonderAbt || record.maka || 0)
            .input('fertigungsliste', sql.Int, record.fertigungsliste || 0)
            .query(`
              INSERT INTO merkmalstexte (identnr, merkmal, auspraegung, drucktext, sondermerkmal, merkmalsposition, maka, fertigungsliste)
              VALUES (@identnr, @merkmal, @auspraegung, @drucktext, @sondermerkmal, @merkmalsposition, @maka, @fertigungsliste);
              SELECT * FROM merkmalstexte WHERE id = SCOPE_IDENTITY()
            `);

          if (result.recordset && result.recordset.length > 0) {
            const newRecord = result.recordset[0];
            createdRecords.push({
              ...newRecord,
              position: newRecord.merkmalsposition,
              sonderAbt: newRecord.maka,
              fertigungsliste: newRecord.fertigungsliste
            });
          }
        }
      }

      await transaction.commit();

      res.status(201).json(formatSuccess({
        createdRecords,
        recordCount: createdRecords.length,
        targetIdentnrs,
        sourceRecordCount: records.length
      }, `${createdRecords.length} neue Datensätze für ${targetIdentnrs.length} Identnrs erfolgreich erstellt`));

    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getGroupedMerkmalstexte,
  updateGroupedMerkmalstexte,
  bulkDeleteByGroupData,
  copyGroupData,
  createGroupFromCopy
};