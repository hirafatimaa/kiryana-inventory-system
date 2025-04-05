/**
 * Inventory Report Routes
 * 
 * API endpoints for inventory-related reporting
 */

const express = require('express');
const router = express.Router();
const inventoryReportController = require('../controllers/inventory-report.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   GET /reports/inventory/status
 * @desc    Generate inventory status report
 * @access  Private (All authenticated users)
 */
router.get('/status', inventoryReportController.generateInventoryStatusReport);

/**
 * @route   GET /reports/inventory/movements
 * @desc    Generate inventory movements report
 * @access  Private (All authenticated users)
 */
router.get('/movements', inventoryReportController.generateMovementsReport);

/**
 * @route   GET /reports/inventory/low-stock
 * @desc    Generate low stock report
 * @access  Private (All authenticated users)
 */
router.get('/low-stock', inventoryReportController.generateLowStockReport);

module.exports = router;