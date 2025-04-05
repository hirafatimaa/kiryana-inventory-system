/**
 * Widget Controller
 * 
 * Handles operations related to dashboard widgets and data
 */

const WidgetData = require('../models/widget-data');
const { inventory, product, store, reporting } = require('../utils/service-client');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Generate a cache key for the widget data
 * @param {string} widgetType Type of widget
 * @param {object} parameters Widget parameters
 * @returns {object} Cache key object
 */
const generateCacheKey = (widgetType, parameters) => {
  // Create a canonical representation of parameters
  const canonicalParams = { ...parameters };
  
  // Sort object keys for consistency
  return {
    widgetType,
    parameters: JSON.parse(JSON.stringify(canonicalParams))
  };
};

/**
 * Check cache for widget data
 * @param {string} widgetType Type of widget
 * @param {object} parameters Widget parameters
 * @returns {Promise<object|null>} Cached widget data or null
 */
const getFromCache = async (widgetType, parameters) => {
  try {
    const cacheKey = generateCacheKey(widgetType, parameters);
    
    const cachedData = await WidgetData.findOne({
      widgetType: cacheKey.widgetType,
      'parameters': cacheKey.parameters,
      expiresAt: { $gt: new Date() }
    });
    
    if (cachedData) {
      logger.debug(`Cache hit for ${widgetType} widget`);
      return cachedData.toJSON();
    }
    
    logger.debug(`Cache miss for ${widgetType} widget`);
    return null;
  } catch (error) {
    logger.error(`Error checking cache: ${error.message}`);
    return null;
  }
};

/**
 * Store widget data in cache
 * @param {string} widgetType Type of widget
 * @param {object} parameters Widget parameters
 * @param {object} data Widget data
 * @param {string} storeId Store ID (optional)
 * @returns {Promise<void>}
 */
const storeInCache = async (widgetType, parameters, data, storeId = null) => {
  try {
    const cacheKey = generateCacheKey(widgetType, parameters);
    
    // Create or update cache entry
    await WidgetData.findOneAndUpdate(
      {
        widgetType: cacheKey.widgetType,
        'parameters': cacheKey.parameters
      },
      {
        widgetType: cacheKey.widgetType,
        parameters: cacheKey.parameters,
        data,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + config.dashboard.widgetCacheTimeMinutes * 60000),
        storeId
      },
      {
        upsert: true,
        new: true
      }
    );
    
    logger.debug(`Stored ${widgetType} widget data in cache`);
  } catch (error) {
    logger.error(`Error storing in cache: ${error.message}`);
    // Proceed without caching
  }
};

/**
 * Get sales summary widget data
 */
