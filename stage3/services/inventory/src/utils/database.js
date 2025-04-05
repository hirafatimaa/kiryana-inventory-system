/**
 * Database Utility
 * 
 * Connects to MongoDB and provides database initialization
 */

const mongoose = require('mongoose');
const config = require('../config');
const logger = require('./logger');

/**
 * Connect to MongoDB
 * @returns {Promise} Mongoose connection promise
 */
exports.connect = async () => {
  try {
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(config.database.uri, config.database.options);
    logger.info('Connected to MongoDB successfully');
    return mongoose.connection;
  } catch (error) {
    logger.error(`MongoDB connection error: ${error.message}`);
    throw error;
  }
};

/**
 * Initialize database with default data
 * @returns {Promise<void>}
 */
exports.initialize = async () => {
  try {
    logger.info('Initializing database...');
    
    // No default data needed for the inventory service
    // This is primarily for movement records which are created through API usage
    
    return;
  } catch (error) {
    logger.error(`Database initialization error: ${error.message}`);
    throw error;
  }
};