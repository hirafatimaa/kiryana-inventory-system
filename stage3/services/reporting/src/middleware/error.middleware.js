/**
 * Error Middleware
 * 
 * Handles errors and provides consistent error responses
 */

const logger = require('../utils/logger');

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Resource not found: ${req.method} ${req.originalUrl}`
    }
  });
};

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error({
    message: 'Unhandled error',
    method: req.method,
    url: req.originalUrl,
    error: err.message,
    stack: err.stack
  });
  
  // Handle Axios errors specifically
  if (err.isAxiosError) {
    const status = err.response ? err.response.status : 500;
    const message = err.response && err.response.data && err.response.data.message 
      ? err.response.data.message
      : 'Error communicating with dependent service';
    
    return res.status(status).json({
      error: {
        code: 'SERVICE_ERROR',
        message,
        service: err.config ? err.config.baseURL : 'unknown'
      }
    });
  }
  
  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: err.errors
      }
    });
  }
  
  // Handle MongoDB duplicate key errors
  if (err.name === 'MongoError' && err.code === 11000) {
    return res.status(409).json({
      error: {
        code: 'DUPLICATE_ERROR',
        message: 'A duplicate entry was detected',
        details: err.keyValue
      }
    });
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Authentication token is invalid'
      }
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Authentication token has expired'
      }
    });
  }
  
  // Handle custom API errors
  if (err.statusCode && err.code) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details
      }
    });
  }
  
  // Default error response
  return res.status(500).json({
    error: {
      code: 'SERVER_ERROR',
      message: 'An unexpected error occurred',
      // Only include error details in development
      ...(process.env.NODE_ENV !== 'production' && {
        details: err.message,
        stack: err.stack
      })
    }
  });
};

module.exports = {
  notFoundHandler,
  errorHandler
};