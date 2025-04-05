/**
 * Export Routes
 * 
 * API endpoints for exporting reports to different formats
 */

const express = require('express');
const router = express.Router();
const exportController = require('../controllers/export.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   POST /reports/export
 * @desc    Export a report in the specified format
 * @access  Private (All authenticated users)
 */
router.post('/', exportController.exportReport);

module.exports = router;