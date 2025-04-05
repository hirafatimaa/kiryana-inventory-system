/**
 * Auth Service Server
 * 
 * Server entry point for the auth microservice
 */

const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`);
  logger.error(error.stack);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}`);
  logger.error(`Reason: ${reason}`);
});

// Handle termination signals
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully');
  process.exit(0);
});

// Start server
const server = app.listen(config.server.port, () => {
  logger.info(`Auth Service running on port ${config.server.port} in ${config.server.env} mode`);
  logger.info(`API base path: ${config.server.basePath}`);
});

module.exports = server;