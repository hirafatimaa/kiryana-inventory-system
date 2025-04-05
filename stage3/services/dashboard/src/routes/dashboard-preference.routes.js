/**
 * Dashboard Preference Routes
 * 
 * API endpoints for managing dashboard preferences
 */

const express = require('express');
const router = express.Router();
const dashboardPreferenceController = require('../controllers/dashboard-preference.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   GET /dashboards
 * @desc    Get user dashboard preferences
 * @access  Private (All authenticated users)
 */
router.get('/', dashboardPreferenceController.getUserDashboardPreferences);

/**
 * @route   POST /dashboards
 * @desc    Create a new dashboard preference
 * @access  Private (All authenticated users)
 */
router.post('/', dashboardPreferenceController.createDashboardPreference);

/**
 * @route   GET /dashboards/:id
 * @desc    Get dashboard preference by ID
 * @access  Private (Owner or Admin)
 */
router.get('/:id', dashboardPreferenceController.getDashboardPreference);

/**
 * @route   PUT /dashboards/:id
 * @desc    Update a dashboard preference
 * @access  Private (Owner or Admin)
 */
router.put('/:id', dashboardPreferenceController.updateDashboardPreference);

/**
 * @route   DELETE /dashboards/:id
 * @desc    Delete a dashboard preference
 * @access  Private (Owner or Admin)
 */
router.delete('/:id', dashboardPreferenceController.deleteDashboardPreference);

/**
 * @route   PUT /dashboards/:id/default
 * @desc    Set dashboard as default
 * @access  Private (Owner or Admin)
 */
router.put('/:id/default', dashboardPreferenceController.setDefaultDashboard);

/**
 * @route   GET /dashboards/default/:dashboardType
 * @desc    Get default dashboard for user and type
 * @access  Private (All authenticated users)
 */
router.get('/default/:dashboardType', dashboardPreferenceController.getDefaultDashboard);

module.exports = router;