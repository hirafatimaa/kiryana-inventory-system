/**
 * API Gateway Entry Point
 * Kiryana Inventory System - Stage 3
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');

const config = require('./config');

// Create Express app
const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Kiryana Inventory System API Gateway - Stage 3',
    version: '3.0.0',
    services: Object.keys(config.services)
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'UP' });
});

// Auth Service Proxy
app.use('/api/v1/auth', createProxyMiddleware({
  target: config.services.auth,
  changeOrigin: true,
  pathRewrite: {
    '^/api/v1/auth': ''
  }
}));

// Product Service Proxy
app.use('/api/v1/products', createProxyMiddleware({
  target: config.services.product,
  changeOrigin: true,
  pathRewrite: {
    '^/api/v1/products': ''
  }
}));

// Inventory Service Proxy
app.use('/api/v1/inventory', createProxyMiddleware({
  target: config.services.inventory,
  changeOrigin: true,
  pathRewrite: {
    '^/api/v1/inventory': ''
  }
}));

// Store Service Proxy
app.use('/api/v1/stores', createProxyMiddleware({
  target: config.services.store,
  changeOrigin: true,
  pathRewrite: {
    '^/api/v1/stores': ''
  }
}));

// Reporting Service Proxy
app.use('/api/v1/reports', createProxyMiddleware({
  target: config.services.reporting,
  changeOrigin: true,
  pathRewrite: {
    '^/api/v1/reports': ''
  }
}));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('API Gateway Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'Something went wrong'
  });
});

// Start the server
const PORT = config.port || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log('Available services:');
  Object.entries(config.services).forEach(([service, url]) => {
    console.log(`- ${service}: ${url}`);
  });
});

module.exports = app;