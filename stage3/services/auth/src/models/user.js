/**
 * User Model
 * 
 * Defines the schema and methods for user entities
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const config = require('../config');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: config.password.minLength
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'staff'],
    default: 'staff'
  },
  stores: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Store',
    default: []
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  refreshTokens: {
    type: [String],
    default: []
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
  timestamps: true
});

// Pre-save hook to hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified or is new
  if (!this.isModified('password')) return next();
  
  try {
    // Generate salt and hash the password
    const salt = await bcrypt.genSalt(config.password.saltRounds);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to check if password is valid
userSchema.methods.isValidPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Method to check if user has access to a specific store
userSchema.methods.hasStoreAccess = function(storeId) {
  // Admin has access to all stores
  if (this.role === 'admin') return true;
  
  // Check if user has this store in their allowed stores
  return this.stores.some(store => store.toString() === storeId.toString());
};

// Method to get user's profile (safe data without sensitive info)
userSchema.methods.getProfile = function() {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    firstName: this.firstName,
    lastName: this.lastName,
    role: this.role,
    isActive: this.isActive,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt
  };
};

// Static method to find user by username or email
userSchema.statics.findByCredentials = async function(usernameOrEmail) {
  // Try to find user by username or email
  return this.findOne({
    $or: [
      { username: usernameOrEmail.toLowerCase() },
      { email: usernameOrEmail.toLowerCase() }
    ]
  });
};

// Create the User model
const User = mongoose.model('User', userSchema);

module.exports = User;