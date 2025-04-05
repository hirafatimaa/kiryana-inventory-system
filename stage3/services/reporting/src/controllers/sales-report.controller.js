/**
 * Sales Report Controller
 * 
 * Handles sales-related reporting operations
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
 * Generate sales summary report
 * Shows sales totals and trends for a time period
 */
exports.generateSalesSummaryReport = async (req, res, next) => {
  try {
    const { storeId, startDate, endDate, groupBy } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        error: {
          code: 'MISSING_DATE_RANGE',
          message: 'Start date and end date are required for sales reports'
        }
      });
    }
    
    // Try to get from cache first
    const cacheKey = { storeId, startDate, endDate, groupBy };
    const cachedReport = await getFromCache('sales_summary', cacheKey);
    
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
    
    // Build query for inventory service to get sales movements
    const query = new URLSearchParams();
    if (storeId) query.append('storeId', storeId);
    query.append('movementType', 'sale');
    query.append('startDate', startDate);
    query.append('endDate', endDate);
    query.append('limit', '5000'); // Large limit for reports
    
    // Fetch sales data from inventory service
    const salesResponse = await inventory.get(`/movements?${query.toString()}`);
    const salesData = salesResponse.data.data;
    
    // Group sales data by the requested dimension
    let groupedData = {};
    let groupLabels = {};
    
    switch (groupBy) {
      case 'day':
        // Group by day
        salesData.forEach(sale => {
          const dateKey = new Date(sale.movementDate).toISOString().split('T')[0];
          if (!groupedData[dateKey]) {
            groupedData[dateKey] = [];
            groupLabels[dateKey] = dateKey;
          }
          groupedData[dateKey].push(sale);
        });
        break;
        
      case 'week':
        // Group by week (Sunday to Saturday)
        salesData.forEach(sale => {
          const date = new Date(sale.movementDate);
          const day = date.getDay(); // 0 = Sunday, 6 = Saturday
          const startOfWeek = new Date(date);
          startOfWeek.setDate(date.getDate() - day); // Go back to Sunday
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6); // Go forward to Saturday
          
          const weekKey = `${startOfWeek.toISOString().split('T')[0]}_${endOfWeek.toISOString().split('T')[0]}`;
          if (!groupedData[weekKey]) {
            groupedData[weekKey] = [];
            groupLabels[weekKey] = `Week of ${startOfWeek.toISOString().split('T')[0]}`;
          }
          groupedData[weekKey].push(sale);
        });
        break;
        
      case 'month':
        // Group by month
        salesData.forEach(sale => {
          const date = new Date(sale.movementDate);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (!groupedData[monthKey]) {
            groupedData[monthKey] = [];
            groupLabels[monthKey] = monthKey;
          }
          groupedData[monthKey].push(sale);
        });
        break;
        
      case 'product':
        // Group by product ID
        salesData.forEach(sale => {
          const productKey = sale.productId;
          if (!groupedData[productKey]) {
            groupedData[productKey] = [];
            groupLabels[productKey] = productKey; // Will try to get product names later
          }
          groupedData[productKey].push(sale);
        });
        
        // Try to get product names
        try {
          const productIds = Object.keys(groupedData);
          const productPromises = productIds.map(id => 
            product.get(`/products/${id}`)
              .then(res => res.data)
              .catch(err => {
                logger.warn(`Failed to fetch product ${id}:`, err.message);
                return null;
              })
          );
          
          const products = await Promise.all(productPromises);
          
          // Update labels with product names
          products.forEach(prod => {
            if (prod && groupLabels[prod.id]) {
              groupLabels[prod.id] = prod.name;
            }
          });
        } catch (error) {
          logger.error(`Error fetching product details: ${error.message}`);
          // Continue with product IDs as labels
        }
        break;
        
      default:
        // No grouping, use a single group
        groupedData = { 'all': salesData };
        groupLabels = { 'all': 'All Sales' };
    }
    
    // Calculate summary for each group
    const summaries = Object.keys(groupedData).map(key => {
      const group = groupedData[key];
      const totalUnits = group.reduce((sum, sale) => sum + Math.abs(sale.quantity), 0);
      const totalSales = group.reduce((sum, sale) => sum + (Math.abs(sale.quantity) * sale.unitPrice), 0);
      const averageUnitPrice = totalUnits > 0 ? totalSales / totalUnits : 0;
      
      return {
        group: key,
        label: groupLabels[key],
        count: group.length,
        totalUnits,
        totalSales,
        averageUnitPrice
      };
    });
    
    // Sort summaries by date/key
    summaries.sort((a, b) => a.group.localeCompare(b.group));
    
    // Calculate overall totals
    const totalTransactions = salesData.length;
    const totalUnits = salesData.reduce((sum, sale) => sum + Math.abs(sale.quantity), 0);
    const totalSales = salesData.reduce((sum, sale) => sum + (Math.abs(sale.quantity) * sale.unitPrice), 0);
    const averageUnitPrice = totalUnits > 0 ? totalSales / totalUnits : 0;
    const averageTransactionValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;
    
    // Get store information if storeId is provided
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
      data: summaries,
      meta: {
        timestamp: new Date().toISOString(),
        storeName,
        dateRange: {
          start: startDate,
          end: endDate
        },
        groupBy: groupBy || 'none',
        totals: {
          transactions: totalTransactions,
          units: totalUnits,
          sales: totalSales,
          averageUnitPrice,
          averageTransactionValue
        }
      }
    };
    
    // Store in cache for future requests
    await storeInCache('sales_summary', cacheKey, report, req.user.id);
    
    return res.json(report);
  } catch (error) {
    return next(error);
  }
};

