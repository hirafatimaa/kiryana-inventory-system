/**
 * Dashboard Preference Model
 * 
 * Stores user dashboard layout and widget preferences
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const WidgetConfigSchema = new Schema({
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
  
  // Widget position in grid
  position: {
    row: { type: Number, required: true },
    col: { type: Number, required: true },
    width: { type: Number, default: 1 },
    height: { type: Number, default: 1 }
  },
  
  // Widget-specific configuration
  config: {
    type: Object,
    default: {}
  },
  
  // Visual preferences
  visual: {
    title: { type: String },
    chartType: { 
      type: String, 
      enum: ['bar', 'line', 'pie', 'table', 'card', 'list', null],
      default: null
    },
    colorScheme: { type: String, default: 'default' }
  }
});

const DashboardPreferenceSchema = new Schema({
  // User ID who owns this dashboard preference
  userId: {
    type: String,
    required: [true, 'User ID is required'],
    index: true
  },
  
  // Dashboard type 
  dashboardType: {
    type: String,
    required: [true, 'Dashboard type is required'],
    enum: ['home', 'inventory', 'sales', 'custom'],
    default: 'home'
  },
  
  // Dashboard name (only for custom dashboards)
  name: {
    type: String
  },
  
  // Dashboard layout type
  layoutType: {
    type: String,
    enum: ['grid', 'free'],
    default: 'grid'
  },
  
  // Dashboard widgets
  widgets: [WidgetConfigSchema],
  
  // Dashboard settings
  settings: {
    autoRefreshInterval: { type: Number, default: 0 }, // 0 means no auto-refresh
    defaultDateRange: { 
      type: String,
      enum: ['today', 'yesterday', 'last7days', 'last30days', 'thisMonth', 'lastMonth', 'custom'],
      default: 'last7days'
    },
    customDateRange: {
      start: { type: Date },
      end: { type: Date }
    }
  },
  
  // Metadata
  isDefault: {
    type: Boolean,
    default: false
  },
  isSystem: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  }
});

// Create compound index for finding specific dashboard preferences
DashboardPreferenceSchema.index({ 
  userId: 1,
  dashboardType: 1
});

/**
 * Transform the document before sending to client
 */
DashboardPreferenceSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('DashboardPreference', DashboardPreferenceSchema);