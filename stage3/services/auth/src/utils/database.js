/**
 * Database Utility
 * 
 * Database connection and initialization functions
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const config = require('../config');
const logger = require('./logger');
const User = require('../models/user.model');
const Role = require('../models/role.model');

/**
 * Connect to MongoDB
 * @returns {Promise} Connection promise
 */
exports.connect = async () => {
  try {
    logger.info(`Connecting to MongoDB at ${config.database.uri.split('@').pop()}`);
    await mongoose.connect(config.database.uri, config.database.options);
    logger.info('MongoDB connected successfully');
    return mongoose.connection;
  } catch (error) {
    logger.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

/**
 * Initialize database with default data
 * @returns {Promise} Initialization promise
 */
exports.initialize = async () => {
  try {
    // Create default roles if they don't exist
    const roles = await Role.find({});
    if (roles.length === 0) {
      logger.info('Creating default roles...');
      await Role.insertMany([
        { name: 'admin', description: 'Administrator with full access' },
        { name: 'manager', description: 'Store manager with limited administrative access' },
        { name: 'staff', description: 'Regular staff member with basic access' }
      ]);
      logger.info('Default roles created successfully');
    }

    // Create default admin user if no users exist
    const userCount = await User.countDocuments({});
    if (userCount === 0) {
      logger.info('Creating default admin user...');
      const adminRole = await Role.findOne({ name: 'admin' });
      
      if (!adminRole) {
        throw new Error('Admin role not found');
      }
      
      const hashedPassword = await bcrypt.hash('admin123', config.security.passwordSaltRounds);
      
      const adminUser = new User({
        username: 'admin',
        email: 'admin@kiryana.com',
        password: hashedPassword,
        firstName: 'System',
        lastName: 'Administrator',
        isActive: true,
        role: adminRole._id
      });
      
      await adminUser.save();
      logger.info('Default admin user created successfully');
    }
    
    return true;
  } catch (error) {
    logger.error(`Database initialization error: ${error.message}`);
    throw error;
  }
};