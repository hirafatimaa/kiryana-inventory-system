/**
 * Inventory Report Controller
 * 
 * Handles inventory-related reporting operations
 */

const ReportCache = require('../models/report-cache');
const { inventory, product, store } = require('../utils/service-client');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Generate a cache key for the report
 * @param {string} reportType Type of report
 * @param {object} parameters Report parameters
 * @returns {object} Cache key object
 */
const generateCacheKey = (reportType, parameters) => {
  // Create a canonical representation of parameters
  const canonicalParams = { ...parameters };
  
  // Sort object keys for consistency
  return {
    reportType,
    parameters: JSON.parse(JSON.stringify(canonicalParams))
  };
};

/**
 * Check cache for a report
 * @param {string} reportType Type of report
 * @param {object} parameters Report parameters
 * @returns {Promise<object|null>} Cached report or null
 */
const getFromCache = async (reportType, parameters) => {
  try {
    const cacheKey = generateCacheKey(reportType, parameters);
    
    const cachedReport = await ReportCache.findOne({
      reportType: cacheKey.reportType,
      'parameters': cacheKey.parameters,
      expiresAt: { $gt: new Date() }
    });
    
    if (cachedReport) {
      logger.debug(`Cache hit for ${reportType} report`);
      return cachedReport.toJSON();
    }
    
    logger.debug(`Cache miss for ${reportType} report`);
    return null;
  } catch (error) {
    logger.error(`Error checking cache: ${error.message}`);
    return null;
  }
};

/**
 * Store a report in cache
 * @param {string} reportType Type of report
 * @param {object} parameters Report parameters
 * @param {object} data Report data
 * @param {string} userId User ID who generated the report
 * @returns {Promise<void>}
 */
const storeInCache = async (reportType, parameters, data, userId) => {
  try {
    const cacheKey = generateCacheKey(reportType, parameters);
    
    // Create or update cache entry
    await ReportCache.findOneAndUpdate(
      {
        reportType: cacheKey.reportType,
        'parameters': cacheKey.parameters
      },
      {
        reportType: cacheKey.reportType,
        parameters: cacheKey.parameters,
        data,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + config.reports.cacheTimeMinutes * 60000),
        generatedBy: userId
      },
      {
        upsert: true,
        new: true
      }
    );
    
    logger.debug(`Stored ${reportType} report in cache`);
  } catch (error) {
    logger.error(`Error storing in cache: ${error.message}`);
    // Proceed without caching
  }
};

/**
 * Generate inventory status report
 * Shows current inventory levels across products and stores
 */
exports.generateInventoryStatusReport = async (req, res, next) => {
  try {
    const { storeId, lowStock, includeProductDetails, includeStoreDetails } = req.query;
    
    // Try to get from cache first
    const cacheKey = { storeId, lowStock, includeProductDetails, includeStoreDetails };
    const cachedReport = await getFromCache('inventory_status', cacheKey);
    
    if (cachedReport) {
      return res.json({
        ...cachedReport.data,
        meta: {
          ...cachedReport.data.meta,
          cached: true,
          generatedAt: cachedReport.generatedAt
        }
      });
    }
    
    // Build query for inventory service
    const query = new URLSearchParams();
    if (storeId) query.append('storeId', storeId);
    if (lowStock) query.append('lowStock', lowStock);
    query.append('includeProduct', 'true');
    
    // Fetch inventory data from inventory service
    const inventoryResponse = await inventory.get(`/inventory?${query.toString()}`);
    const inventoryData = inventoryResponse.data;
    
    // Enrich with store data if requested
    let enrichedItems = inventoryData.data;
    
    if (includeStoreDetails === 'true' && storeId) {
      try {
        const storeResponse = await store.get(`/stores/${storeId}`);
        const storeData = storeResponse.data;
        
        // Add store data to each inventory item
        enrichedItems = enrichedItems.map(item => ({
          ...item,
          store: storeData
        }));
      } catch (error) {
        logger.error(`Error fetching store details: ${error.message}`);
        // Continue without store details
      }
    }
    
    // Prepare final report
    const report = {
      data: enrichedItems,
      meta: {
        timestamp: new Date().toISOString(),
        filters: {
          storeId: storeId || 'all',
          lowStock: lowStock === 'true'
        },
        totals: {
          items: enrichedItems.length,
          totalValue: enrichedItems.reduce((sum, item) => sum + (item.valueAtCost || 0), 0),
          lowStockItems: enrichedItems.filter(item => item.isLowStock).length
        }
      },
      pagination: inventoryData.pagination
    };
    
    // Store in cache for future requests
    await storeInCache('inventory_status', cacheKey, report, req.user.id);
    
    return res.json(report);
  } catch (error) {
    return next(error);
  }
};

