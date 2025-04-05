/**
 * API Gateway Configuration
 * Kiryana Inventory System - Stage 3
 */

require('dotenv').config({ path: '../../.env' });

const config = {
  // API Gateway Configuration
  port: process.env.API_GATEWAY_PORT || 3000,
  host: process.env.API_GATEWAY_HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Service URLs
  services: {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    product: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002',
    inventory: process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003',
    store: process.env.STORE_SERVICE_URL || 'http://localhost:3004',
    reporting: process.env.REPORTING_SERVICE_URL || 'http://localhost:3005'
  },
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'default_jwt_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d'
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: eval(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100 // limit each IP to 100 requests per windowMs
  },
  
  // Logger Configuration
  logger: {
    level: process.env.LOG_LEVEL || 'info'
  }
};

module.exports = config;