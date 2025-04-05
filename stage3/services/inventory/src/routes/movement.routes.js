/**
 * Movement Routes
 * 
 * API endpoints for inventory movement operations
 */

const express = require('express');
const router = express.Router();
const movementController = require('../controllers/inventory-movement.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   POST /movements
 * @desc    Record a new inventory movement (stock-in, sale, removal)
 * @access  Private (Inventory Manager, Store Manager, Admin)
 */
router.post(
  '/',
  authorize(['admin', 'inventory_manager', 'store_manager']),
  movementController.recordMovement
);

/**
 * @route   GET /movements
 * @desc    Get all inventory movements with filtering
 * @access  Private (All authenticated users)
 */
router.get('/', movementController.getMovements);

/**
 * @route   GET /movements/:id
 * @desc    Get an inventory movement by ID
 * @access  Private (All authenticated users)
 */
router.get('/:id', movementController.getMovementById);

/**
 * @route   POST /movements/:id/cancel
 * @desc    Cancel an inventory movement (creates a reversal)
 * @access  Private (Inventory Manager, Admin)
 */
router.post(
  '/:id/cancel',
  authorize(['admin', 'inventory_manager']),
  movementController.cancelMovement
);

module.exports = router;