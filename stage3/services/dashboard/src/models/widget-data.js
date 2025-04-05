/**
 * Widget Data Model
 * 
 * Stores cached widget data for dashboard components
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const config = require('../config');

const WidgetDataSchema = new Schema({
  // Widget type identifier
  widgetType: {
    type: String,
    required: [true, 'Widget type is required'],
    enum: [
      'sales_summary',
      'inventory_status',
      'low_stock_alert',
      'recent_movements',
      'top_products',
      'sales_trend',
      'inventory_value',
      'custom'
    ]
  },
  
  // Parameters that define the uniqueness of the widget data
  parameters: {
    type: Object,
    required: [true, 'Widget parameters are required']
  },
  
  // The actual widget data
  data: {
    type: Schema.Types.Mixed,
    required: [true, 'Widget data is required']
  },
  
  // Metadata
  generatedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: function() {
      const now = new Date();
      return new Date(now.getTime() + config.dashboard.widgetCacheTimeMinutes * 60000);
    }
  },
  storeId: {
    type: String
  }
}, {
  timestamps: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  }
});

// Create index for efficient lookups
WidgetDataSchema.index({ widgetType: 1, expiresAt: 1 });

// Create TTL index to automatically delete expired widget data
WidgetDataSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Create a compound index for finding specific widget data
WidgetDataSchema.index({ 
  widgetType: 1,
  'parameters.storeId': 1,
  'parameters.startDate': 1,
  'parameters.endDate': 1
});

/**
 * Transform the document before sending to client
 */
WidgetDataSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('WidgetData', WidgetDataSchema);