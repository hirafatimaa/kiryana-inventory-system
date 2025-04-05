/**
 * Logger Utility
 * 
 * Provides consistent logging functionality across the service
 */

const winston = require('winston');
const config = require('../config');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: config.logs.level,
  format: logFormat,
  defaultMeta: { service: 'reporting-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
          return `${timestamp} [${service}] ${level}: ${message} ${
            Object.keys(meta).length ? JSON.stringify(meta) : ''
          }`;
        })
      )
    })
  ]
});

// Add request logger middleware
const requestLogger = (req, res, next) => {
  const startTime = new Date();
  
  // Once the request is finished
  res.on('finish', () => {
    const duration = new Date() - startTime;
    
    logger.info({
      message: 'HTTP Request',
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent'),
      requestId: req.id
    });
  });
  
  next();
};

module.exports = {
  error: logger.error.bind(logger),
  warn: logger.warn.bind(logger),
  info: logger.info.bind(logger),
  debug: logger.debug.bind(logger),
  requestLogger
};