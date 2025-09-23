const express = require('express');
const router = express.Router();
const controller = require('../controllers/identnrController');

// Get all identnrs
router.get('/identnrs', controller.getAllIdentnrs);

// Get identnr count
router.get('/identnrs/count', controller.getIdentnrCount);

// Get all records for a specific identnr
router.get('/identnrs/:identnr', controller.getMerkmalstexteByIdentnr);

// Clone identnr (POST /api/identnrs/clone)
router.post('/identnrs/clone', controller.cloneIdentnr);

// Delete all records for a specific identnr
router.delete('/identnrs/:identnr', controller.deleteMerkmalstexteByIdentnr);

module.exports = router;