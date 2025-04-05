/**
 * Product Service Server
 * 
 * Server initialization and startup
 */

const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error(`UNCAUGHT EXCEPTION: ${error.message}`, {
    stack: error.stack,
    name: error.name
  });
  // Exit with failure
  process.exit(1);
});

// Start the server
const PORT = config.server.port;
const server = app.listen(PORT, () => {
  logger.info(`Product service running on port ${PORT} in ${config.env} mode`);
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('UNHANDLED REJECTION: ', {
    reason: reason.toString(),
    stack: reason.stack
  });
  // Gracefully shutdown
  server.close(() => {
    process.exit(1);
  });
});

// Graceful shutdown on SIGTERM
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
  });
});

module.exports = server;