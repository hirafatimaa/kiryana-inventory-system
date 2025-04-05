/**
 * Error Handling Middleware
 * 
 * Centralizes error handling for the application
 */

const logger = require('../utils/logger');

/**
 * Handles 404 Not Found errors
 */
exports.notFoundHandler = (req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route not found: ${req.method} ${req.originalUrl}`
    }
  });
};

/**
 * Handles all uncaught errors in the application
 */
exports.errorHandler = (err, req, res, next) => {
  // Log the error for internal tracking
  logger.error('Unhandled error:', err);
  
  // Check if headers are already sent
  if (res.headersSent) {
    return next(err);
  }
  
  // Handle different types of errors
  if (err.name === 'ValidationError') {
    // Mongoose validation error
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: Object.values(err.errors).map(e => e.message)
      }
    });
  }
  
  if (err.name === 'CastError') {
    // Mongoose cast error (invalid ID, etc)
    return res.status(400).json({
      error: {
        code: 'INVALID_ID',
        message: 'Invalid ID format'
      }
    });
  }
  
  if (err.code === 11000) {
    // MongoDB duplicate key error
    return res.status(409).json({
      error: {
        code: 'DUPLICATE_ERROR',
        message: 'A resource with that identifier already exists'
      }
    });
  }
  
  // Default error response
  res.status(err.statusCode || 500).json({
    error: {
      code: err.code || 'SERVER_ERROR',
      message: err.message || 'An unexpected error occurred'
    }
  });
};