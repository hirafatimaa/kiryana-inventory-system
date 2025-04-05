/**
 * Authentication Middleware
 * 
 * Validates JWT tokens and authenticates API requests
 */

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Middleware to validate the JWT token from the request
 * Sets user information in the request object if valid
 */
exports.validateToken = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: { message: 'Authentication required', status: 401 }
      });
    }

    // Extract the token
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Set user information on the request object
    req.user = decoded;
    
    // Log the authenticated request
    logger.debug(`Authenticated request from user ${decoded.id} with role ${decoded.role}`);
    
    // Continue with the request
    next();
  } catch (error) {
    // Handle different JWT errors
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: { message: 'Token expired', status: 401 }
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: { message: 'Invalid token', status: 401 }
      });
    }
    
    // Handle any other errors
    logger.error(`Authentication error: ${error.message}`);
    return res.status(500).json({ 
      error: { message: 'Authentication failed', status: 500 }
    });
  }
};

/**
 * Middleware to check user role permissions
 * @param {string[]} allowedRoles - Array of role names that have access
 */
exports.checkRole = (allowedRoles) => {
  return (req, res, next) => {
    // Must be called after validateToken middleware
    if (!req.user) {
      return res.status(401).json({ 
        error: { message: 'Authentication required', status: 401 }
      });
    }
    
    // Check if user role is in the allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`Access denied for user ${req.user.id} with role ${req.user.role}`);
      return res.status(403).json({ 
        error: { message: 'Access denied', status: 403 }
      });
    }
    
    // User has permission, continue
    next();
  };
};