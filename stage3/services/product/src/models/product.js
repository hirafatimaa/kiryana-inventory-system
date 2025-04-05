/**
 * Product Model
 * 
 * Defines the schema for products
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const productSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },
  
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    unique: true,
    trim: true,
    maxlength: [50, 'SKU cannot exceed 50 characters'],
    index: true
  },
  
  description: {
    type: String,
    trim: true
  },
  
  category: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Product category is required']
  },
  
  unit: {
    type: String,
    enum: ['piece', 'kg', 'g', 'l', 'ml', 'box', 'package', 'other'],
    default: 'piece'
  },
  
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative']
  },
  
  costPrice: {
    type: Number,
    min: [0, 'Cost price cannot be negative']
  },
  
  reorderLevel: {
    type: Number,
    min: [0, 'Reorder level cannot be negative'],
    default: 10
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  stores: [{
    storeId: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      default: 0
    },
    location: {
      type: String,
      default: ''
    }
  }],
  
  tags: [String],
  
  barcodes: [{
    type: String,
    unique: true,
    sparse: true
  }],
  
  images: [{
    url: String,
    isDefault: {
      type: Boolean,
      default: false
    }
  }],
  
  attributes: [{
    name: String,
    value: String
  }],
  
  supplier: {
    id: String,
    name: String,
    contact: String
  },
  
  createdBy: {
    type: String,
    ref: 'User'
  },
  
  updatedBy: {
    type: String,
    ref: 'User'
  }
}, { 
  timestamps: true
});

// Indexes for better performance
productSchema.index({ name: 'text', description: 'text', sku: 'text' });
productSchema.index({ 'stores.storeId': 1 });
productSchema.index({ isActive: 1 });

// Method to check if product is low on stock in a store
productSchema.methods.isLowStock = function(storeId) {
  const store = this.stores.find(s => s.storeId === storeId);
  if (!store) return false;
  return store.quantity <= this.reorderLevel;
};

// Static method to get low stock products for a store
productSchema.statics.getLowStockProducts = function(storeId) {
  return this.aggregate([
    { $match: { isActive: true } },
    { $unwind: '$stores' },
    { $match: { 'stores.storeId': storeId } },
    { $addFields: {
      isLow: { $lte: ['$stores.quantity', '$reorderLevel'] }
    }},
    { $match: { isLow: true } },
    { $sort: { 'stores.quantity': 1 } }
  ]);
};

module.exports = mongoose.model('Product', productSchema);