/**
 * Generate inventory movements report
 * Shows stock-in, sales, and removals for a time period
 */
exports.generateMovementsReport = async (req, res, next) => {
  try {
    const { 
      storeId, 
      productId, 
      movementType, 
      startDate, 
      endDate, 
      includeProductDetails,
      includeStoreDetails
    } = req.query;
    
    // Try to get from cache first
    const cacheKey = { 
      storeId, 
      productId, 
      movementType, 
      startDate, 
      endDate,
      includeProductDetails,
      includeStoreDetails
    };
    
    const cachedReport = await getFromCache('inventory_movements', cacheKey);
    
    if (cachedReport) {
      return res.json({
        ...cachedReport.data,
        meta: {
          ...cachedReport.data.meta,
          cached: true,
          generatedAt: cachedReport.generatedAt
        }
      });
    }
    
    // Build query for inventory service
    const query = new URLSearchParams();
    if (storeId) query.append('storeId', storeId);
    if (productId) query.append('productId', productId);
    if (movementType) query.append('movementType', movementType);
    if (startDate) query.append('startDate', startDate);
    if (endDate) query.append('endDate', endDate);
    query.append('sort', '-movementDate');
    query.append('limit', '1000'); // Large limit for reports
    
    // Fetch movement data from inventory service
    const movementResponse = await inventory.get(`/movements?${query.toString()}`);
    const movementData = movementResponse.data;
    
    // Prepare enrichment collections
    let productMap = {};
    let storeMap = {};
    
    // Enrich with product data if requested
    if (includeProductDetails === 'true') {
      try {
        // Get unique product IDs from movements
        const productIds = [...new Set(movementData.data.map(item => item.productId))];
        
        // Fetch product details in parallel
        const productPromises = productIds.map(id => 
          product.get(`/products/${id}`)
            .then(res => res.data)
            .catch(err => {
              logger.warn(`Failed to fetch product ${id}:`, err.message);
              return null;
            })
        );
        
        const products = await Promise.all(productPromises);
        
        // Create lookup map
        productMap = products.reduce((map, prod) => {
          if (prod) map[prod.id] = prod;
          return map;
        }, {});
      } catch (error) {
        logger.error(`Error fetching product details: ${error.message}`);
        // Continue without product details
      }
    }
    
    // Enrich with store data if requested
    if (includeStoreDetails === 'true') {
      try {
        // Get unique store IDs from movements
        const storeIds = [...new Set(movementData.data.map(item => item.storeId))];
        
        // Fetch store details in parallel
        const storePromises = storeIds.map(id => 
          store.get(`/stores/${id}`)
            .then(res => res.data)
            .catch(err => {
              logger.warn(`Failed to fetch store ${id}:`, err.message);
              return null;
            })
        );
        
        const stores = await Promise.all(storePromises);
        
        // Create lookup map
        storeMap = stores.reduce((map, s) => {
          if (s) map[s.id] = s;
          return map;
        }, {});
      } catch (error) {
        logger.error(`Error fetching store details: ${error.message}`);
        // Continue without store details
      }
    }
    
    // Enrich movement data
    const enrichedItems = movementData.data.map(item => {
      const enriched = { ...item };
      
      if (includeProductDetails === 'true') {
        enriched.product = productMap[item.productId] || null;
      }
      
      if (includeStoreDetails === 'true') {
        enriched.store = storeMap[item.storeId] || null;
      }
      
      return enriched;
    });
    
    // Calculate totals
    const stockInItems = enrichedItems.filter(item => item.movementType === 'stock_in');
    const salesItems = enrichedItems.filter(item => item.movementType === 'sale');
    const removalItems = enrichedItems.filter(item => item.movementType === 'removal');
    
    const stockInTotal = stockInItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const salesTotal = salesItems.reduce((sum, item) => sum + (Math.abs(item.quantity) * item.unitPrice), 0);
    const removalTotal = removalItems.reduce((sum, item) => sum + (Math.abs(item.quantity) * item.unitPrice), 0);
    
    // Prepare final report
    const report = {
      data: enrichedItems,
      meta: {
        timestamp: new Date().toISOString(),
        filters: {
          storeId: storeId || 'all',
          productId: productId || 'all',
          movementType: movementType || 'all',
          dateRange: {
            start: startDate || 'all',
            end: endDate || 'all'
          }
        },
        totals: {
          movements: enrichedItems.length,
          stockIn: {
            count: stockInItems.length,
            value: stockInTotal,
            units: stockInItems.reduce((sum, item) => sum + item.quantity, 0)
          },
          sales: {
            count: salesItems.length,
            value: salesTotal,
            units: salesItems.reduce((sum, item) => sum + Math.abs(item.quantity), 0)
          },
          removals: {
            count: removalItems.length,
            value: removalTotal,
            units: removalItems.reduce((sum, item) => sum + Math.abs(item.quantity), 0)
          }
        }
      },
      pagination: movementData.pagination
    };
    
    // Store in cache for future requests
    await storeInCache('inventory_movements', cacheKey, report, req.user.id);
    
    return res.json(report);
  } catch (error) {
    return next(error);
  }
};

