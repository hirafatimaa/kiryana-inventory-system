/**
 * API Gateway Main Entry Point
 * 
 * Central API Gateway for the Kiryana Inventory System microservices
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');

const config = require('./config');
const logger = require('./utils/logger');
const authMiddleware = require('./middleware/auth.middleware');
const errorMiddleware = require('./middleware/error.middleware');

// Create Express app
const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(compression()); // Compress responses
app.use(express.json()); // Parse JSON requests
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded requests
app.use(morgan('combined')); // HTTP request logging

// CORS configuration
app.use(cors({
  origin: config.corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request logging middleware
app.use(logger.requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'UP',
    service: 'api-gateway',
    timestamp: new Date().toISOString()
  });
});

// Auth middleware for all routes
app.use(authMiddleware.validateToken);

// Service proxies
// Auth Service
app.use('/api/v1/auth', createProxyMiddleware({
  target: config.services.auth.url,
  pathRewrite: {
    '^/api/v1/auth': '/'
  },
  changeOrigin: true,
  logLevel: 'debug'
}));

// Product Service
app.use('/api/v1/products', createProxyMiddleware({
  target: config.services.product.url,
  pathRewrite: {
    '^/api/v1/products': '/'
  },
  changeOrigin: true,
  logLevel: 'debug'
}));

// Inventory Service
app.use('/api/v1/inventory', createProxyMiddleware({
  target: config.services.inventory.url,
  pathRewrite: {
    '^/api/v1/inventory': '/'
  },
  changeOrigin: true,
  logLevel: 'debug'
}));

// Store Service
app.use('/api/v1/stores', createProxyMiddleware({
  target: config.services.store.url,
  pathRewrite: {
    '^/api/v1/stores': '/'
  },
  changeOrigin: true,
  logLevel: 'debug'
}));

// Report Service
app.use('/api/v1/reports', createProxyMiddleware({
  target: config.services.report.url,
  pathRewrite: {
    '^/api/v1/reports': '/'
  },
  changeOrigin: true,
  logLevel: 'debug'
}));

// Error handling middleware
app.use(errorMiddleware.notFound);
app.use(errorMiddleware.errorHandler);

// Start server
const PORT = config.port || 3000;
app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT} in ${config.env} mode`);
  logger.info(`Service URLs:`);
  Object.keys(config.services).forEach(service => {
    logger.info(`- ${service}: ${config.services[service].url}`);
  });
});

module.exports = app;