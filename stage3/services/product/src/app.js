/**
 * Product Service Main Application
 * 
 * Entry point for the product microservice
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const config = require('./config');
const database = require('./utils/database');
const logger = require('./utils/logger');
const errorMiddleware = require('./middleware/error.middleware');
const authMiddleware = require('./middleware/auth.middleware');

// Import routes
const productRoutes = require('./routes/product.routes');
const categoryRoutes = require('./routes/category.routes');

// Initialize express app
const app = express();

// Connect to database
database.connect()
  .then(() => {
    // Initialize database with default data if needed
    return database.initialize();
  })
  .then(() => {
    logger.info('Database initialized successfully');
  })
  .catch((error) => {
    logger.error(`Database initialization error: ${error.message}`);
    process.exit(1);
  });

// Middleware
app.use(helmet()); // Security headers
app.use(compression()); // Compress responses
app.use(express.json()); // Parse JSON requests
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded requests
app.use(morgan('combined')); // HTTP request logging

// CORS configuration
app.use(cors({
  origin: config.server.corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request logging middleware
app.use(logger.requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'UP',
    service: 'product-service',
    timestamp: new Date().toISOString()
  });
});

// API routes
const basePath = config.server.basePath;
app.use(`${basePath}/products`, authMiddleware.verifyToken, productRoutes);
app.use(`${basePath}/categories`, authMiddleware.verifyToken, categoryRoutes);

// Error handling middleware
app.use(errorMiddleware.notFound);
app.use(errorMiddleware.errorHandler);

module.exports = app;