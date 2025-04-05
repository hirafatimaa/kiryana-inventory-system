/**
 * Logger Utility
 * 
 * Provides standardized logging throughout the application
 */

const winston = require('winston');
const config = require('../config');

// Define the custom format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const metaInfo = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} [${level.toUpperCase()}]: ${message}${metaInfo}`;
  })
);

// Create the winston logger
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports: [
    new winston.transports.Console()
  ]
});

// Add request logger middleware for express
const requestLogger = (req, res, next) => {
  // Skip logging health check requests to reduce noise
  if (req.path === '/health') {
    return next();
  }
  
  const startTime = new Date();
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;
  
  // Log request
  logger.info(`[${requestId}] Request received: ${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    requestId,
  });
  
  // Log response
  res.on('finish', () => {
    const duration = new Date() - startTime;
    const level = res.statusCode >= 400 ? 'warn' : 'info';
    
    logger[level](`[${requestId}] Response sent: ${res.statusCode} (${duration}ms)`, {
      statusCode: res.statusCode,
      duration,
      requestId,
    });
  });
  
  next();
};

// Export the logger and middleware
module.exports = {
  info: logger.info.bind(logger),
  error: logger.error.bind(logger),
  warn: logger.warn.bind(logger),
  debug: logger.debug.bind(logger),
  requestLogger
};