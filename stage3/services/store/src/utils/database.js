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
    
    // Check if we need to seed default data
    const Store = require('../models/store');
    const storeCount = await Store.countDocuments();
    
    if (storeCount === 0) {
      logger.info('Creating default store...');
      
      // Create a default store
      const defaultStore = new Store({
        name: 'Main Store',
        code: 'MAIN',
        address: {
          street: '123 Main Street',
          city: 'Karachi',
          province: 'Sindh',
          postalCode: '75300',
          country: 'Pakistan'
        },
        phone: '+92 21 1234 5678',
        email: 'main@kiryana.com',
        isActive: true
      });
      
      await defaultStore.save();
      logger.info('Default store created successfully');
    }
    
    return;
  } catch (error) {
    logger.error(`Database initialization error: ${error.message}`);
    throw error;
  }
};