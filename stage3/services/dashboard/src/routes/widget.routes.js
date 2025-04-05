/**
 * Widget Routes
 * 
 * API endpoints for retrieving widget data
 */

const express = require('express');
const router = express.Router();
const widgetController = require('../controllers/widget.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   GET /widgets/sales-summary
 * @desc    Get sales summary widget data
 * @access  Private (All authenticated users)
 */
router.get('/sales-summary', widgetController.getSalesSummaryWidget);

/**
 * @route   GET /widgets/inventory-status
 * @desc    Get inventory status widget data
 * @access  Private (All authenticated users)
 */
router.get('/inventory-status', widgetController.getInventoryStatusWidget);

/**
 * @route   GET /widgets/low-stock-alerts
 * @desc    Get low stock alerts widget data
 * @access  Private (All authenticated users)
 */
router.get('/low-stock-alerts', widgetController.getLowStockAlertsWidget);

/**
 * @route   GET /widgets/recent-movements
 * @desc    Get recent inventory movements widget data
 * @access  Private (All authenticated users)
 */
router.get('/recent-movements', widgetController.getRecentMovementsWidget);

/**
 * @route   GET /widgets/top-products
 * @desc    Get top selling products widget data
 * @access  Private (All authenticated users)
 */
router.get('/top-products', widgetController.getTopProductsWidget);

module.exports = router;