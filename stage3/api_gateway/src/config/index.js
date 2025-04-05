/**
 * API Gateway Configuration
 * 
 * Central configuration for the API Gateway
 */

require('dotenv').config();

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['*'],
  
  // Microservice URLs
  services: {
    auth: {
      url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001'
    },
    product: {
      url: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002'
    },
    inventory: {
      url: process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003'
    },
    store: {
      url: process.env.STORE_SERVICE_URL || 'http://localhost:3004'
    },
    report: {
      url: process.env.REPORT_SERVICE_URL || 'http://localhost:3005'
    }
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/api-gateway.log'
  }
};