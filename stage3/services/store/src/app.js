/**
 * Store Service
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
    service: 'Store Service',
    version: '3.0.0',
    status: 'running'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'UP' });
});

// Get all stores
app.get('/stores', async (req, res) => {
  try {
    const [stores] = await sequelize.query(`
      SELECT s.*, 
        (SELECT COUNT(*) FROM product p WHERE p.store_id = s.id) as product_count,
        (SELECT SUM(p.current_quantity) FROM product p WHERE p.store_id = s.id) as total_items
      FROM store s
      ORDER BY s.name
    `);
    
    res.json(stores);
  } catch (error) {
    console.error('Error fetching stores:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get store by ID
app.get('/stores/:id', async (req, res) => {
  const storeId = req.params.id;
  
  try {
    const [store] = await sequelize.query(`
      SELECT s.*, 
        (SELECT COUNT(*) FROM product p WHERE p.store_id = s.id) as product_count,
        (SELECT SUM(p.current_quantity) FROM product p WHERE p.store_id = s.id) as total_items
      FROM store s
      WHERE s.id = ?
    `, {
      replacements: [storeId],
      type: sequelize.QueryTypes.SELECT
    });
    
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }
    
    res.json(store);
  } catch (error) {
    console.error('Error fetching store:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new store
app.post('/stores', async (req, res) => {
  const { name, code, location } = req.body;
  
  if (!name || !code) {
    return res.status(400).json({ error: 'Store name and code are required' });
  }
  
  try {
    // Check if code is already taken
    const [existingStore] = await sequelize.query(`
      SELECT id FROM store WHERE code = ?
    `, {
      replacements: [code],
      type: sequelize.QueryTypes.SELECT
    });
    
    if (existingStore) {
      return res.status(400).json({ error: 'Store code already exists' });
    }
    
    const [result] = await sequelize.query(`
      INSERT INTO store(name, code, location, created_at, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id
    `, {
      replacements: [name, code, location || '']
    });
    
    const newStoreId = result[0].id;
    res.status(201).json({ 
      id: newStoreId, 
      message: 'Store created successfully' 
    });
  } catch (error) {
    console.error('Error creating store:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update store
app.put('/stores/:id', async (req, res) => {
  const storeId = req.params.id;
  const { name, location } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Store name is required' });
  }
  
  try {
    await sequelize.query(`
      UPDATE store
      SET name = ?,
          location = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, {
      replacements: [name, location || '', storeId]
    });
    
    res.json({ message: 'Store updated successfully' });
  } catch (error) {
    console.error('Error updating store:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get store performance statistics
app.get('/stores/:id/stats', async (req, res) => {
  const storeId = req.params.id;
  
  try {
    // Get store details
    const [store] = await sequelize.query(`
      SELECT * FROM store WHERE id = ?
    `, {
      replacements: [storeId],
      type: sequelize.QueryTypes.SELECT
    });
    
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }
    
    // Get product stats
    const [productStats] = await sequelize.query(`
      SELECT 
        COUNT(*) as total_products,
        SUM(current_quantity) as total_inventory,
        COUNT(CASE WHEN current_quantity <= reorder_level THEN 1 END) as low_stock_count
      FROM product
      WHERE store_id = ?
    `, {
      replacements: [storeId],
      type: sequelize.QueryTypes.SELECT
    });
    
    // Get movement stats
    const [movementStats] = await sequelize.query(`
      SELECT
        movement_type,
        COUNT(*) as count,
        SUM(quantity) as total_quantity,
        SUM(quantity * unit_price) as total_value
      FROM inventory_movement
      WHERE store_id = ?
      GROUP BY movement_type
    `, {
      replacements: [storeId]
    });
    
    // Format movement stats
    const salesData = movementStats.find(m => m.movement_type === 'sale') || { count: 0, total_quantity: 0, total_value: 0 };
    const stockInData = movementStats.find(m => m.movement_type === 'stock_in') || { count: 0, total_quantity: 0, total_value: 0 };
    const removalData = movementStats.find(m => m.movement_type === 'removal') || { count: 0, total_quantity: 0, total_value: 0 };
    
    res.json({
      store,
      inventory: {
        total_products: parseInt(productStats.total_products) || 0,
        total_inventory: parseInt(productStats.total_inventory) || 0,
        low_stock_count: parseInt(productStats.low_stock_count) || 0
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
      }
    });
  } catch (error) {
    console.error('Error fetching store stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Store Service Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'Something went wrong'
  });
});

// Start the server
const PORT = process.env.STORE_SERVICE_PORT || 3004;
app.listen(PORT, () => {
  console.log(`🏪 Store Service running on port ${PORT}`);
});

module.exports = app;