/**
 * Generate low stock report
 * Shows products that are below reorder level
 */
exports.generateLowStockReport = async (req, res, next) => {
  try {
    const { storeId } = req.query;
    
    // Try to get from cache first
    const cacheKey = { storeId };
    const cachedReport = await getFromCache('low_stock', cacheKey);
    
    if (cachedReport) {
      return res.json({
        ...cachedReport.data,
        meta: {
          ...cachedReport.data.meta,
          cached: true,
          generatedAt: cachedReport.generatedAt
        }
      });
    }
    
    // Build query for inventory service
    const query = new URLSearchParams();
    if (storeId) query.append('storeId', storeId);
    query.append('lowStock', 'true');
    query.append('includeProduct', 'true');
    
    // Fetch low stock data from inventory service
    const inventoryResponse = await inventory.get(`/inventory?${query.toString()}`);
    const lowStockData = inventoryResponse.data;
    
    // Enrich with store data if storeId is provided
    let storeName = 'All Stores';
    
    if (storeId) {
      try {
        const storeResponse = await store.get(`/stores/${storeId}`);
        storeName = storeResponse.data.name;
      } catch (error) {
        logger.error(`Error fetching store details: ${error.message}`);
        // Continue without store name
      }
    }
    
    // Prepare final report
    const report = {
      data: lowStockData.data,
      meta: {
        timestamp: new Date().toISOString(),
        storeName,
        filters: {
          storeId: storeId || 'all'
        },
        totals: {
          lowStockItems: lowStockData.data.length,
          criticalItems: lowStockData.data.filter(item => item.currentQuantity === 0).length,
          totalRequiredUnits: lowStockData.data.reduce((sum, item) => {
            const shortfall = item.reorderLevel - item.currentQuantity;
            return sum + (shortfall > 0 ? shortfall : 0);
          }, 0)
        }
      },
      pagination: lowStockData.pagination
    };
    
    // Store in cache for future requests
    await storeInCache('low_stock', cacheKey, report, req.user.id);
    
    return res.json(report);
  } catch (error) {
    return next(error);
  }
};