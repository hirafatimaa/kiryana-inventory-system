/**
 * Authentication Middleware
 * 
 * Handles token verification and authorization
 */

const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Middleware to verify user tokens
 * This communicates with the auth service to validate the token
 */
exports.verifyToken = async (req, res, next) => {
  try {
    // Get token from request headers
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const error = new Error('No authentication token provided');
      error.statusCode = 401;
      return next(error);
    }
    
    const token = authHeader.split(' ')[1];
    
    // Call auth service to verify token
    const authServiceUrl = `${config.auth.serviceUrl}/auth/verify`;
    logger.debug(`Verifying token with auth service at ${authServiceUrl}`);
    
    const response = await axios.post(authServiceUrl, { token });
    
    if (response.data && response.data.success) {
      // Add user data to request object
      req.user = response.data.user;
      return next();
    } else {
      const error = new Error('Invalid or expired token');
      error.statusCode = 401;
      return next(error);
    }
  } catch (error) {
    // Handle auth service errors
    if (error.response) {
      // Auth service responded with an error
      const statusCode = error.response.status;
      const message = error.response.data.error?.message || 'Authentication failed';
      
      const authError = new Error(message);
      authError.statusCode = statusCode;
      return next(authError);
    }
    
    // Network or other errors
    logger.error(`Auth service error: ${error.message}`);
    const serverError = new Error('Authentication service unavailable');
    serverError.statusCode = 503;
    return next(serverError);
  }
};

/**
 * Middleware to check user roles/permissions
 * @param {string[]} requiredRoles - Array of roles that have access
 */
exports.requireRole = (requiredRoles) => {
  return (req, res, next) => {
    // User should be attached from verifyToken middleware
    if (!req.user) {
      const error = new Error('User not authenticated');
      error.statusCode = 401;
      return next(error);
    }
    
    // Check if user has one of the required roles
    const userRoles = req.user.roles || [];
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      const error = new Error('Insufficient permissions');
      error.statusCode = 403;
      return next(error);
    }
    
    next();
  };
};