/**
 * Product Service
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
    service: 'Product Service',
    version: '3.0.0',
    status: 'running'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'UP' });
});

// Get all products
app.get('/products', async (req, res) => {
  try {
    const [products] = await sequelize.query(
      'SELECT p.*, s.name as store_name FROM product p JOIN store s ON p.store_id = s.id'
    );
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get product by ID
app.get('/products/:id', async (req, res) => {
  const productId = req.params.id;
  
  try {
    const [product] = await sequelize.query(
      'SELECT p.*, s.name as store_name FROM product p JOIN store s ON p.store_id = s.id WHERE p.id = ?',
      { 
        replacements: [productId],
        type: sequelize.QueryTypes.SELECT 
      }
    );
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new product
app.post('/products', async (req, res) => {
  const { name, sku, description, unit_price, reorder_level, store_id } = req.body;
  
  try {
    const [result] = await sequelize.query(
      `INSERT INTO product(name, sku, description, unit_price, reorder_level, store_id, current_quantity, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id`,
      { 
        replacements: [name, sku, description, unit_price, reorder_level, store_id],
        type: sequelize.QueryTypes.INSERT 
      }
    );
    
    const newProductId = result[0].id;
    res.status(201).json({ id: newProductId, message: 'Product created successfully' });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update product
app.put('/products/:id', async (req, res) => {
  const productId = req.params.id;
  const { name, sku, description, unit_price, reorder_level } = req.body;
  
  try {
    await sequelize.query(
      `UPDATE product SET 
       name = ?, 
       sku = ?, 
       description = ?, 
       unit_price = ?, 
       reorder_level = ?, 
       updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      { 
        replacements: [name, sku, description, unit_price, reorder_level, productId],
        type: sequelize.QueryTypes.UPDATE 
      }
    );
    
    res.json({ message: 'Product updated successfully' });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Product Service Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'Something went wrong'
  });
});

// Start the server
const PORT = process.env.PRODUCT_SERVICE_PORT || 3002;
app.listen(PORT, () => {
  console.log(`📦 Product Service running on port ${PORT}`);
});

module.exports = app;