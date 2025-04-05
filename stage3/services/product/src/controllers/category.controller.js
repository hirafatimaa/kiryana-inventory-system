/**
 * Category Controller
 * 
 * Handles business logic for category operations
 */

const Category = require('../models/category');
const Product = require('../models/product');
const logger = require('../utils/logger');

/**
 * Create a new category
 * @route POST /api/categories
 */
exports.createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    
    // Check if category with same name already exists
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      const error = new Error(`Category with name '${name}' already exists`);
      error.statusCode = 400;
      return next(error);
    }
    
    // Create new category
    const category = new Category({
      name,
      description,
      createdBy: req.user.id
    });
    
    const savedCategory = await category.save();
    
    // Log category creation
    logger.info(`Category created: ${savedCategory.name}`, {
      categoryId: savedCategory._id,
      userId: req.user.id
    });
    
    res.status(201).json({
      success: true,
      data: savedCategory
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all categories
 * @route GET /api/categories
 */
exports.getCategories = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      sort = 'name', 
      order = 'asc',
      withProductCount = false
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === 'desc' ? -1 : 1;
    const sortOption = { [sort]: sortOrder };
    
    // Get categories with optional product count
    let categories;
    if (withProductCount === 'true') {
      categories = await Category.find()
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('productCount');
    } else {
      categories = await Category.find()
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit));
    }
    
    // Get total count for pagination
    const total = await Category.countDocuments();
    
    res.status(200).json({
      success: true,
      data: categories,
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
 * Get category by ID
 * @route GET /api/categories/:id
 */
exports.getCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { withProducts = false } = req.query;
    
    const category = await Category.findById(id);
    
    if (!category) {
      const error = new Error(`Category not found with ID: ${id}`);
      error.statusCode = 404;
      return next(error);
    }
    
    // Get products in this category if requested
    let products = [];
    if (withProducts === 'true') {
      products = await Product.find({ category: id })
        .select('name sku price isActive');
    }
    
    res.status(200).json({
      success: true,
      data: {
        ...category.toObject(),
        products: withProducts === 'true' ? products : undefined
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update category
 * @route PUT /api/categories/:id
 */
exports.updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, updatedBy: req.user.id };
    
    // If changing name, check if new name already exists
    if (updateData.name) {
      const existingCategory = await Category.findOne({ 
        name: updateData.name, 
        _id: { $ne: id }
      });
      
      if (existingCategory) {
        const error = new Error(`Category with name '${updateData.name}' already exists`);
        error.statusCode = 400;
        return next(error);
      }
    }
    
    const category = await Category.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    );
    
    if (!category) {
      const error = new Error(`Category not found with ID: ${id}`);
      error.statusCode = 404;
      return next(error);
    }
    
    // Log category update
    logger.info(`Category updated: ${category.name}`, {
      categoryId: category._id,
      userId: req.user.id
    });
    
    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete category
 * @route DELETE /api/categories/:id
 */
exports.deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if category is being used by products
    const productsCount = await Product.countDocuments({ category: id });
    
    if (productsCount > 0) {
      const error = new Error(`Cannot delete category: it is associated with ${productsCount} products`);
      error.statusCode = 400;
      return next(error);
    }
    
    const category = await Category.findByIdAndDelete(id);
    
    if (!category) {
      const error = new Error(`Category not found with ID: ${id}`);
      error.statusCode = 404;
      return next(error);
    }
    
    // Log category deletion
    logger.info(`Category deleted: ${category.name}`, {
      categoryId: category._id,
      userId: req.user.id
    });
    
    res.status(200).json({
      success: true,
      message: 'Category successfully deleted'
    });
  } catch (error) {
    next(error);
  }
};