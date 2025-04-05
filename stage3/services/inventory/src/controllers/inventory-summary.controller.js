/**
 * Inventory Summary Controller
 * 
 * Handles operations related to current inventory status
 */

const InventorySummary = require('../models/inventory-summary');
const { product } = require('../utils/service-client');
const logger = require('../utils/logger');

/**
 * Get inventory summary with filtering options
 * Returns current inventory levels across products and stores
 */
exports.getInventorySummary = async (req, res, next) => {
  try {
    const { 
      storeId, 
      productId, 
      lowStock, 
      page = 1, 
      limit = 50,
      sort = 'productId'
    } = req.query;
    
    // Build filter criteria
    const filter = {};
    
    if (storeId) filter.storeId = storeId;
    if (productId) filter.productId = productId;
    
    // Low stock filter
    if (lowStock === 'true') {
      filter.$expr = { $lte: ['$currentQuantity', '$reorderLevel'] };
    }
    
    // Parse pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute query with pagination
    const inventorySummaries = await InventorySummary.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .exec();
    
    // Get total count for pagination metadata
    const total = await InventorySummary.countDocuments(filter);
    
    // Enrich with product information if needed
    let enrichedData = inventorySummaries;
    
    if (req.query.includeProduct === 'true') {
      try {
        const productIds = [...new Set(inventorySummaries.map(item => item.productId))];
        const productPromises = productIds.map(id => 
          product.get(`/products/${id}`)
            .then(res => res.data)
            .catch(err => {
              logger.warn(`Failed to fetch product ${id}:`, err.message);
              return null;
            })
        );
        
        const products = await Promise.all(productPromises);
        const productMap = products.reduce((map, prod) => {
          if (prod) map[prod.id] = prod;
          return map;
        }, {});
        
        enrichedData = inventorySummaries.map(item => {
          const json = item.toJSON();
          json.product = productMap[item.productId] || null;
          return json;
        });
      } catch (error) {
        logger.error('Error enriching inventory data with products:', error);
        // Continue without product enrichment
      }
    }
    
    return res.json({
      data: enrichedData,
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
 * Get inventory summary for a specific product in a store
 */
exports.getProductInventory = async (req, res, next) => {
  try {
    const { productId, storeId } = req.params;
    
    const summary = await InventorySummary.findOne({ productId, storeId });
    
    if (!summary) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Inventory summary not found for this product and store'
        }
      });
    }
    
    // Enrich with product information if needed
    let result = summary;
    
    if (req.query.includeProduct === 'true') {
      try {
        const productResponse = await product.get(`/products/${productId}`);
        const productData = productResponse.data;
        
        const json = summary.toJSON();
        json.product = productData;
        result = json;
      } catch (error) {
        logger.error(`Error fetching product ${productId}:`, error);
        // Continue without product data
      }
    }
    
    return res.json(result);
  } catch (error) {
    return next(error);
  }
};

/**
 * Update reorder level for a product in a store
 */
exports.updateReorderLevel = async (req, res, next) => {
  try {
    const { productId, storeId } = req.params;
    const { reorderLevel } = req.body;
    
    if (reorderLevel === undefined || reorderLevel < 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REORDER_LEVEL',
          message: 'Reorder level must be a non-negative number'
        }
      });
    }
    
    // Find and update, or create if not exists
    let summary = await InventorySummary.findOne({ productId, storeId });
    
    if (!summary) {
      // Verify product exists
      try {
        await product.get(`/products/${productId}`);
      } catch (error) {
        if (error.response?.status === 404) {
          return res.status(404).json({
            error: {
              code: 'PRODUCT_NOT_FOUND',
              message: 'The specified product does not exist'
            }
          });
        }
        
        logger.error('Error verifying product existence:', error);
        return res.status(502).json({
          error: {
            code: 'PRODUCT_SERVICE_ERROR',
            message: 'Unable to verify product in product service'
          }
        });
      }
      
      // Create new summary
      summary = new InventorySummary({
        productId,
        storeId,
        currentQuantity: 0,
        reorderLevel
      });
    } else {
      // Update existing
      summary.reorderLevel = reorderLevel;
    }
    
    await summary.save();
    
    return res.json(summary);
  } catch (error) {
    return next(error);
  }
};