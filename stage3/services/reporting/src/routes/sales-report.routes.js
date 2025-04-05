/**
 * Sales Report Routes
 * 
 * API endpoints for sales-related reporting
 */

const express = require('express');
const router = express.Router();
const salesReportController = require('../controllers/sales-report.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   GET /reports/sales/summary
 * @desc    Generate sales summary report
 * @access  Private (All authenticated users)
 */
router.get('/summary', salesReportController.generateSalesSummaryReport);

/**
 * @route   GET /reports/sales/by-product
 * @desc    Generate sales by product report
 * @access  Private (All authenticated users)
 */
router.get('/by-product', salesReportController.generateSalesByProductReport);

/**
 * @route   GET /reports/sales/by-store
 * @desc    Generate sales by store report
 * @access  Private (Store Manager, Inventory Manager, Admin)
 */
router.get(
  '/by-store',
  authorize(['admin', 'inventory_manager', 'store_manager']),
  salesReportController.generateSalesByStoreReport
);

module.exports = router;