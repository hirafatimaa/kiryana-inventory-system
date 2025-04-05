/**
 * Reporting Service
 * Kiryana Inventory System - Stage 3
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { Sequelize } = require('sequelize');

// Load environment variables
dotenv.config({ path: '../../../.env' });

// Create Express app
const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());
app.use(morgan('combined'));

// Simple in-memory cache
const reportCache = {
  data: {},
  timestamp: {},
  get: function(key) {
    const cachedTime = this.timestamp[key];
    if (!cachedTime) return null;
    
    const cacheExpiry = parseInt(process.env.REPORT_CACHE_EXPIRY) || 3600; // Default 1 hour
    const now = Math.floor(Date.now() / 1000);
    
    if (now - cachedTime > cacheExpiry) {
      // Cache expired
      delete this.data[key];
      delete this.timestamp[key];
      return null;
    }
    
    return this.data[key];
  },
  set: function(key, data) {
    this.data[key] = data;
    this.timestamp[key] = Math.floor(Date.now() / 1000);
  },
  invalidate: function(key) {
    delete this.data[key];
    delete this.timestamp[key];
  }
};

// Database connection
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  pool: {
    max: 5,
    min: 0,
    idle: 10000
  }
});

// Test database connection
(async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
})();

// Routes
app.get('/', (req, res) => {
  res.json({
    service: 'Reporting Service',
    version: '3.0.0',
    status: 'running'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'UP' });
});

// Dashboard summary report
app.get('/dashboard', async (req, res) => {
  // Check cache first
  const cacheKey = 'dashboard';
  const cachedData = reportCache.get(cacheKey);
  
  if (cachedData) {
    return res.json(cachedData);
  }
  
  try {
    // Get product counts and inventory value
    const [productStats] = await sequelize.query(`
      SELECT 
        COUNT(*) as total_products,
        SUM(current_quantity) as total_inventory,
        SUM(current_quantity * unit_price) as inventory_value,
        COUNT(CASE WHEN current_quantity <= reorder_level THEN 1 END) as low_stock_count
      FROM product
    `, {
      type: sequelize.QueryTypes.SELECT
    });
    
    // Get store count
    const [storeStats] = await sequelize.query(`
      SELECT COUNT(*) as total_stores FROM store
    `, {
      type: sequelize.QueryTypes.SELECT
    });
    
    // Get movement statistics
    const [movementStats] = await sequelize.query(`
      SELECT
        movement_type,
        COUNT(*) as count,
        SUM(quantity) as total_quantity,
        SUM(quantity * COALESCE(unit_price, 0)) as total_value
      FROM inventory_movement
      GROUP BY movement_type
    `);
    
    // Get recent movements
    const [recentMovements] = await sequelize.query(`
      SELECT im.id, im.movement_type, im.quantity, im.unit_price, im.reference, 
             im.movement_date, p.name as product_name, p.sku, s.name as store_name
      FROM inventory_movement im
      JOIN product p ON im.product_id = p.id
      JOIN store s ON im.store_id = s.id
      ORDER BY im.movement_date DESC
      LIMIT 10
    `);
    
    // Format movement stats
    const salesData = movementStats.find(m => m.movement_type === 'sale') || { count: 0, total_quantity: 0, total_value: 0 };
    const stockInData = movementStats.find(m => m.movement_type === 'stock_in') || { count: 0, total_quantity: 0, total_value: 0 };
    const removalData = movementStats.find(m => m.movement_type === 'removal') || { count: 0, total_quantity: 0, total_value: 0 };
    
    const result = {
      products: {
        total: parseInt(productStats.total_products) || 0,
        total_inventory: parseInt(productStats.total_inventory) || 0,
        inventory_value: parseFloat(productStats.inventory_value) || 0,
        low_stock_count: parseInt(productStats.low_stock_count) || 0
      },
      stores: {
        total: parseInt(storeStats.total_stores) || 0
      },
      movements: {
        sales: {
          count: parseInt(salesData.count) || 0,
          quantity: parseInt(salesData.total_quantity) || 0,
          value: parseFloat(salesData.total_value) || 0
        },
        stock_in: {
          count: parseInt(stockInData.count) || 0,
          quantity: parseInt(stockInData.total_quantity) || 0,
          value: parseFloat(stockInData.total_value) || 0
        },
        removals: {
          count: parseInt(removalData.count) || 0,
          quantity: parseInt(removalData.total_quantity) || 0
        }
      },
      recent_movements: recentMovements
    };
    
    // Cache the result
    reportCache.set(cacheKey, result);
    
    res.json(result);
  } catch (error) {
    console.error('Error generating dashboard report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sales report
app.get('/sales', async (req, res) => {
  const { start_date, end_date, store_id, product_id } = req.query;
  
  // Build cache key
  const cacheKey = `sales-${start_date || 'all'}-${end_date || 'all'}-${store_id || 'all'}-${product_id || 'all'}`;
  const cachedData = reportCache.get(cacheKey);
  
  if (cachedData) {
    return res.json(cachedData);
  }
  
  let query = `
    SELECT im.id, im.quantity, im.unit_price, im.reference, im.notes, 
           im.movement_date, p.name as product_name, p.sku, s.name as store_name,
           (im.quantity * im.unit_price) as total_value
    FROM inventory_movement im
    JOIN product p ON im.product_id = p.id
    JOIN store s ON im.store_id = s.id
    WHERE im.movement_type = 'sale'
  `;
  
  const replacements = [];
  
  if (start_date) {
    query += ' AND im.movement_date >= ?';
    replacements.push(start_date);
  }
  
  if (end_date) {
    query += ' AND im.movement_date <= ?';
    replacements.push(end_date);
  }
  
  if (store_id) {
    query += ' AND im.store_id = ?';
    replacements.push(store_id);
  }
  
  if (product_id) {
    query += ' AND im.product_id = ?';
    replacements.push(product_id);
  }
  
  query += ' ORDER BY im.movement_date DESC';
  
  try {
    const [salesData] = await sequelize.query(query, { replacements });
    
    // Calculate summary
    const summary = {
      total_sales: salesData.length,
      total_quantity: salesData.reduce((sum, sale) => sum + parseInt(sale.quantity), 0),
      total_value: salesData.reduce((sum, sale) => sum + parseFloat(sale.total_value), 0),
      average_value: 0
    };
    
    if (summary.total_sales > 0) {
      summary.average_value = summary.total_value / summary.total_sales;
    }
    
    const result = {
      summary,
      data: salesData
    };
    
    // Cache the result
    reportCache.set(cacheKey, result);
    
    res.json(result);
  } catch (error) {
    console.error('Error generating sales report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Inventory value report
app.get('/inventory-value', async (req, res) => {
  const { store_id } = req.query;
  
  // Build cache key
  const cacheKey = `inventory-value-${store_id || 'all'}`;
  const cachedData = reportCache.get(cacheKey);
  
  if (cachedData) {
    return res.json(cachedData);
  }
  
  let query = `
    SELECT p.id, p.name, p.sku, p.current_quantity, p.unit_price, 
           (p.current_quantity * p.unit_price) as total_value,
           s.name as store_name, s.id as store_id
    FROM product p
    JOIN store s ON p.store_id = s.id
    WHERE p.current_quantity > 0
  `;
  
  const replacements = [];
  
  if (store_id) {
    query += ' AND p.store_id = ?';
    replacements.push(store_id);
  }
  
  query += ' ORDER BY total_value DESC';
  
  try {
    const [inventoryData] = await sequelize.query(query, { replacements });
    
    // Calculate summary
    const summary = {
      total_products: inventoryData.length,
      total_items: inventoryData.reduce((sum, item) => sum + parseInt(item.current_quantity), 0),
      total_value: inventoryData.reduce((sum, item) => sum + parseFloat(item.total_value), 0)
    };
    
    // Group by store
    const storeGroups = {};
    for (const item of inventoryData) {
      if (!storeGroups[item.store_id]) {
        storeGroups[item.store_id] = {
          store_id: item.store_id,
          store_name: item.store_name,
          total_items: 0,
          total_value: 0
        };
      }
      storeGroups[item.store_id].total_items += parseInt(item.current_quantity);
      storeGroups[item.store_id].total_value += parseFloat(item.total_value);
    }
    
    const result = {
      summary,
      by_store: Object.values(storeGroups),
      data: inventoryData
    };
    
    // Cache the result
    reportCache.set(cacheKey, result);
    
    res.json(result);
  } catch (error) {
    console.error('Error generating inventory value report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Low stock report
app.get('/low-stock', async (req, res) => {
  const { store_id } = req.query;
  
  // Build cache key
  const cacheKey = `low-stock-${store_id || 'all'}`;
  const cachedData = reportCache.get(cacheKey);
  
  if (cachedData) {
    return res.json(cachedData);
  }
  
  let query = `
    SELECT p.id, p.name, p.sku, p.current_quantity, p.reorder_level, p.unit_price, 
           s.name as store_name, s.id as store_id
    FROM product p
    JOIN store s ON p.store_id = s.id
    WHERE p.current_quantity <= p.reorder_level
  `;
  
  const replacements = [];
  
  if (store_id) {
    query += ' AND p.store_id = ?';
    replacements.push(store_id);
  }
  
  query += ' ORDER BY (p.current_quantity / p.reorder_level) ASC';
  
  try {
    const [lowStockData] = await sequelize.query(query, { replacements });
    
    // Calculate summary
    const summary = {
      total_low_stock: lowStockData.length,
      out_of_stock: lowStockData.filter(item => parseInt(item.current_quantity) === 0).length
    };
    
    // Group by store
    const storeGroups = {};
    for (const item of lowStockData) {
      if (!storeGroups[item.store_id]) {
        storeGroups[item.store_id] = {
          store_id: item.store_id,
          store_name: item.store_name,
          total_low_stock: 0,
          out_of_stock: 0
        };
      }
      storeGroups[item.store_id].total_low_stock += 1;
      if (parseInt(item.current_quantity) === 0) {
        storeGroups[item.store_id].out_of_stock += 1;
      }
    }
    
    const result = {
      summary,
      by_store: Object.values(storeGroups),
      data: lowStockData
    };
    
    // Cache the result
    reportCache.set(cacheKey, result);
    
    res.json(result);
  } catch (error) {
    console.error('Error generating low stock report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clear report cache
app.post('/clear-cache', (req, res) => {
  const { report_type } = req.body;
  
  if (report_type) {
    // Clear specific report type cache
    Object.keys(reportCache.data).forEach(key => {
      if (key.startsWith(report_type)) {
        reportCache.invalidate(key);
      }
    });
    res.json({ message: `Cache cleared for ${report_type} reports` });
  } else {
    // Clear all cache
    Object.keys(reportCache.data).forEach(key => {
      reportCache.invalidate(key);
    });
    res.json({ message: 'All report caches cleared' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Reporting Service Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'Something went wrong'
  });
});

// Start the server
const PORT = process.env.REPORTING_SERVICE_PORT || 3005;
app.listen(PORT, () => {
  console.log(`📈 Reporting Service running on port ${PORT}`);
});

module.exports = app;