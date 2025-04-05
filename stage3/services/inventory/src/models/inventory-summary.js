/**
 * Inventory Summary Model
 * 
 * Represents the current inventory levels for products across stores
 * This is a denormalized collection for performance optimization
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const InventorySummarySchema = new Schema({
  // Compound key reference
  productId: {
    type: String,
    required: [true, 'Product ID is required']
  },
  storeId: {
    type: String,
    required: [true, 'Store ID is required']
  },
  
  // Current inventory data
  currentQuantity: {
    type: Number,
    default: 0
  },
  lastStockInPrice: {
    type: Number,
    min: [0, 'Price cannot be negative']
  },
  valueAtCost: {
    type: Number,
    default: 0
  },
  
  // Tracking thresholds
  reorderLevel: {
    type: Number,
    default: 10,
    min: [0, 'Reorder level cannot be negative']
  },
  
  // Timestamps
  lastMovementDate: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  }
});

// Create a compound unique index for product-store combination
InventorySummarySchema.index({ productId: 1, storeId: 1 }, { unique: true });

// Create indexes for efficient queries
InventorySummarySchema.index({ storeId: 1, currentQuantity: 1 });
InventorySummarySchema.index({ productId: 1 });

/**
 * Virtual method to check if product is below reorder level
 */
InventorySummarySchema.virtual('isLowStock').get(function() {
  return this.currentQuantity <= this.reorderLevel;
});

/**
 * Transform the document before sending to client
 */
InventorySummarySchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    ret.isLowStock = doc.isLowStock;
    return ret;
  },
  virtuals: true
});

module.exports = mongoose.model('InventorySummary', InventorySummarySchema);