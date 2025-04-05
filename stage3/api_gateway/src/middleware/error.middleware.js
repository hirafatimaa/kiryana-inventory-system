/**
 * Error Middleware for API Gateway
 * 
 * Global error handling middleware
 */

const logger = require('../utils/logger');

/**
 * Not found handler - 404
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.status = 404;
  next(error);
};

/**
 * Global error handler
 * @param {Object} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.errorHandler = (err, req, res, next) => {
  // Set status code
  const statusCode = err.status || 500;
  
  // Log the error
  if (statusCode >= 500) {
    logger.error(`Error ${statusCode}: ${err.message}`);
    logger.error(err.stack);
  } else {
    logger.warn(`Error ${statusCode}: ${err.message}`);
  }
  
  // Send error response
  res.status(statusCode).json({
    success: false,
    message: statusCode >= 500 ? 'Internal Server Error' : err.message,
    error: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
};