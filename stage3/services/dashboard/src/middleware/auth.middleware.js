/**
 * Authentication Middleware
 * 
 * Middleware for handling authentication and authorization
 */

const { auth } = require('../utils/service-client');
const logger = require('../utils/logger');

/**
 * Authenticate middleware
 * Verifies the JWT token from the request header and attaches user info to the request
 */
exports.authenticate = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }
    
    // Call auth service to verify token
    const response = await auth.post('/auth/verify', {
      token: authHeader.replace('Bearer ', '')
    });
    
    // Attach user info to request
    req.user = response.data.user;
    
    next();
  } catch (error) {
    // Handle auth service errors
    if (error.response) {
      const { status, data } = error.response;
      
      if (status === 401) {
        return res.status(401).json({
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired token'
          }
        });
      }
      
      logger.error('Auth service error:', data);
    } else {
      logger.error('Auth middleware error:', error.message);
    }
    
    return res.status(500).json({
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed'
      }
    });
  }
};

/**
 * Authorize middleware
 * Checks if user has the required roles or permissions
 * @param {Array} roles Array of required roles
 */
exports.authorize = (roles) => {
  return (req, res, next) => {
    // Check if user exists on the request (should be added by authenticate middleware)
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }
    
    // If no roles are specified, allow access
    if (!roles || roles.length === 0) {
      return next();
    }
    
    // Check if user has any of the required roles
    const hasRole = roles.some(role => req.user.roles.includes(role));
    
    if (!hasRole) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this resource'
        }
      });
    }
    
    next();
  };
};