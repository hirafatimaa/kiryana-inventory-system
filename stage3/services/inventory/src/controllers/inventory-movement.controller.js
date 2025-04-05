/**
 * Inventory Movement Controller
 * 
 * Handles inventory movement operations (stock-in, sales, removals)
 */

const InventoryMovement = require('../models/inventory-movement');
const InventorySummary = require('../models/inventory-summary');
const { product } = require('../utils/service-client');
const logger = require('../utils/logger');

/**
 * Record a new inventory movement (stock-in, sale, or removal)
 * Also updates the inventory summary collection to maintain current levels
 */
exports.recordMovement = async (req, res, next) => {
  try {
    const { 
      productId, 
      storeId, 
      movementType, 
      quantity, 
      unitPrice, 
      reference, 
      reason, 
      notes,
      movementDate 
    } = req.body;
    
    // Validate quantity sign based on movement type
    let normalizedQuantity = parseInt(quantity, 10);
    
    if (movementType === 'stock_in' && normalizedQuantity < 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_QUANTITY',
          message: 'Stock-in quantity must be positive'
        }
      });
    }
    
    if ((movementType === 'sale' || movementType === 'removal') && normalizedQuantity > 0) {
      // For outgoing movements, convert to negative
      normalizedQuantity = -Math.abs(normalizedQuantity);
    }
    
    // Verify product exists via product service
    try {
      await product.get(`/products/${productId}`);
    } catch (error) {
      if (error.response?.status === 404) {
        return res.status(404).json({
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'The specified product does not exist'
          }
        });
      }
      
      logger.error('Error verifying product existence:', error);
      return res.status(502).json({
        error: {
          code: 'PRODUCT_SERVICE_ERROR',
          message: 'Unable to verify product in product service'
        }
      });
    }
    
    // Create the movement record
    const movement = new InventoryMovement({
      productId,
      storeId,
      movementType,
      quantity: normalizedQuantity,
      unitPrice,
      reference,
      reason: movementType === 'removal' ? reason : null,
      notes,
      movementDate: movementDate || new Date(),
      createdBy: req.user.id
    });
    
    // Save the movement
    await movement.save();
    
    // Update inventory summary
    let summary = await InventorySummary.findOne({ productId, storeId });
    
    if (!summary) {
      // Create a new summary if it doesn't exist
      summary = new InventorySummary({
        productId,
        storeId,
        currentQuantity: 0
      });
    }
    
    // Update current quantity
    summary.currentQuantity += normalizedQuantity;
    
    // Update last movement date
    summary.lastMovementDate = movement.movementDate;
    
    // Update last stock-in price if this is a stock-in movement
    if (movementType === 'stock_in') {
      summary.lastStockInPrice = unitPrice;
    }
    
    // Calculate value at cost
    summary.valueAtCost = summary.lastStockInPrice 
      ? summary.currentQuantity * summary.lastStockInPrice 
      : 0;
    
    // Save the summary
    await summary.save();
    
    // Return the created movement
    return res.status(201).json(movement);
  } catch (error) {
    return next(error);
  }
};

/**
 * Get all inventory movements with filtering options
 */
exports.getMovements = async (req, res, next) => {
  try {
    const { 
      storeId, 
      productId, 
      movementType, 
      startDate, 
      endDate, 
      page = 1, 
      limit = 50,
      sort = '-movementDate'
    } = req.query;
    
    // Build filter criteria
    const filter = {};
    
    if (storeId) filter.storeId = storeId;
    if (productId) filter.productId = productId;
    if (movementType) filter.movementType = movementType;
    
    // Date range filter
    if (startDate || endDate) {
      filter.movementDate = {};
      if (startDate) filter.movementDate.$gte = new Date(startDate);
      if (endDate) filter.movementDate.$lte = new Date(endDate);
    }
    
    // Parse pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute query with pagination
    const movements = await InventoryMovement.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .exec();
    
    // Get total count for pagination metadata
    const total = await InventoryMovement.countDocuments(filter);
    
    return res.json({
      data: movements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get an inventory movement by ID
 */
exports.getMovementById = async (req, res, next) => {
  try {
    const movement = await InventoryMovement.findById(req.params.id);
    
    if (!movement) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Inventory movement not found'
        }
      });
    }
    
    return res.json(movement);
  } catch (error) {
    return next(error);
  }
};

/**
 * Cancel an inventory movement
 * Creates a reverse movement and updates inventory summary
 */
exports.cancelMovement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    // Find the original movement
    const originalMovement = await InventoryMovement.findById(id);
    
    if (!originalMovement) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Inventory movement not found'
        }
      });
    }
    
    // Create a reversal movement
    const reversalMovement = new InventoryMovement({
      productId: originalMovement.productId,
      storeId: originalMovement.storeId,
      movementType: originalMovement.movementType,
      quantity: -originalMovement.quantity, // Reverse the quantity
      unitPrice: originalMovement.unitPrice,
      reference: `CANCEL-${originalMovement._id}`,
      reason: reason || 'Cancellation',
      notes: `Cancellation of movement #${originalMovement._id}`,
      createdBy: req.user.id
    });
    
    // Save the reversal
    await reversalMovement.save();
    
    // Update inventory summary
    const summary = await InventorySummary.findOne({
      productId: originalMovement.productId,
      storeId: originalMovement.storeId
    });
    
    if (summary) {
      // Update quantity (adding the negative of the original)
      summary.currentQuantity -= originalMovement.quantity;
      
      // Update last movement date
      summary.lastMovementDate = new Date();
      
      // Recalculate value
      summary.valueAtCost = summary.lastStockInPrice 
        ? summary.currentQuantity * summary.lastStockInPrice 
        : 0;
      
      await summary.save();
    }
    
    return res.status(201).json(reversalMovement);
  } catch (error) {
    return next(error);
  }
};