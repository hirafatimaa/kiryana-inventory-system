/**
 * Inventory Routes
 * 
 * API endpoints for inventory status operations
 */

const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory-summary.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   GET /inventory
 * @desc    Get inventory summary with filtering options
 * @access  Private (All authenticated users)
 */
router.get('/', inventoryController.getInventorySummary);

/**
 * @route   GET /inventory/:productId/:storeId
 * @desc    Get inventory status for a specific product in a store
 * @access  Private (All authenticated users)
 */
router.get('/:productId/:storeId', inventoryController.getProductInventory);

/**
 * @route   PATCH /inventory/:productId/:storeId/reorder-level
 * @desc    Update reorder level for a product in a store
 * @access  Private (Inventory Manager, Store Manager, Admin)
 */
router.patch(
  '/:productId/:storeId/reorder-level',
  authorize(['admin', 'inventory_manager', 'store_manager']),
  inventoryController.updateReorderLevel
);

module.exports = router;