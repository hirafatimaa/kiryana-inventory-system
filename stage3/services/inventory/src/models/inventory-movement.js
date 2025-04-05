/**
 * Inventory Movement Model
 * 
 * Represents stock changes: stock-in, sales, and removals
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const InventoryMovementSchema = new Schema({
  // References
  productId: {
    type: String,
    required: [true, 'Product ID is required'],
    index: true
  },
  storeId: {
    type: String,
    required: [true, 'Store ID is required'],
    index: true
  },
  
  // Movement details
  movementType: {
    type: String,
    enum: ['stock_in', 'sale', 'removal'],
    required: [true, 'Movement type is required']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    validate: {
      validator: value => value !== 0,
      message: 'Quantity cannot be zero'
    }
  },
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Unit price cannot be negative']
  },
  
  // Tracking info
  reference: {
    type: String,
    trim: true
  },
  reason: {
    type: String,
    enum: ['damaged', 'expired', 'stolen', 'other', null],
    default: null
  },
  notes: {
    type: String,
    trim: true
  },
  
  // Metadata
  movementDate: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: String,
    required: [true, 'Creator ID is required']
  },
  
  // Timestamps
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

// Create compound index for efficient reporting queries
InventoryMovementSchema.index({ storeId: 1, productId: 1, movementDate: -1 });
InventoryMovementSchema.index({ movementDate: -1 });

/**
 * Transform the document before sending to client
 */
InventoryMovementSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('InventoryMovement', InventoryMovementSchema);