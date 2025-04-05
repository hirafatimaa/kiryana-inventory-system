/**
 * Validation Middleware
 * 
 * Request validation middleware for various endpoints
 */

const logger = require('../utils/logger');

/**
 * Validate user registration data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.validateRegistration = (req, res, next) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;
    const errors = [];

    // Username validation
    if (!username) {
      errors.push('Username is required');
    } else if (username.length < 3 || username.length > 20) {
      errors.push('Username must be between 3 and 20 characters');
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      errors.push('Username can only contain letters, numbers, and underscores');
    }

    // Email validation
    if (!email) {
      errors.push('Email is required');
    } else if (!/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(email)) {
      errors.push('Invalid email format');
    }

    // Password validation
    if (!password) {
      errors.push('Password is required');
    } else if (password.length < 6) {
      errors.push('Password must be at least 6 characters');
    }

    // Name validation
    if (!firstName) {
      errors.push('First name is required');
    }
    
    if (!lastName) {
      errors.push('Last name is required');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    next();
  } catch (error) {
    logger.error(`Registration validation error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Validation error occurred'
    });
  }
};

/**
 * Validate login data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.validateLogin = (req, res, next) => {
  try {
    const { username, password } = req.body;
    const errors = [];

    if (!username) {
      errors.push('Username or email is required');
    }

    if (!password) {
      errors.push('Password is required');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    next();
  } catch (error) {
    logger.error(`Login validation error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Validation error occurred'
    });
  }
};

/**
 * Validate refresh token request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.validateRefreshToken = (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    next();
  } catch (error) {
    logger.error(`Refresh token validation error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Validation error occurred'
    });
  }
};

/**
 * Validate user update data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.validateUserUpdate = (req, res, next) => {
  try {
    const { email, firstName, lastName, isActive } = req.body;
    const errors = [];

    // Email validation (if provided)
    if (email && !/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(email)) {
      errors.push('Invalid email format');
    }

    // Active status validation
    if (isActive !== undefined && typeof isActive !== 'boolean') {
      errors.push('Active status must be a boolean');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    next();
  } catch (error) {
    logger.error(`User update validation error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Validation error occurred'
    });
  }
};

/**
 * Validate password change
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.validatePasswordChange = (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const errors = [];

    if (!currentPassword) {
      errors.push('Current password is required');
    }

    if (!newPassword) {
      errors.push('New password is required');
    } else if (newPassword.length < 6) {
      errors.push('New password must be at least 6 characters');
    }

    if (currentPassword && newPassword && currentPassword === newPassword) {
      errors.push('New password must be different from current password');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    next();
  } catch (error) {
    logger.error(`Password change validation error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Validation error occurred'
    });
  }
};

/**
 * Validate role creation data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.validateRoleCreation = (req, res, next) => {
  try {
    const { name, description } = req.body;
    const errors = [];

    if (!name) {
      errors.push('Role name is required');
    } else if (name.length < 2 || name.length > 50) {
      errors.push('Role name must be between 2 and 50 characters');
    } else if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      errors.push('Role name can only contain letters, numbers, underscores, and dashes');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    next();
  } catch (error) {
    logger.error(`Role creation validation error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Validation error occurred'
    });
  }
};