exports.getSalesSummaryWidget = async (req, res, next) => {
  try {
    const { storeId, period } = req.query;
    
    // Determine date range based on period
    const endDate = new Date();
    let startDate = new Date();
    
    switch(period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'yesterday':
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(endDate.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'last7days':
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'thisMonth':
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'lastMonth':
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(0); // Last day of previous month
        endDate.setHours(23, 59, 59, 999);
        break;
      default: // Default to last 7 days
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
    }
    
    // Cache parameters
    const cacheParams = {
      storeId: storeId || 'all',
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };
    
    // Try to get from cache first
    const cachedData = await getFromCache('sales_summary', cacheParams);
    
    if (cachedData) {
      return res.json({
        data: cachedData.data,
        meta: {
          cached: true,
          generatedAt: cachedData.generatedAt
        }
      });
    }
    
    // Fetch from reporting service
    const query = new URLSearchParams();
    if (storeId) query.append('storeId', storeId);
    query.append('startDate', startDate.toISOString());
    query.append('endDate', endDate.toISOString());
    query.append('groupBy', 'day');
    
    const response = await reporting.get(`/reports/sales/summary?${query.toString()}`);
    const reportData = response.data;
    
    // Transform for widget display
    const widgetData = {
      summary: {
        totalSales: reportData.meta.totals.sales,
        totalTransactions: reportData.meta.totals.transactions,
        totalUnits: reportData.meta.totals.units,
        averageTransactionValue: reportData.meta.totals.averageTransactionValue
      },
      trend: reportData.data.map(day => ({
        date: day.label,
        sales: day.totalSales
      }))
    };
    
    // Store in cache
    await storeInCache('sales_summary', cacheParams, widgetData, storeId);
    
    return res.json({
      data: widgetData,
      meta: {
        period,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      }
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get inventory status widget data
 */
exports.getInventoryStatusWidget = async (req, res, next) => {
  try {
    const { storeId, showLowStock } = req.query;
    
    // Cache parameters
    const cacheParams = {
      storeId: storeId || 'all',
      showLowStock: showLowStock === 'true'
    };
    
    // Try to get from cache first
    const cachedData = await getFromCache('inventory_status', cacheParams);
    
    if (cachedData) {
      return res.json({
        data: cachedData.data,
        meta: {
          cached: true,
          generatedAt: cachedData.generatedAt
        }
      });
    }
    
    // Fetch from reporting service
    const query = new URLSearchParams();
    if (storeId) query.append('storeId', storeId);
    if (showLowStock === 'true') query.append('lowStock', 'true');
    
    const response = await reporting.get(`/reports/inventory/status?${query.toString()}`);
    const reportData = response.data;
    
    // Transform for widget display
    const widgetData = {
      summary: {
        totalProducts: reportData.data.length,
        totalValue: reportData.meta.totals.totalValue,
        lowStockItems: reportData.meta.totals.lowStockItems,
        criticalItems: reportData.data.filter(item => item.currentQuantity === 0).length
      },
      topItems: reportData.data
        .sort((a, b) => b.valueAtCost - a.valueAtCost)
        .slice(0, 5)
        .map(item => ({
          id: item.productId,
          name: item.product ? item.product.name : `Product ${item.productId}`,
          quantity: item.currentQuantity,
          value: item.valueAtCost,
          isLowStock: item.isLowStock
        }))
    };
    
    // Store in cache
    await storeInCache('inventory_status', cacheParams, widgetData, storeId);
    
    return res.json({
      data: widgetData,
      meta: {
        storeId: storeId || 'all',
        showLowStock: showLowStock === 'true'
      }
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get low stock alerts widget data
 */
exports.getLowStockAlertsWidget = async (req, res, next) => {
  try {
    const { storeId, limit } = req.query;
    const limitNum = parseInt(limit) || 5;
    
    // Cache parameters
    const cacheParams = {
      storeId: storeId || 'all',
      limit: limitNum
    };
    
    // Try to get from cache first
    const cachedData = await getFromCache('low_stock_alert', cacheParams);
    
    if (cachedData) {
      return res.json({
        data: cachedData.data,
        meta: {
          cached: true,
          generatedAt: cachedData.generatedAt
        }
      });
    }
    
    // Fetch from reporting service
    const query = new URLSearchParams();
    if (storeId) query.append('storeId', storeId);
    
    const response = await reporting.get(`/reports/inventory/low-stock?${query.toString()}`);
    const reportData = response.data;
    
    // Prepare alerts data
    const alerts = reportData.data.map(item => {
      const shortage = item.reorderLevel - item.currentQuantity;
      const criticalLevel = item.currentQuantity === 0;
      
      return {
        id: item.productId,
        name: item.product ? item.product.name : `Product ${item.productId}`,
        sku: item.product ? item.product.sku : '',
        currentQuantity: item.currentQuantity,
        reorderLevel: item.reorderLevel,
        shortage,
        criticalLevel
      };
    });
    
    // Sort by criticality and shortage amount
    alerts.sort((a, b) => {
      // Critical level items first
      if (a.criticalLevel && !b.criticalLevel) return -1;
      if (!a.criticalLevel && b.criticalLevel) return 1;
      
      // Then by shortage amount
      return b.shortage - a.shortage;
    });
    
    // Limit results
    const limitedAlerts = alerts.slice(0, limitNum);
    
    // Create summary data
    const widgetData = {
      alerts: limitedAlerts,
      summary: {
        totalLowStock: reportData.meta.totals.lowStockItems,
        criticalItems: reportData.meta.totals.criticalItems,
        totalRequired: reportData.meta.totals.totalRequiredUnits
      }
    };
    
    // Store in cache
    await storeInCache('low_stock_alert', cacheParams, widgetData, storeId);
    
    return res.json({
      data: widgetData,
      meta: {
        storeId: storeId || 'all',
        limit: limitNum
      }
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get recent movements widget data
 */
exports.getRecentMovementsWidget = async (req, res, next) => {
  try {
    const { storeId, limit, type } = req.query;
    const limitNum = parseInt(limit) || 10;
    
    // Cache parameters
    const cacheParams = {
      storeId: storeId || 'all',
      limit: limitNum,
      type: type || 'all'
    };
    
    // Try to get from cache first
    const cachedData = await getFromCache('recent_movements', cacheParams);
    
    if (cachedData) {
      return res.json({
        data: cachedData.data,
        meta: {
          cached: true,
          generatedAt: cachedData.generatedAt
        }
      });
    }
    
    // Fetch from inventory service
    const query = new URLSearchParams();
    if (storeId) query.append('storeId', storeId);
    if (type && type !== 'all') query.append('movementType', type);
    query.append('limit', limitNum.toString());
    query.append('sort', '-movementDate');
    
    const response = await inventory.get(`/movements?${query.toString()}`);
    const movementsData = response.data;
    
    // Enrich with product data if available
    let productMap = {};
    try {
      // Get unique product IDs from movements
      const productIds = [...new Set(movementsData.data.map(item => item.productId))];
      
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
    
    // Transform for widget display
    const movements = movementsData.data.map(movement => {
      const productInfo = productMap[movement.productId];
      
      return {
        id: movement.id,
        productId: movement.productId,
        productName: productInfo ? productInfo.name : `Product ${movement.productId}`,
        type: movement.movementType,
        quantity: Math.abs(movement.quantity),
        direction: movement.movementType === 'stock_in' ? 'in' : 'out',
        date: movement.movementDate,
        value: Math.abs(movement.quantity) * movement.unitPrice
      };
    });
    
    // Group by type for summary
    const summary = {
      stockIn: movements.filter(m => m.type === 'stock_in').length,
      sales: movements.filter(m => m.type === 'sale').length,
      removals: movements.filter(m => m.type === 'removal').length
    };
    
    const widgetData = {
      movements,
      summary
    };
    
    // Store in cache
    await storeInCache('recent_movements', cacheParams, widgetData, storeId);
    
    return res.json({
      data: widgetData,
      meta: {
        storeId: storeId || 'all',
        limit: limitNum,
        type: type || 'all'
      }
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get top products widget data
 */
exports.getTopProductsWidget = async (req, res, next) => {
  try {
    const { storeId, period, limit } = req.query;
    const limitNum = parseInt(limit) || 5;
    
    // Determine date range based on period
    const endDate = new Date();
    let startDate = new Date();
    
    switch(period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'yesterday':
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(endDate.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'last7days':
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'thisMonth':
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'lastMonth':
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(0); // Last day of previous month
        endDate.setHours(23, 59, 59, 999);
        break;
      default: // Default to last 30 days
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
    }
    
    // Cache parameters
    const cacheParams = {
      storeId: storeId || 'all',
      period,
      limit: limitNum,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };
    
    // Try to get from cache first
    const cachedData = await getFromCache('top_products', cacheParams);
    
    if (cachedData) {
      return res.json({
        data: cachedData.data,
        meta: {
          cached: true,
          generatedAt: cachedData.generatedAt
        }
      });
    }
    
    // Fetch from reporting service
    const query = new URLSearchParams();
    if (storeId) query.append('storeId', storeId);
    query.append('startDate', startDate.toISOString());
    query.append('endDate', endDate.toISOString());
    query.append('topN', limitNum.toString());
    
    const response = await reporting.get(`/reports/sales/by-product?${query.toString()}`);
    const reportData = response.data;
    
    // Format for widget display
    const topProducts = reportData.data.map(product => ({
      id: product.productId,
      name: product.product ? product.product.name : `Product ${product.productId}`,
      sku: product.product ? product.product.sku : '',
      salesValue: product.totalSales,
      quantity: product.quantity,
      transactions: product.transactions
    }));
    
    const widgetData = {
      products: topProducts,
      summary: {
        totalProducts: reportData.meta.totals.products,
        totalSales: reportData.meta.totals.sales,
        totalQuantity: reportData.meta.totals.quantity
      }
    };
    
    // Store in cache
    await storeInCache('top_products', cacheParams, widgetData, storeId);
    
    return res.json({
      data: widgetData,
      meta: {
        period,
        storeId: storeId || 'all',
        limit: limitNum,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      }
    });
  } catch (error) {
    return next(error);
  }
};