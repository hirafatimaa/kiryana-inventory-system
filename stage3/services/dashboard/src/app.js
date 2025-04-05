/**
 * Dashboard Service
 * 
 * Provides APIs for dashboard management and widget data
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const config = require('./config');
const logger = require('./utils/logger');

// Import routes
const dashboardRoutes = require('./routes/dashboard-preference.routes');
const widgetRoutes = require('./routes/widget.routes');

// Create Express app
const app = express();

// Database connection
mongoose.connect(config.mongodb.uri, config.mongodb.options)
  .then(() => {
    logger.info('Connected to MongoDB');
  })
  .catch((err) => {
    logger.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

// Apply middleware
app.use(cors(config.cors));
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting
app.use(rateLimit(config.rateLimit));

// Request logging
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: config.name,
    version: config.version,
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/dashboards', dashboardRoutes);
app.use('/api/widgets', widgetRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`${err.name}: ${err.message}`);
  logger.error(err.stack);
  
  // Handle mongoose validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(error => error.message);
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors
      }
    });
  }
  
  // Handle mongoose duplicate key error
  if (err.code === 11000) {
    return res.status(409).json({
      error: {
        code: 'DUPLICATE_ERROR',
        message: 'Duplicate key error',
        details: err.keyValue
      }
    });
  }
  
  // Default error response
  res.status(err.status || 500).json({
    error: {
      code: err.code || 'SERVER_ERROR',
      message: err.message || 'Internal server error'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Resource not found: ${req.method} ${req.originalUrl}`
    }
  });
});

module.exports = app;