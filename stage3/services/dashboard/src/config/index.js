/**
 * Configuration
 * 
 * Application configuration loaded from environment variables with sensible defaults
 */

// Load environment variables
require('dotenv').config();

// Service endpoint URIs
const serviceEndpoints = {
  // Use environment variables with fallbacks to default microservice ports
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001/api',
  product: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002/api',
  inventory: process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003/api',
  store: process.env.STORE_SERVICE_URL || 'http://localhost:3004/api',
  reporting: process.env.REPORTING_SERVICE_URL || 'http://localhost:3005/api',
};

// Main configuration object
const config = {
  // Service info
  name: 'dashboard-service',
  version: '1.0.0',
  
  // Environment
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3006', 10),
  
  // Logging
  logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  
  // MongoDB
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/kiryana-dashboard',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
  
  // Services
  services: serviceEndpoints,
  
  // Dashboard settings
  dashboard: {
    widgetCacheTimeMinutes: parseInt(process.env.WIDGET_CACHE_TIME_MINUTES || '5', 10),
    defaultWidget: {
      refreshInterval: 60 * 1000, // 1 minute
      lowStockThreshold: 10,
    },
  },
  
  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },
};

module.exports = config;