const express = require('express');
const router = express.Router();
const controller = require('../controllers/merkmalstexteController');
const basicCrudController = require('../controllers/basicCrudController');
const filterController = require('../controllers/filterController');
const identnrController = require('../controllers/identnrController');

// --- CRUD Routen ---
// GET: Gruplandırılmış ana liste - main listing with grouped data
router.get('/merkmalstexte/list-grouped', controller.getGroupedMerkmalstexte);

// GET: Filtered results - Legacy merkmalstexte.jsp functionality
router.get('/merkmalstexte/filter', filterController.getFilteredMerkmalstexte);

// GET: Alle Datensätze abrufen (READ)
router.get('/merkmalstexte', basicCrudController.getAllMerkmalstexte);

// GET: Check for null ID records
router.get('/merkmalstexte/check/null-ids', controller.checkNullIds);

// GET: Check for duplicate Ident-Nr entries
router.get('/merkmalstexte/check/duplicates', controller.checkDuplicateIdentnrs);

// GET: Count of unique Ident-Nr values
router.get('/merkmalstexte/count/identnrs', identnrController.getIdentnrCount);

// GET: All unique Ident-Nr values (simple list)
router.get('/merkmalstexte/list/identnrs', identnrController.getAllIdentnrs);

// POST: Add new custom Ident-Nr to database
router.post('/merkmalstexte/add-identnr', identnrController.addCustomIdentnr);

// POST: Copy record to multiple Ident-Nr values
router.post('/merkmalstexte/:id/copy-to-identnrs', identnrController.copyRecordToMultipleIdentnrs);

// GET: All records by Ident-Nr
router.get('/merkmalstexte/identnr/:identnr', identnrController.getMerkmalstexteByIdentnr);

// POST: Create new record for specific Ident-Nr
router.post('/merkmalstexte/identnr/:identnr', identnrController.createMerkmalstextForIdentnr);

// DELETE: Delete all records for specific Ident-Nr
router.delete('/merkmalstexte/identnr/:identnr', identnrController.deleteMerkmalstexteByIdentnr);

// POST: Neuen Datensatz erstellen (CREATE) - with position shifting
router.post('/merkmalstexte', basicCrudController.createMerkmalstext);

// POST: Bulk position update - Legacy merkmalsposition_edit.jsp functionality
router.post('/merkmalstexte/bulk-position', controller.bulkUpdateMerkmalstextePositions);

// PUT: Update specific record (full update)
router.put('/merkmalstexte/:id', basicCrudController.updateMerkmalstext);

// PATCH: Partial update specific record
router.patch('/merkmalstexte/:id', basicCrudController.patchMerkmalstext);

// DELETE: Delete specific record
router.delete('/merkmalstexte/:id', basicCrudController.deleteMerkmalstext);

// Note: Group operations moved to groupedRoutes.js

// GET: Get specific record by ID
router.get('/merkmalstexte/:id', basicCrudController.getMerkmalstextById);

// GET: Get similar datasets to a specific record
router.get('/merkmalstexte/:id/similar', basicCrudController.getSimilarDatasets);

module.exports = router;