/**
 * Database Utility
 * 
 * Manages database connection and initialization
 */

const mongoose = require('mongoose');
const config = require('../config');
const logger = require('./logger');

/**
 * Connect to MongoDB database
 */
const connect = async () => {
  try {
    logger.info(`Connecting to MongoDB: ${config.db.uri}`);
    
    await mongoose.connect(config.db.uri, config.db.options);
    
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });
    
    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });
    
    logger.info('MongoDB connected successfully');
    return mongoose.connection;
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    throw error;
  }
};

/**
 * Disconnect from MongoDB database
 */
const disconnect = async () => {
  try {
    logger.info('Disconnecting from MongoDB');
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB:', error);
    throw error;
  }
};

/**
 * Initialize database with default data
 */
const initialize = async () => {
  try {
    // No default data needs to be initialized for the reporting service
    // This function is provided for consistency with other services
    logger.info('Database initialization complete');
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
};

/**
 * Clear all collections (for testing)
 */
const clearCollections = async () => {
  if (config.env !== 'test') {
    logger.warn('Attempted to clear collections in non-test environment');
    return;
  }
  
  try {
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
    
    logger.info('All collections cleared');
  } catch (error) {
    logger.error('Error clearing collections:', error);
    throw error;
  }
};

module.exports = {
  connect,
  disconnect,
  initialize,
  clearCollections
};