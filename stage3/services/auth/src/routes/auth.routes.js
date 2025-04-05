/**
 * Auth Routes
 * 
 * Defines routes for authentication operations
 */

const express = require('express');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');
const validationMiddleware = require('../middleware/validation.middleware');

const router = express.Router();

/**
 * @route   POST /auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', validationMiddleware.validateRegistration, authController.register);

/**
 * @route   POST /auth/login
 * @desc    Login a user
 * @access  Public
 */
router.post('/login', validationMiddleware.validateLogin, authController.login);

/**
 * @route   POST /auth/logout
 * @desc    Logout a user
 * @access  Private
 */
router.post('/logout', authMiddleware.verifyToken, authController.logout);

/**
 * @route   POST /auth/refresh-token
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh-token', validationMiddleware.validateRefreshToken, authController.refreshToken);

/**
 * @route   GET /auth/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', authMiddleware.verifyToken, authController.getProfile);

/**
 * @route   PUT /auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authMiddleware.verifyToken, validationMiddleware.validateUserUpdate, authController.updateProfile);

/**
 * @route   POST /auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password', authMiddleware.verifyToken, validationMiddleware.validatePasswordChange, authController.changePassword);

module.exports = router;