/**
 * Generate sales by product report
 * Shows sales broken down by product
 */
exports.generateSalesByProductReport = async (req, res, next) => {
  try {
    const { storeId, startDate, endDate, topN } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        error: {
          code: 'MISSING_DATE_RANGE',
          message: 'Start date and end date are required for sales reports'
        }
      });
    }
    
    // Try to get from cache first
    const cacheKey = { storeId, startDate, endDate, topN };
    const cachedReport = await getFromCache('sales_by_product', cacheKey);
    
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
    
    // Build query for inventory service to get sales movements
    const query = new URLSearchParams();
    if (storeId) query.append('storeId', storeId);
    query.append('movementType', 'sale');
    query.append('startDate', startDate);
    query.append('endDate', endDate);
    query.append('limit', '5000'); // Large limit for reports
    
    // Fetch sales data from inventory service
    const salesResponse = await inventory.get(`/movements?${query.toString()}`);
    const salesData = salesResponse.data.data;
    
    // Group sales by product
    const productSales = {};
    
    salesData.forEach(sale => {
      if (!productSales[sale.productId]) {
        productSales[sale.productId] = {
          productId: sale.productId,
          transactions: 0,
          quantity: 0,
          totalSales: 0,
          product: null // Will be populated later
        };
      }
      
      productSales[sale.productId].transactions += 1;
      productSales[sale.productId].quantity += Math.abs(sale.quantity);
      productSales[sale.productId].totalSales += Math.abs(sale.quantity) * sale.unitPrice;
    });
    
    // Try to get product information
    try {
      const productIds = Object.keys(productSales);
      const productPromises = productIds.map(id => 
        product.get(`/products/${id}`)
          .then(res => res.data)
          .catch(err => {
            logger.warn(`Failed to fetch product ${id}:`, err.message);
            return null;
          })
      );
      
      const products = await Promise.all(productPromises);
      
      // Add product info to sales data
      products.forEach(prod => {
        if (prod && productSales[prod.id]) {
          productSales[prod.id].product = {
            id: prod.id,
            name: prod.name,
            sku: prod.sku,
            category: prod.category ? prod.category.name : null
          };
        }
      });
    } catch (error) {
      logger.error(`Error fetching product details: ${error.message}`);
      // Continue without product details
    }
    
    // Convert to array and calculate average price
    let productSalesArray = Object.values(productSales);
    
    // Add average unit price
    productSalesArray = productSalesArray.map(item => ({
      ...item,
      averageUnitPrice: item.quantity > 0 ? item.totalSales / item.quantity : 0
    }));
    
    // Sort by total sales (descending)
    productSalesArray.sort((a, b) => b.totalSales - a.totalSales);
    
    // Limit to top N if requested
    if (topN && !isNaN(parseInt(topN))) {
      productSalesArray = productSalesArray.slice(0, parseInt(topN));
    }
    
    // Calculate overall totals
    const totalTransactions = salesData.length;
    const totalQuantity = productSalesArray.reduce((sum, item) => sum + item.quantity, 0);
    const totalSales = productSalesArray.reduce((sum, item) => sum + item.totalSales, 0);
    
    // Get store information if storeId is provided
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
      data: productSalesArray,
      meta: {
        timestamp: new Date().toISOString(),
        storeName,
        dateRange: {
          start: startDate,
          end: endDate
        },
        topN: topN ? parseInt(topN) : null,
        totals: {
          products: productSalesArray.length,
          transactions: totalTransactions,
          quantity: totalQuantity,
          sales: totalSales
        }
      }
    };
    
    // Store in cache for future requests
    await storeInCache('sales_by_product', cacheKey, report, req.user.id);
    
    return res.json(report);
  } catch (error) {
    return next(error);
  }
};

