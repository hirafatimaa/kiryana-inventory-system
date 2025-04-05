/**
 * Category Routes
 * 
 * Routes for category operations
 */

const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Get all categories
router.get('/', categoryController.getCategories);

// Create new category
router.post('/', 
  authMiddleware.requireRole(['admin', 'inventory_manager']), 
  categoryController.createCategory
);

// Get category by ID
router.get('/:id', categoryController.getCategoryById);

// Update category
router.put('/:id', 
  authMiddleware.requireRole(['admin', 'inventory_manager']), 
  categoryController.updateCategory
);

// Delete category
router.delete('/:id', 
  authMiddleware.requireRole(['admin']), 
  categoryController.deleteCategory
);

module.exports = router;