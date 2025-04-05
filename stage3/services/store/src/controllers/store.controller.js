/**
 * Store Controller
 * 
 * Handles operations related to store management
 */

const Store = require('../models/store');
const logger = require('../utils/logger');

/**
 * Create a new store
 */
exports.createStore = async (req, res, next) => {
  try {
    // Validate store code format (uppercase alphanumeric)
    if (req.body.code && !/^[A-Z0-9]{2,10}$/.test(req.body.code)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_STORE_CODE',
          message: 'Store code must be 2-10 uppercase alphanumeric characters'
        }
      });
    }
    
    // Create store with request data
    const store = new Store(req.body);
    
    // Save to database
    await store.save();
    
    logger.info(`New store created: ${store.name} (${store.code})`);
    
    // Return created store
    return res.status(201).json(store);
  } catch (error) {
    return next(error);
  }
};

/**
 * Get all stores with optional filtering
 */
exports.getStores = async (req, res, next) => {
  try {
    const { 
      isActive, 
      query, 
      page = 1, 
      limit = 50,
      sort = 'name'
    } = req.query;
    
    // Build filter criteria
    const filter = {};
    
    // Active status filter
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    
    // Text search
    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { code: { $regex: query, $options: 'i' } },
        { 'address.city': { $regex: query, $options: 'i' } }
      ];
    }
    
    // Parse pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute query with pagination
    const stores = await Store.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .exec();
    
    // Get total count for pagination metadata
    const total = await Store.countDocuments(filter);
    
    return res.json({
      data: stores,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get a store by ID
 */
exports.getStoreById = async (req, res, next) => {
  try {
    const store = await Store.findById(req.params.id);
    
    if (!store) {
      return res.status(404).json({
        error: {
          code: 'STORE_NOT_FOUND',
          message: 'Store not found'
        }
      });
    }
    
    return res.json(store);
  } catch (error) {
    return next(error);
  }
};

/**
 * Update a store
 */
exports.updateStore = async (req, res, next) => {
  try {
    // Find store
    const store = await Store.findById(req.params.id);
    
    if (!store) {
      return res.status(404).json({
        error: {
          code: 'STORE_NOT_FOUND',
          message: 'Store not found'
        }
      });
    }
    
    // Don't allow code changes if trying to update it
    if (req.body.code && req.body.code !== store.code) {
      return res.status(400).json({
        error: {
          code: 'IMMUTABLE_FIELD',
          message: 'Store code cannot be changed once set'
        }
      });
    }
    
    // Update fields
    Object.keys(req.body).forEach(key => {
      // Skip _id to prevent overwrite attempts
      if (key !== '_id' && key !== 'id') {
        store[key] = req.body[key];
      }
    });
    
    // Save updates
    await store.save();
    
    logger.info(`Store updated: ${store.name} (${store.code})`);
    
    return res.json(store);
  } catch (error) {
    return next(error);
  }
};

/**
 * Deactivate a store
 */
exports.deactivateStore = async (req, res, next) => {
  try {
    // Find and update store status
    const store = await Store.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true, runValidators: true }
    );
    
    if (!store) {
      return res.status(404).json({
        error: {
          code: 'STORE_NOT_FOUND',
          message: 'Store not found'
        }
      });
    }
    
    logger.info(`Store deactivated: ${store.name} (${store.code})`);
    
    return res.json(store);
  } catch (error) {
    return next(error);
  }
};

/**
 * Activate a store
 */
exports.activateStore = async (req, res, next) => {
  try {
    // Find and update store status
    const store = await Store.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true, runValidators: true }
    );
    
    if (!store) {
      return res.status(404).json({
        error: {
          code: 'STORE_NOT_FOUND',
          message: 'Store not found'
        }
      });
    }
    
    logger.info(`Store activated: ${store.name} (${store.code})`);
    
    return res.json(store);
  } catch (error) {
    return next(error);
  }
};

/**
 * Find nearby stores
 */
exports.findNearbyStores = async (req, res, next) => {
  try {
    const { latitude, longitude, radius = 10, isActive = true } = req.query;
    
    // Validate coordinates
    if (!latitude || !longitude) {
      return res.status(400).json({
        error: {
          code: 'MISSING_COORDINATES',
          message: 'Both latitude and longitude are required'
        }
      });
    }
    
    // Convert to numbers
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_COORDINATES',
          message: 'Latitude and longitude must be valid numbers'
        }
      });
    }
    
    // Find stores within radius (in kilometers)
    const stores = await Store.find({
      isActive: isActive === 'true',
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: parseInt(radius) * 1000 // Convert to meters
        }
      }
    }).limit(20);
    
    return res.json({
      data: stores,
      meta: {
        center: { latitude: lat, longitude: lng },
        radius: parseInt(radius),
        count: stores.length
      }
    });
  } catch (error) {
    return next(error);
  }
};