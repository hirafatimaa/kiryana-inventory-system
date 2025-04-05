/**
 * Store Model
 * 
 * Represents a physical store location in the Kiryana network
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Address schema for nested document
const AddressSchema = new Schema({
  street: {
    type: String,
    required: [true, 'Street address is required'],
    trim: true
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true
  },
  province: {
    type: String,
    required: [true, 'Province/State is required'],
    trim: true
  },
  postalCode: {
    type: String,
    required: [true, 'Postal code is required'],
    trim: true
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    default: 'Pakistan',
    trim: true
  }
}, { _id: false });

// Operating hours schema for nested document
const HoursSchema = new Schema({
  monday: {
    open: { type: String, default: '09:00' },
    close: { type: String, default: '18:00' },
    isClosed: { type: Boolean, default: false }
  },
  tuesday: {
    open: { type: String, default: '09:00' },
    close: { type: String, default: '18:00' },
    isClosed: { type: Boolean, default: false }
  },
  wednesday: {
    open: { type: String, default: '09:00' },
    close: { type: String, default: '18:00' },
    isClosed: { type: Boolean, default: false }
  },
  thursday: {
    open: { type: String, default: '09:00' },
    close: { type: String, default: '18:00' },
    isClosed: { type: Boolean, default: false }
  },
  friday: {
    open: { type: String, default: '09:00' },
    close: { type: String, default: '18:00' },
    isClosed: { type: Boolean, default: false }
  },
  saturday: {
    open: { type: String, default: '09:00' },
    close: { type: String, default: '18:00' },
    isClosed: { type: Boolean, default: false }
  },
  sunday: {
    open: { type: String, default: '09:00' },
    close: { type: String, default: '18:00' },
    isClosed: { type: Boolean, default: true }
  }
}, { _id: false });

// Main store schema
const StoreSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Store name is required'],
    trim: true,
    maxlength: [100, 'Store name cannot be longer than 100 characters']
  },
  code: {
    type: String,
    required: [true, 'Store code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: [10, 'Store code cannot be longer than 10 characters']
  },
  address: {
    type: AddressSchema,
    required: [true, 'Address is required']
  },
  phone: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/.+\@.+\..+/, 'Please enter a valid email address']
  },
  operatingHours: {
    type: HoursSchema,
    default: () => ({})
  },
  storeManager: {
    userId: { type: String },
    name: { type: String },
    phone: { type: String }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  openingDate: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
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

// Create indexes
StoreSchema.index({ code: 1 }, { unique: true });
StoreSchema.index({ location: '2dsphere' });
StoreSchema.index({ isActive: 1 });

// Create a method to format address as a string
StoreSchema.methods.getFullAddress = function() {
  const addr = this.address;
  return `${addr.street}, ${addr.city}, ${addr.province}, ${addr.postalCode}, ${addr.country}`;
};

// Format the response
StoreSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Store', StoreSchema);