/**
 * User Controller
 * 
 * Handles user management operations (admin functions)
 */

const { User, Role } = require('../models');
const logger = require('../utils/logger');

/**
 * Get all users (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, active } = req.query;
    
    // Build filter
    const filter = {};
    
    if (role) {
      filter.role = role;
    }
    
    if (active !== undefined) {
      filter.isActive = active === 'true';
    }
    
    // Count total users with filter
    const total = await User.countDocuments(filter);
    
    // Find users with pagination
    const users = await User.find(filter)
      .select('-password -refreshTokens')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error(`Error in getAllUsers: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to get users',
      error: error.message
    });
  }
};

/**
 * Get user by ID (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getUserById = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    const user = await User.findById(userId).select('-password -refreshTokens');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: { user }
    });
  } catch (error) {
    logger.error(`Error in getUserById: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to get user',
      error: error.message
    });
  }
};

/**
 * Create a new user (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createUser = async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, role, isActive } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { username: username.toLowerCase() },
        { email: email.toLowerCase() }
      ]
    });
    
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this username or email already exists'
      });
    }
    
    // Validate role
    if (role) {
      const validRole = await Role.findOne({ name: role });
      if (!validRole) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role'
        });
      }
    }
    
    // Create user
    const user = new User({
      username,
      email,
      password,
      firstName,
      lastName,
      role: role || 'staff',
      isActive: isActive !== undefined ? isActive : true
    });
    
    await user.save();
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: user.getProfile()
      }
    });
  } catch (error) {
    logger.error(`Error in createUser: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message
    });
  }
};

/**
 * Update a user (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { firstName, lastName, role, isActive, stores } = req.body;
    
    // Find user by ID
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Validate role
    if (role) {
      const validRole = await Role.findOne({ name: role });
      if (!validRole) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role'
        });
      }
      user.role = role;
    }
    
    // Update user fields if provided
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (isActive !== undefined) user.isActive = isActive;
    if (stores) user.stores = stores;
    
    user.updatedAt = new Date();
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: {
        user: user.getProfile()
      }
    });
  } catch (error) {
    logger.error(`Error in updateUser: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
};

/**
 * Delete a user (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Find user by ID
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if trying to delete admin
    if (user.role === 'admin') {
      // Count admin users
      const adminCount = await User.countDocuments({ role: 'admin' });
      
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete the last admin user'
        });
      }
    }
    
    await user.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error(`Error in deleteUser: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
};

/**
 * Reset user password (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.resetPassword = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { newPassword } = req.body;
    
    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password is required'
      });
    }
    
    // Find user by ID
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update password
    user.password = newPassword;
    user.refreshTokens = []; // Clear all refresh tokens
    user.updatedAt = new Date();
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    logger.error(`Error in resetPassword: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      error: error.message
    });
  }
};