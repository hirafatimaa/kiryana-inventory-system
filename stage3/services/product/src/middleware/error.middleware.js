/**
 * Error Handling Middleware
 * 
 * Centralized error handling for the application
 */

const logger = require('../utils/logger');

/**
 * Not found middleware - handles 404 errors
 */
exports.notFound = (req, res, next) => {
  const error = new Error(`Resource not found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

/**
 * General error handling middleware
 */
exports.errorHandler = (err, req, res, next) => {
  // Set default status code if not specified
  const statusCode = err.statusCode || 500;
  
  // Determine error type for the response
  const errorType = statusCode === 404 ? 'NOT_FOUND' :
                   statusCode === 400 ? 'BAD_REQUEST' :
                   statusCode === 401 ? 'UNAUTHORIZED' :
                   statusCode === 403 ? 'FORBIDDEN' :
                   'SERVER_ERROR';
  
  // Log error details
  if (statusCode >= 500) {
    logger.error(`Error: ${err.message}`, {
      stack: err.stack,
      url: req.originalUrl,
      method: req.method
    });
  } else {
    logger.warn(`Error: ${err.message}`, {
      url: req.originalUrl,
      method: req.method
    });
  }
  
  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      type: errorType,
      message: process.env.NODE_ENV === 'production' && statusCode >= 500 
        ? 'Internal server error' 
        : err.message
    }
  });
};