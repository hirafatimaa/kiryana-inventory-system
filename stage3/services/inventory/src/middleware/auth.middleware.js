/**
 * Authentication Middleware
 * 
 * Verifies JWT tokens for protected routes
 */

const { auth } = require('../utils/service-client');
const logger = require('../utils/logger');

/**
 * Authentication middleware
 * Verifies JWTs and attaches user information to the request
 */
exports.authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication token is missing'
        }
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token with auth service
    try {
      const response = await auth.post('/auth/verify', { token });
      req.user = response.data.user;
      next();
    } catch (error) {
      if (error.response && error.response.status === 401) {
        return res.status(401).json({
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired token'
          }
        });
      }
      
      logger.error('Auth service error:', error);
      return res.status(500).json({
        error: {
          code: 'AUTH_SERVICE_ERROR',
          message: 'Authentication service unavailable'
        }
      });
    }
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Internal server error during authentication'
      }
    });
  }
};

/**
 * Role-based authorization middleware
 * Ensures user has required permissions
 * 
 * @param {string[]} roles Array of role names required for the route
 * @returns {Function} Express middleware function
 */
exports.authorize = (roles = []) => {
  return (req, res, next) => {
    // Make sure authenticate middleware was used first
    if (!req.user) {
      return res.status(500).json({
        error: {
          code: 'MIDDLEWARE_ERROR',
          message: 'Authorization middleware used without authentication'
        }
      });
    }

    // Check if user has one of the required roles
    if (roles.length && !roles.some(role => req.user.roles.includes(role))) {
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