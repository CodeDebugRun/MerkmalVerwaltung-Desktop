const { poolPromise, sql } = require('../db');
const { formatSuccess, formatError, formatValidationError } = require('../utils/responseFormatter');

// Funktion zum gefilterten Abrufen von Merkmalstexten - Legacy merkmalstexte.jsp functionality
const getFilteredMerkmalstexte = async (req, res, next) => {
  const { identnr, merkmal, auspraegung, drucktext, sondermerkmal, position, sonderAbt, fertigungsliste, quickSearch, page, limit } = req.query;

  try {
    const pool = await poolPromise;
    const request = pool.request();

    // Extract pagination parameters with defaults and validation
    const currentPage = Math.max(1, parseInt(page) || 1);
    const pageSize = Math.max(1, Math.min(parseInt(limit) || 50, 500000)); // Max 500000 per page
    const offset = (currentPage - 1) * pageSize;

    // Build dynamic WHERE clause
    let whereConditions = [];

    // Quick search - searches across multiple fields
    if (quickSearch) {
      const searchTerm = `%${quickSearch}%`;
      whereConditions.push(`(
        identnr LIKE @quickSearch OR
        merkmal LIKE @quickSearch OR
        auspraegung LIKE @quickSearch OR
        drucktext LIKE @quickSearch OR
        sondermerkmal LIKE @quickSearch
      )`);
      request.input('quickSearch', sql.VarChar, searchTerm);
    } else {
      // Individual field filters (only if no quickSearch)
      if (identnr) {
        whereConditions.push('identnr LIKE @identnr');
        request.input('identnr', sql.VarChar, `%${identnr}%`);
      }

      if (merkmal) {
        whereConditions.push('merkmal LIKE @merkmal');
        request.input('merkmal', sql.VarChar, `%${merkmal}%`);
      }

      if (auspraegung) {
        whereConditions.push('auspraegung LIKE @auspraegung');
        request.input('auspraegung', sql.VarChar, `%${auspraegung}%`);
      }

      if (drucktext) {
        whereConditions.push('drucktext LIKE @drucktext');
        request.input('drucktext', sql.VarChar, `%${drucktext}%`);
      }

      if (sondermerkmal) {
        whereConditions.push('sondermerkmal LIKE @sondermerkmal');
        request.input('sondermerkmal', sql.VarChar, `%${sondermerkmal}%`);
      }

      if (position) {
        whereConditions.push('merkmalsposition = @position');
        request.input('position', sql.Int, parseInt(position));
      }

      if (sonderAbt) {
        whereConditions.push('maka = @sonderAbt');
        request.input('sonderAbt', sql.Int, parseInt(sonderAbt));
      }

      if (fertigungsliste) {
        whereConditions.push('fertigungsliste = @fertigungsliste');
        request.input('fertigungsliste', sql.Int, parseInt(fertigungsliste));
      }
    }

    const whereClause = whereConditions.length > 0 ? ' WHERE ' + whereConditions.join(' AND ') : '';

    // Get total count for pagination metadata
    const countQuery = `SELECT COUNT(*) as total FROM merkmalstexte${whereClause}`;
    const countResult = await request.query(countQuery);
    const totalCount = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Add pagination parameters to the request
    request.input('offset', sql.Int, offset);
    request.input('pageSize', sql.Int, pageSize);

    // Build paginated query
    const query = `
      SELECT * FROM merkmalstexte
      ${whereClause}
      ORDER BY merkmalsposition, identnr, merkmal
      OFFSET @offset ROWS
      FETCH NEXT @pageSize ROWS ONLY
    `;

    const result = await request.query(query);

    // Map fields for frontend compatibility
    const recordsWithMappedFields = result.recordset.map(record => ({
      ...record,
      position: record.merkmalsposition,
      sonderAbt: record.maka,
      fertigungsliste: record.fertigungsliste
    }));

    // Return data with pagination metadata
    const responseData = {
      data: recordsWithMappedFields,
      pagination: {
        currentPage: currentPage,
        totalPages: totalPages,
        totalCount: totalCount,
        pageSize: pageSize,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1
      }
    };

    res.status(200).json(formatSuccess(responseData, `Seite ${currentPage} von ${totalPages} (${totalCount} gefilterte Datensätze)`));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getFilteredMerkmalstexte
};