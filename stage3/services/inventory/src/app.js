/**
 * Inventory Service
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
    service: 'Inventory Service',
    version: '3.0.0',
    status: 'running'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'UP' });
});

// Get current inventory
app.get('/inventory', async (req, res) => {
  try {
    const [inventory] = await sequelize.query(`
      SELECT p.id, p.name, p.sku, p.current_quantity, p.reorder_level, p.unit_price, 
             s.name as store_name, s.id as store_id
      FROM product p
      JOIN store s ON p.store_id = s.id
      ORDER BY p.name
    `);
    
    res.json(inventory);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get inventory by store
app.get('/inventory/store/:storeId', async (req, res) => {
  const storeId = req.params.storeId;
  
  try {
    const [inventory] = await sequelize.query(`
      SELECT p.id, p.name, p.sku, p.current_quantity, p.reorder_level, p.unit_price, 
             s.name as store_name
      FROM product p
      JOIN store s ON p.store_id = s.id
      WHERE s.id = ?
      ORDER BY p.name
    `, {
      replacements: [storeId]
    });
    
    res.json(inventory);
  } catch (error) {
    console.error('Error fetching store inventory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get low stock products
app.get('/inventory/low-stock', async (req, res) => {
  try {
    const [lowStock] = await sequelize.query(`
      SELECT p.id, p.name, p.sku, p.current_quantity, p.reorder_level, p.unit_price, 
             s.name as store_name, s.id as store_id
      FROM product p
      JOIN store s ON p.store_id = s.id
      WHERE p.current_quantity <= p.reorder_level
      ORDER BY p.current_quantity
    `);
    
    res.json(lowStock);
  } catch (error) {
    console.error('Error fetching low stock inventory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get inventory movements
app.get('/movements', async (req, res) => {
  const { product_id, movement_type, start_date, end_date } = req.query;
  let query = `
    SELECT im.id, im.movement_type, im.quantity, im.unit_price, im.reference, im.notes, 
           im.movement_date, p.name as product_name, p.sku, s.name as store_name
    FROM inventory_movement im
    JOIN product p ON im.product_id = p.id
    JOIN store s ON im.store_id = s.id
    WHERE 1=1
  `;
  
  const replacements = [];
  
  if (product_id) {
    query += ' AND im.product_id = ?';
    replacements.push(product_id);
  }
  
  if (movement_type) {
    query += ' AND im.movement_type = ?';
    replacements.push(movement_type);
  }
  
  if (start_date) {
    query += ' AND im.movement_date >= ?';
    replacements.push(start_date);
  }
  
  if (end_date) {
    query += ' AND im.movement_date <= ?';
    replacements.push(end_date);
  }
  
  query += ' ORDER BY im.movement_date DESC';
  
  try {
    const [movements] = await sequelize.query(query, {
      replacements
    });
    
    res.json(movements);
  } catch (error) {
    console.error('Error fetching inventory movements:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Record stock in
app.post('/stock-in', async (req, res) => {
  const { product_id, quantity, unit_price, reference, notes, store_id } = req.body;
  
  // Start a transaction
  const transaction = await sequelize.transaction();
  
  try {
    // Create inventory movement record
    const [result] = await sequelize.query(`
      INSERT INTO inventory_movement(product_id, store_id, movement_type, quantity, unit_price, reference, notes, movement_date)
      VALUES (?, ?, 'stock_in', ?, ?, ?, ?, CURRENT_TIMESTAMP)
      RETURNING id
    `, {
      replacements: [product_id, store_id, quantity, unit_price, reference, notes],
      transaction
    });
    
    // Update product quantity
    await sequelize.query(`
      UPDATE product
      SET current_quantity = current_quantity + ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, {
      replacements: [quantity, product_id],
      transaction
    });
    
    // Commit transaction
    await transaction.commit();
    
    const movementId = result[0].id;
    res.status(201).json({ 
      id: movementId, 
      message: 'Stock in recorded successfully' 
    });
  } catch (error) {
    // Rollback transaction on error
    await transaction.rollback();
    console.error('Error recording stock in:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Record sale
app.post('/sales', async (req, res) => {
  const { product_id, quantity, unit_price, reference, notes, store_id } = req.body;
  
  // Start a transaction
  const transaction = await sequelize.transaction();
  
  try {
    // Check if we have enough quantity
    const [productResult] = await sequelize.query(`
      SELECT current_quantity FROM product WHERE id = ?
    `, {
      replacements: [product_id],
      transaction,
      type: sequelize.QueryTypes.SELECT
    });
    
    if (!productResult || productResult.current_quantity < quantity) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Insufficient inventory' });
    }
    
    // Create inventory movement record
    const [result] = await sequelize.query(`
      INSERT INTO inventory_movement(product_id, store_id, movement_type, quantity, unit_price, reference, notes, movement_date)
      VALUES (?, ?, 'sale', ?, ?, ?, ?, CURRENT_TIMESTAMP)
      RETURNING id
    `, {
      replacements: [product_id, store_id, quantity, unit_price, reference, notes],
      transaction
    });
    
    // Update product quantity
    await sequelize.query(`
      UPDATE product
      SET current_quantity = current_quantity - ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, {
      replacements: [quantity, product_id],
      transaction
    });
    
    // Commit transaction
    await transaction.commit();
    
    const movementId = result[0].id;
    res.status(201).json({ 
      id: movementId, 
      message: 'Sale recorded successfully' 
    });
  } catch (error) {
    // Rollback transaction on error
    await transaction.rollback();
    console.error('Error recording sale:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Record removal
app.post('/removals', async (req, res) => {
  const { product_id, quantity, reason, notes, store_id } = req.body;
  
  // Start a transaction
  const transaction = await sequelize.transaction();
  
  try {
    // Check if we have enough quantity
    const [productResult] = await sequelize.query(`
      SELECT current_quantity FROM product WHERE id = ?
    `, {
      replacements: [product_id],
      transaction,
      type: sequelize.QueryTypes.SELECT
    });
    
    if (!productResult || productResult.current_quantity < quantity) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Insufficient inventory' });
    }
    
    // Create inventory movement record
    const [result] = await sequelize.query(`
      INSERT INTO inventory_movement(product_id, store_id, movement_type, quantity, reference, notes, movement_date)
      VALUES (?, ?, 'removal', ?, ?, ?, CURRENT_TIMESTAMP)
      RETURNING id
    `, {
      replacements: [product_id, store_id, quantity, reason, notes],
      transaction
    });
    
    // Update product quantity
    await sequelize.query(`
      UPDATE product
      SET current_quantity = current_quantity - ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, {
      replacements: [quantity, product_id],
      transaction
    });
    
    // Commit transaction
    await transaction.commit();
    
    const movementId = result[0].id;
    res.status(201).json({ 
      id: movementId, 
      message: 'Removal recorded successfully' 
    });
  } catch (error) {
    // Rollback transaction on error
    await transaction.rollback();
    console.error('Error recording removal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Inventory Service Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'Something went wrong'
  });
});

// Start the server
const PORT = process.env.INVENTORY_SERVICE_PORT || 3003;
app.listen(PORT, () => {
  console.log(`📊 Inventory Service running on port ${PORT}`);
});

module.exports = app;