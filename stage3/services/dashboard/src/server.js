/**
 * Server Entry Point
 * 
 * Starts the HTTP server for the Dashboard Service
 */

const http = require('http');
const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');

// Create HTTP server
const server = http.createServer(app);

// Start server
server.listen(config.port, () => {
  logger.info(`${config.name} running on port ${config.port} in ${config.env} mode`);
});

// Handle server errors
server.on('error', (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }
  
  switch (error.code) {
    case 'EACCES':
      logger.error(`Port ${config.port} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(`Port ${config.port} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  
  // Gracefully shutdown the server
  server.close(() => {
    logger.info('Server closed');
    process.exit(1);
  });
  
  // If graceful shutdown fails, force exit after timeout
  setTimeout(() => {
    logger.error('Forcing server shutdown');
    process.exit(1);
  }, 5000);
});