/**
 * Service Client
 * 
 * Provides HTTP clients for making requests to other microservices
 */

const axios = require('axios');
const config = require('../config');
const logger = require('./logger');

// Create base axios instances for each service
const createServiceClient = (baseURL) => {
  const client = axios.create({
    baseURL,
    timeout: 10000, // 10 seconds
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  // Add request interceptor
  client.interceptors.request.use(
    (config) => {
      logger.debug(`Making request to ${config.baseURL}${config.url}`);
      return config;
    },
    (error) => {
      logger.error('Request error:', error.message);
      return Promise.reject(error);
    }
  );
  
  // Add response interceptor
  client.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      if (error.response) {
        const { status, data, config } = error.response;
        logger.error(`Error ${status} from ${config.url}:`, data);
      } else if (error.request) {
        logger.error('No response received:', error.message);
      } else {
        logger.error('Request setup error:', error.message);
      }
      return Promise.reject(error);
    }
  );
  
  return client;
};

// Create service clients
const auth = createServiceClient(config.services.auth);
const product = createServiceClient(config.services.product);
const inventory = createServiceClient(config.services.inventory);
const store = createServiceClient(config.services.store);
const reporting = createServiceClient(config.services.reporting);

module.exports = {
  auth,
  product,
  inventory,
  store,
  reporting
};