/**
 * Product Controller
 * 
 * Handles business logic for product operations
 */

const Product = require('../models/product');
const Category = require('../models/category');
const logger = require('../utils/logger');

/**
 * Create a new product
 * @route POST /api/products
 */
exports.createProduct = async (req, res, next) => {
  try {
    const { name, sku, description, categoryId, unit, price, costPrice, reorderLevel, stores, tags, barcodes, attributes, supplier } = req.body;
    
    // Check if SKU already exists
    const existingProduct = await Product.findOne({ sku });
    if (existingProduct) {
      const error = new Error(`Product with SKU '${sku}' already exists`);
      error.statusCode = 400;
      return next(error);
    }
    
    // Validate category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      const error = new Error(`Category with ID '${categoryId}' not found`);
      error.statusCode = 400;
      return next(error);
    }
    
    // Create new product
    const product = new Product({
      name,
      sku,
      description,
      category: categoryId,
      unit,
      price,
      costPrice,
      reorderLevel,
      stores: stores || [],
      tags: tags || [],
      barcodes: barcodes || [],
      attributes: attributes || [],
      supplier,
      createdBy: req.user.id
    });
    
    const savedProduct = await product.save();
    
    // Log product creation
    logger.info(`Product created: ${savedProduct.name} (${savedProduct.sku})`, {
      productId: savedProduct._id,
      userId: req.user.id
    });
    
    res.status(201).json({
      success: true,
      data: savedProduct
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all products with filtering and pagination
 * @route GET /api/products
 */
exports.getProducts = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      sort = 'name', 
      order = 'asc',
      category,
      search,
      minPrice,
      maxPrice,
      storeId,
      isActive,
      lowStock
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === 'desc' ? -1 : 1;
    const sortOption = { [sort]: sortOrder };
    
    // Build query filters
    const filters = {};
    
    if (category) {
      filters.category = category;
    }
    
    if (search) {
      filters.$text = { $search: search };
    }
    
    if (minPrice !== undefined || maxPrice !== undefined) {
      filters.price = {};
      if (minPrice !== undefined) filters.price.$gte = parseFloat(minPrice);
      if (maxPrice !== undefined) filters.price.$lte = parseFloat(maxPrice);
    }
    
    if (storeId) {
      filters['stores.storeId'] = storeId;
    }
    
    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }
    
    // Handle low stock filtering - requires aggregation
    if (lowStock === 'true' && storeId) {
      const lowStockProducts = await Product.getLowStockProducts(storeId);
      const productIds = lowStockProducts.map(p => p._id);
      
      // Add to existing filters
      filters._id = { $in: productIds };
    }
    
    // Get paginated products
    const products = await Product.find(filters)
      .populate('category', 'name')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const total = await Product.countDocuments(filters);
    
    res.status(200).json({
      success: true,
      data: products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get product by ID
 * @route GET /api/products/:id
 */
exports.getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const product = await Product.findById(id)
      .populate('category', 'name');
    
    if (!product) {
      const error = new Error(`Product not found with ID: ${id}`);
      error.statusCode = 404;
      return next(error);
    }
    
    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update product
 * @route PUT /api/products/:id
 */
exports.updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, updatedBy: req.user.id };
    
    // If changing SKU, check if new SKU already exists
    if (updateData.sku) {
      const existingProduct = await Product.findOne({ 
        sku: updateData.sku, 
        _id: { $ne: id }
      });
      
      if (existingProduct) {
        const error = new Error(`Product with SKU '${updateData.sku}' already exists`);
        error.statusCode = 400;
        return next(error);
      }
    }
    
    // If changing category, validate it exists
    if (updateData.categoryId) {
      const category = await Category.findById(updateData.categoryId);
      if (!category) {
        const error = new Error(`Category with ID '${updateData.categoryId}' not found`);
        error.statusCode = 400;
        return next(error);
      }
      
      // Map categoryId to category field expected by model
      updateData.category = updateData.categoryId;
      delete updateData.categoryId;
    }
    
    const product = await Product.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    ).populate('category', 'name');
    
    if (!product) {
      const error = new Error(`Product not found with ID: ${id}`);
      error.statusCode = 404;
      return next(error);
    }
    
    // Log product update
    logger.info(`Product updated: ${product.name} (${product.sku})`, {
      productId: product._id,
      userId: req.user.id
    });
    
    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete product
 * @route DELETE /api/products/:id
 */
exports.deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const product = await Product.findById(id);
    
    if (!product) {
      const error = new Error(`Product not found with ID: ${id}`);
      error.statusCode = 404;
      return next(error);
    }
    
    // Instead of deleting, mark as inactive
    product.isActive = false;
    product.updatedBy = req.user.id;
    await product.save();
    
    // Log product deletion
    logger.info(`Product marked as inactive: ${product.name} (${product.sku})`, {
      productId: product._id,
      userId: req.user.id
    });
    
    res.status(200).json({
      success: true,
      message: 'Product successfully deactivated'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update product stock for a store
 * @route PATCH /api/products/:id/stock
 */
exports.updateStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { storeId, quantity, operation, location } = req.body;
    
    if (!storeId) {
      const error = new Error('Store ID is required');
      error.statusCode = 400;
      return next(error);
    }
    
    const product = await Product.findById(id);
    
    if (!product) {
      const error = new Error(`Product not found with ID: ${id}`);
      error.statusCode = 404;
      return next(error);
    }
    
    // Find the store in product's stores array
    const storeIndex = product.stores.findIndex(s => s.storeId === storeId);
    
    if (storeIndex === -1) {
      // Store not found in product, add it
      product.stores.push({
        storeId,
        quantity: operation === 'set' ? quantity : (operation === 'add' ? quantity : 0),
        location: location || ''
      });
    } else {
      // Store exists, update quantity
      if (operation === 'set') {
        product.stores[storeIndex].quantity = quantity;
      } else if (operation === 'add') {
        product.stores[storeIndex].quantity += quantity;
      } else if (operation === 'subtract') {
        product.stores[storeIndex].quantity = Math.max(0, product.stores[storeIndex].quantity - quantity);
      }
      
      // Update location if provided
      if (location) {
        product.stores[storeIndex].location = location;
      }
    }
    
    product.updatedBy = req.user.id;
    await product.save();
    
    // Log stock update
    logger.info(`Product stock updated: ${product.name} (${product.sku})`, {
      productId: product._id,
      storeId,
      operation,
      quantity,
      userId: req.user.id,
      newQuantity: operation === 'set' ? 
        quantity : 
        product.stores.find(s => s.storeId === storeId).quantity
    });
    
    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get low stock products
 * @route GET /api/products/low-stock
 */
exports.getLowStockProducts = async (req, res, next) => {
  try {
    const { storeId } = req.query;
    
    if (!storeId) {
      const error = new Error('Store ID is required');
      error.statusCode = 400;
      return next(error);
    }
    
    const lowStockProducts = await Product.getLowStockProducts(storeId);
    
    res.status(200).json({
      success: true,
      data: lowStockProducts,
      count: lowStockProducts.length
    });
  } catch (error) {
    next(error);
  }
};