/**
 * Reporting Service Configuration
 * 
 * Centralizes all configuration settings
 */

module.exports = {
  env: process.env.NODE_ENV || 'development',
  
  server: {
    port: process.env.PORT || 3004,
    basePath: process.env.BASE_PATH || '',
    corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['*']
  },
  
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/kiryana-reporting',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  },
  
  services: {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3000',
    product: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3001',
    inventory: process.env.INVENTORY_SERVICE_URL || 'http://localhost:3002',
    store: process.env.STORE_SERVICE_URL || 'http://localhost:3003'
  },
  
  reports: {
    cacheTimeMinutes: parseInt(process.env.REPORT_CACHE_MINUTES || 15)
  }
};