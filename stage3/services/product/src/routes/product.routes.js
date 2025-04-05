/**
 * Product Routes
 * 
 * Routes for product operations
 */

const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Get all products with filtering
router.get('/', productController.getProducts);

// Create new product
router.post('/', 
  authMiddleware.requireRole(['admin', 'inventory_manager']), 
  productController.createProduct
);

// Get low stock products
router.get('/low-stock', productController.getLowStockProducts);

// Get product by ID
router.get('/:id', productController.getProductById);

// Update product
router.put('/:id', 
  authMiddleware.requireRole(['admin', 'inventory_manager']), 
  productController.updateProduct
);

// Delete/deactivate product
router.delete('/:id', 
  authMiddleware.requireRole(['admin']), 
  productController.deleteProduct
);

// Update product stock
router.patch('/:id/stock', 
  authMiddleware.requireRole(['admin', 'inventory_manager', 'store_manager']), 
  productController.updateStock
);

module.exports = router;