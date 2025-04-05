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
    
    // Check if we need to add any default data
    const Category = require('../models/category');
    const defaultCategories = [
      { name: 'Groceries', description: 'Food and grocery items' },
      { name: 'Electronics', description: 'Electronic devices and accessories' },
      { name: 'Household', description: 'Household items and supplies' }
    ];
    
    // Add default categories if none exist
    const categoriesCount = await Category.countDocuments();
    if (categoriesCount === 0) {
      logger.info('Adding default categories...');
      await Category.insertMany(defaultCategories);
      logger.info('Default categories added successfully');
    }
    
    return;
  } catch (error) {
    logger.error(`Database initialization error: ${error.message}`);
    throw error;
  }
};