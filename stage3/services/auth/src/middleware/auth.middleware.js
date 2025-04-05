/**
 * Auth Middleware
 * 
 * Authentication and authorization middleware
 */

const jwtUtil = require('../utils/jwt');
const User = require('../models/user.model');
const Role = require('../models/role.model');
const logger = require('../utils/logger');

/**
 * Verify JWT token in Authorization header
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.verifyToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    // Extract token
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwtUtil.verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Find user
    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Add user to request object
    req.user = user;
    req.role = decoded.role;
    
    next();
  } catch (error) {
    logger.error(`Auth middleware error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

/**
 * Check if user has admin role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.isAdmin = async (req, res, next) => {
  try {
    if (req.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    next();
  } catch (error) {
    logger.error(`Admin check middleware error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Authorization check failed'
    });
  }
};

/**
 * Check if user has manager role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.isManager = async (req, res, next) => {
  try {
    if (req.role !== 'admin' && req.role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Manager access required'
      });
    }
    next();
  } catch (error) {
    logger.error(`Manager check middleware error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Authorization check failed'
    });
  }
};