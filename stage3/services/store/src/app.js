/**
 * Store Service
 * 
 * Main application file for the Store microservice
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const db = require('./utils/database');
const config = require('./config');
const logger = require('./utils/logger');

// Import routes
const storeRoutes = require('./routes/store.routes');

// Import middleware
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');

// Initialize Express app
const app = express();

// Apply basic middleware
app.use(helmet());
app.use(cors({ origin: config.server.corsOrigins }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));
app.use(logger.requestLogger);

// Define base path
const basePath = config.server.basePath ? config.server.basePath : '';

// Health check endpoint
app.get(`${basePath}/health`, (req, res) => {
  res.json({
    status: 'healthy',
    service: 'store-service',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Register routes
app.use(`${basePath}/stores`, storeRoutes);

// Apply error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Function to start the server
const startServer = async () => {
  try {
    // Connect to database
    await db.connect();
    
    // Initialize database with default data if needed
    await db.initialize();
    
    // Start the server
    const PORT = config.server.port;
    app.listen(PORT, () => {
      logger.info(`Store service running on port ${PORT}`);
      logger.info(`Environment: ${config.env}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  // Give time for logs to flush then exit
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection:', reason);
});

// Start the server if this is the main module
if (require.main === module) {
  startServer();
}

// Export for testing
module.exports = { app, startServer };