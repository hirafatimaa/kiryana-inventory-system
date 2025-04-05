/**
 * Service Client Utility
 * 
 * Manages API client instances for inter-service communication
 */

const axios = require('axios');
const config = require('../config');
const logger = require('./logger');

// Common request interceptor for all service clients
const requestInterceptor = (config) => {
  // Add request ID for tracing
  config.headers['X-Request-ID'] = Math.random().toString(36).substring(2, 15);
  
  // Add timestamp for metrics
  config.metadata = { startTime: new Date() };
  
  return config;
};

// Common response interceptor for all service clients
const responseInterceptor = (response) => {
  // Calculate request duration
  const duration = new Date() - response.config.metadata.startTime;
  
  logger.debug({
    message: `Service call successful`,
    service: response.config.baseURL,
    method: response.config.method.toUpperCase(),
    url: response.config.url,
    status: response.status,
    duration: `${duration}ms`
  });
  
  return response;
};

// Common error interceptor for all service clients
const errorInterceptor = (error) => {
  if (error.response) {
    // Calculate request duration
    const duration = new Date() - error.config.metadata.startTime;
    
    logger.warn({
      message: `Service call failed`,
      service: error.config.baseURL,
      method: error.config.method.toUpperCase(),
      url: error.config.url,
      status: error.response.status,
      data: error.response.data,
      duration: `${duration}ms`
    });
  } else if (error.request) {
    logger.error({
      message: `Service call failed - no response`,
      service: error.config.baseURL,
      method: error.config.method.toUpperCase(),
      url: error.config.url,
      error: error.message
    });
  } else {
    logger.error({
      message: `Service call setup failed`,
      error: error.message
    });
  }
  
  return Promise.reject(error);
};

// Create API client for Auth Service
const authClient = axios.create({
  baseURL: config.services.auth,
  timeout: 5000
});

// Create API client for Product Service
const productClient = axios.create({
  baseURL: config.services.product,
  timeout: 5000
});

// Create API client for Inventory Service
const inventoryClient = axios.create({
  baseURL: config.services.inventory,
  timeout: 10000 // Longer timeout for inventory operations
});

// Create API client for Store Service
const storeClient = axios.create({
  baseURL: config.services.store,
  timeout: 5000
});

// Apply interceptors to all clients
[authClient, productClient, inventoryClient, storeClient].forEach(client => {
  client.interceptors.request.use(requestInterceptor);
  client.interceptors.response.use(responseInterceptor, errorInterceptor);
});

// Function to set authorization header for all clients
const setAuthToken = (token) => {
  const authHeader = token ? `Bearer ${token}` : '';
  
  [authClient, productClient, inventoryClient, storeClient].forEach(client => {
    client.defaults.headers.common['Authorization'] = authHeader;
  });
};

module.exports = {
  auth: authClient,
  product: productClient,
  inventory: inventoryClient,
  store: storeClient,
  setAuthToken
};