/**
 * Generate sales by store report
 * Shows sales broken down by store
 */
exports.generateSalesByStoreReport = async (req, res, next) => {
  try {
    const { startDate, endDate, topN } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        error: {
          code: 'MISSING_DATE_RANGE',
          message: 'Start date and end date are required for sales reports'
        }
      });
    }
    
    // Try to get from cache first
    const cacheKey = { startDate, endDate, topN };
    const cachedReport = await getFromCache('sales_by_store', cacheKey);
    
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
    
    // Build query for inventory service to get sales movements
    const query = new URLSearchParams();
    query.append('movementType', 'sale');
    query.append('startDate', startDate);
    query.append('endDate', endDate);
    query.append('limit', '10000'); // Large limit for reports
    
    // Fetch sales data from inventory service
    const salesResponse = await inventory.get(`/movements?${query.toString()}`);
    const salesData = salesResponse.data.data;
    
    // Group sales by store
    const storeSales = {};
    
    salesData.forEach(sale => {
      if (!storeSales[sale.storeId]) {
        storeSales[sale.storeId] = {
          storeId: sale.storeId,
          transactions: 0,
          quantity: 0,
          totalSales: 0,
          uniqueProducts: new Set(),
          store: null // Will be populated later
        };
      }
      
      storeSales[sale.storeId].transactions += 1;
      storeSales[sale.storeId].quantity += Math.abs(sale.quantity);
      storeSales[sale.storeId].totalSales += Math.abs(sale.quantity) * sale.unitPrice;
      storeSales[sale.storeId].uniqueProducts.add(sale.productId);
    });
    
    // Try to get store information
    try {
      const storeIds = Object.keys(storeSales);
      const storePromises = storeIds.map(id => 
        store.get(`/stores/${id}`)
          .then(res => res.data)
          .catch(err => {
            logger.warn(`Failed to fetch store ${id}:`, err.message);
            return null;
          })
      );
      
      const stores = await Promise.all(storePromises);
      
      // Add store info to sales data
      stores.forEach(s => {
        if (s && storeSales[s.id]) {
          storeSales[s.id].store = {
            id: s.id,
            name: s.name,
            code: s.code,
            location: `${s.address.city}, ${s.address.province}`
          };
        }
      });
    } catch (error) {
      logger.error(`Error fetching store details: ${error.message}`);
      // Continue without store details
    }
    
    // Convert to array and calculate derived metrics
    let storeSalesArray = Object.values(storeSales).map(store => ({
      storeId: store.storeId,
      store: store.store,
      transactions: store.transactions,
      quantity: store.quantity,
      totalSales: store.totalSales,
      uniqueProducts: store.uniqueProducts.size,
      averageTransactionValue: store.transactions > 0 ? store.totalSales / store.transactions : 0
    }));
    
    // Sort by total sales (descending)
    storeSalesArray.sort((a, b) => b.totalSales - a.totalSales);
    
    // Limit to top N if requested
    if (topN && !isNaN(parseInt(topN))) {
      storeSalesArray = storeSalesArray.slice(0, parseInt(topN));
    }
    
    // Calculate overall totals
    const totalTransactions = salesData.length;
    const totalQuantity = storeSalesArray.reduce((sum, item) => sum + item.quantity, 0);
    const totalSales = storeSalesArray.reduce((sum, item) => sum + item.totalSales, 0);
    const totalUniqueProducts = new Set(salesData.map(sale => sale.productId)).size;
    
    // Prepare final report
    const report = {
      data: storeSalesArray,
      meta: {
        timestamp: new Date().toISOString(),
        dateRange: {
          start: startDate,
          end: endDate
        },
        topN: topN ? parseInt(topN) : null,
        totals: {
          stores: storeSalesArray.length,
          transactions: totalTransactions,
          quantity: totalQuantity,
          sales: totalSales,
          uniqueProducts: totalUniqueProducts
        }
      }
    };
    
    // Store in cache for future requests
    await storeInCache('sales_by_store', cacheKey, report, req.user.id);
    
    return res.json(report);
  } catch (error) {
    return next(error);
  }
};