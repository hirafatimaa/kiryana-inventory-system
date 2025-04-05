/**
 * User Routes
 * 
 * Defines routes for user management operations
 */

const express = require('express');
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middleware/auth.middleware');
const validationMiddleware = require('../middleware/validation.middleware');

const router = express.Router();

// Protect all routes with authentication
router.use(authMiddleware.verifyToken);

/**
 * @route   GET /users
 * @desc    Get all users
 * @access  Admin
 */
router.get('/', authMiddleware.isAdmin, userController.getAllUsers);

/**
 * @route   GET /users/:userId
 * @desc    Get user by ID
 * @access  Admin
 */
router.get('/:userId', authMiddleware.isAdmin, userController.getUserById);

/**
 * @route   POST /users
 * @desc    Create a new user
 * @access  Admin
 */
router.post('/', 
  authMiddleware.isAdmin, 
  validationMiddleware.validateRegistration, 
  userController.createUser
);

/**
 * @route   PUT /users/:userId
 * @desc    Update a user
 * @access  Admin
 */
router.put('/:userId', 
  authMiddleware.isAdmin, 
  validationMiddleware.validateUserUpdate, 
  userController.updateUser
);

/**
 * @route   DELETE /users/:userId
 * @desc    Delete a user
 * @access  Admin
 */
router.delete('/:userId', authMiddleware.isAdmin, userController.deleteUser);

/**
 * @route   PUT /users/:userId/role
 * @desc    Assign role to user
 * @access  Admin
 */
router.put('/:userId/role', authMiddleware.isAdmin, userController.assignRole);

module.exports = router;