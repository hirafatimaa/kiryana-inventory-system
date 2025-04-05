/**
 * Auth Middleware for API Gateway
 * 
 * Validates authentication and authorization for incoming requests
 */

const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Validate token with Auth Service
 * @param {Object} req - Express request object 
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
exports.validateToken = async (req, res, next) => {
  try {
    // Skip auth for public routes
    if (isPublicRoute(req.path)) {
      return next();
    }

    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    // Forward token to auth service for validation
    try {
      const response = await axios.get(`${config.services.auth.url}/profile`, {
        headers: {
          'Authorization': authHeader
        }
      });
      
      // Add user info to request
      req.user = response.data.user;
      req.role = response.data.user.role;
      
      next();
    } catch (error) {
      if (error.response) {
        // Auth service returned an error
        return res.status(error.response.status).json(error.response.data);
      }
      
      // Connection error
      logger.error(`Auth service connection error: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Authentication service unavailable'
      });
    }
  } catch (error) {
    logger.error(`Auth middleware error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Check if user has admin role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.isAdmin = (req, res, next) => {
  if (!req.role || req.role.name !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  
  next();
};

/**
 * Check if user has manager role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.isManager = (req, res, next) => {
  if (!req.role || (req.role.name !== 'admin' && req.role.name !== 'manager')) {
    return res.status(403).json({
      success: false,
      message: 'Manager access required'
    });
  }
  
  next();
};

/**
 * Check if a route is public (no auth required)
 * @param {String} path - Request path
 * @returns {Boolean} True if public route
 */
function isPublicRoute(path) {
  const publicRoutes = [
    '/api/v1/auth/login',
    '/api/v1/auth/register',
    '/api/v1/auth/refresh-token',
    '/health'
  ];
  
  return publicRoutes.some(route => path.startsWith(route));
}