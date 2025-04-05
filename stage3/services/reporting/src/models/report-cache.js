/**
 * Report Cache Model
 * 
 * Stores generated reports for performance optimization
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const config = require('../config');

const ReportCacheSchema = new Schema({
  // Report identification
  reportType: {
    type: String,
    required: [true, 'Report type is required'],
    enum: [
      'inventory_status',
      'inventory_movements',
      'sales_summary',
      'low_stock',
      'sales_by_product',
      'sales_by_store',
      'stock_value',
      'custom'
    ]
  },
  
  // Parameters that define the uniqueness of the report
  parameters: {
    type: Object,
    required: [true, 'Report parameters are required']
  },
  
  // The actual report data
  data: {
    type: Schema.Types.Mixed,
    required: [true, 'Report data is required']
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
      return new Date(now.getTime() + config.reports.cacheTimeMinutes * 60000);
    }
  },
  generatedBy: {
    type: String
  }
}, {
  timestamps: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  }
});

// Create index for efficient lookups
ReportCacheSchema.index({ reportType: 1, expiresAt: 1 });

// Create TTL index to automatically delete expired reports
ReportCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Create a compound index for finding specific reports
ReportCacheSchema.index({ 
  reportType: 1,
  'parameters.storeId': 1,
  'parameters.startDate': 1,
  'parameters.endDate': 1
});

/**
 * Transform the document before sending to client
 */
ReportCacheSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('ReportCache', ReportCacheSchema);