/**
 * Role Routes
 * 
 * Defines routes for role management operations
 */

const express = require('express');
const roleController = require('../controllers/role.controller');
const authMiddleware = require('../middleware/auth.middleware');
const validationMiddleware = require('../middleware/validation.middleware');

const router = express.Router();

// Apply admin middleware to all routes
router.use(authMiddleware.verifyToken, authMiddleware.isAdmin);

/**
 * @route   GET /roles
 * @desc    Get all roles
 * @access  Admin
 */
router.get('/', roleController.getAllRoles);

/**
 * @route   GET /roles/:roleId
 * @desc    Get role by ID
 * @access  Admin
 */
router.get('/:roleId', roleController.getRoleById);

/**
 * @route   POST /roles
 * @desc    Create a new role
 * @access  Admin
 */
router.post('/', validationMiddleware.validateRoleCreation, roleController.createRole);

/**
 * @route   PUT /roles/:roleId
 * @desc    Update a role
 * @access  Admin
 */
router.put('/:roleId', roleController.updateRole);

/**
 * @route   DELETE /roles/:roleId
 * @desc    Delete a role
 * @access  Admin
 */
router.delete('/:roleId', roleController.deleteRole);

module.exports = router;