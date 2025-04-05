/**
 * Configuration Module
 * 
 * Manages configuration settings for the reporting service
 */

require('dotenv').config();

// Default configuration values
const config = {
  env: process.env.NODE_ENV || 'development',
  
  // Server configuration
  server: {
    port: parseInt(process.env.PORT, 10) || 3004,
    basePath: process.env.API_BASE_PATH || '',
    corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['*']
  },
  
  // Database configuration
  db: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/kiryana-reporting',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  },
  
  // Service URLs
  services: {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    product: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3001',
    inventory: process.env.INVENTORY_SERVICE_URL || 'http://localhost:3002',
    store: process.env.STORE_SERVICE_URL || 'http://localhost:3003'
  },
  
  // Reporting settings
  reports: {
    cacheTimeMinutes: parseInt(process.env.REPORT_CACHE_MINUTES, 10) || 15,
    defaultExportFormat: process.env.DEFAULT_EXPORT_FORMAT || 'json'
  },
  
  // Logging configuration
  logs: {
    level: process.env.LOG_LEVEL || 'info'
  }
};

// Environment-specific overrides
if (config.env === 'test') {
  config.db.uri = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/kiryana-reporting-test';
}

module.exports = config;