/**
 * Store Routes
 * 
 * API endpoints for store management operations
 */

const express = require('express');
const router = express.Router();
const storeController = require('../controllers/store.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   POST /stores
 * @desc    Create a new store
 * @access  Private (Admin only)
 */
router.post(
  '/',
  authorize(['admin']),
  storeController.createStore
);

/**
 * @route   GET /stores
 * @desc    Get all stores with optional filtering
 * @access  Private (All authenticated users)
 */
router.get('/', storeController.getStores);

/**
 * @route   GET /stores/nearby
 * @desc    Find stores near a location
 * @access  Private (All authenticated users)
 */
router.get('/nearby', storeController.findNearbyStores);

/**
 * @route   GET /stores/:id
 * @desc    Get a store by ID
 * @access  Private (All authenticated users)
 */
router.get('/:id', storeController.getStoreById);

/**
 * @route   PUT /stores/:id
 * @desc    Update a store
 * @access  Private (Admin, Store Manager)
 */
router.put(
  '/:id',
  authorize(['admin', 'store_manager']),
  storeController.updateStore
);

/**
 * @route   PATCH /stores/:id/deactivate
 * @desc    Deactivate a store
 * @access  Private (Admin only)
 */
router.patch(
  '/:id/deactivate',
  authorize(['admin']),
  storeController.deactivateStore
);

/**
 * @route   PATCH /stores/:id/activate
 * @desc    Activate a store
 * @access  Private (Admin only)
 */
router.patch(
  '/:id/activate',
  authorize(['admin']),
  storeController.activateStore
);

module.exports = router;