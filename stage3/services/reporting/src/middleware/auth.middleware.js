/**
 * Authentication Middleware
 * 
 * Handles authentication and authorization for API routes
 */

const { auth } = require('../utils/service-client');
const logger = require('../utils/logger');

/**
 * Authenticate middleware
 * 
 * Verifies JWT tokens and adds user data to request
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token with Auth service
    try {
      const response = await auth.post('/api/auth/verify', { token });
      req.user = response.data.user;
      
      // Pass token to other services
      const { setAuthToken } = require('../utils/service-client');
      setAuthToken(token);
      
      next();
    } catch (err) {
      if (err.response && err.response.status === 401) {
        return res.status(401).json({
          error: {
            code: 'INVALID_TOKEN',
            message: 'Authentication token is invalid or expired'
          }
        });
      }
      throw err;
    }
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Authentication service unavailable'
      }
    });
  }
};

/**
 * Authorize middleware
 * 
 * Checks if authenticated user has required roles
 * 
 * @param {string[]} roles - Array of allowed roles
 */
const authorize = (roles = []) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        });
      }
      
      const userRoles = req.user.roles || [];
      
      // Always allow admin role
      if (userRoles.includes('admin')) {
        return next();
      }
      
      // Check if user has any of the required roles
      const hasPermission = roles.some(role => userRoles.includes(role));
      
      if (!hasPermission) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to access this resource'
          }
        });
      }
      
      next();
    } catch (error) {
      logger.error('Authorization middleware error:', error);
      return res.status(500).json({
        error: {
          code: 'SERVER_ERROR',
          message: 'Authorization service unavailable'
        }
      });
    }
  };
};

module.exports = {
  authenticate,
  authorize
};