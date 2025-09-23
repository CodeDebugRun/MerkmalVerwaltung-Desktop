const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');

// GET: Gruplandırılmış merkmalstexte listesi
router.get('/merkmalstexte', groupController.getGroupedMerkmalstexte);

// PUT: Grup bazlı güncelleme
router.put('/merkmalstexte', groupController.updateGroupedMerkmalstexte);

// POST: Bulk delete by group data
router.post('/merkmalstexte/bulk-delete-group', groupController.bulkDeleteByGroupData);

// POST: Copy group data for replication
router.post('/merkmalstexte/copy-group', groupController.copyGroupData);

// POST: Create new group from copied data
router.post('/merkmalstexte/create-from-copy', groupController.createGroupFromCopy);

module.exports = router;