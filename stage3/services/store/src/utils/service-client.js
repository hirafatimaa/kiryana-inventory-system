/**
 * Service Client Utility
 * 
 * Provides standardized HTTP clients for inter-service communication
 */

const axios = require('axios');
const config = require('../config');
const logger = require('./logger');

// Create instances for each service
const authClient = axios.create({
  baseURL: config.services.auth,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

const inventoryClient = axios.create({
  baseURL: config.services.inventory,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Add request logging
const addLogging = (client, serviceName) => {
  client.interceptors.request.use(
    (config) => {
      logger.debug(`Request to ${serviceName} service: ${config.method.toUpperCase()} ${config.url}`);
      return config;
    },
    (error) => {
      logger.error(`Request error to ${serviceName} service: ${error.message}`);
      return Promise.reject(error);
    }
  );

  client.interceptors.response.use(
    (response) => {
      logger.debug(`Response from ${serviceName} service: ${response.status}`);
      return response;
    },
    (error) => {
      if (error.response) {
        logger.error(`Error response from ${serviceName} service: ${error.response.status} - ${error.response.data?.error?.message || 'Unknown error'}`);
      } else {
        logger.error(`Network error with ${serviceName} service: ${error.message}`);
      }
      return Promise.reject(error);
    }
  );
};

// Add logging to all clients
addLogging(authClient, 'auth');
addLogging(inventoryClient, 'inventory');

// Add auth token to outgoing requests when provided
const addAuthToken = (token) => {
  const headers = { Authorization: `Bearer ${token}` };
  
  return {
    auth: (requestConfig = {}) => {
      const config = { ...requestConfig };
      config.headers = { ...headers, ...config.headers };
      return authClient(config);
    },
    
    inventory: (requestConfig = {}) => {
      const config = { ...requestConfig };
      config.headers = { ...headers, ...config.headers };
      return inventoryClient(config);
    }
  };
};

module.exports = {
  auth: authClient,
  inventory: inventoryClient,
  withToken: addAuthToken
};