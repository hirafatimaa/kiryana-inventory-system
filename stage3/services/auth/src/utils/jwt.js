/**
 * JWT Utility
 * 
 * JWT token generation and verification functions
 */

const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('./logger');

/**
 * Generate JWT access token
 * @param {Object} payload - Token payload
 * @returns {String} JWT access token
 */
exports.generateAccessToken = (payload) => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.accessExpiresIn
  });
};

/**
 * Generate JWT refresh token
 * @param {Object} payload - Token payload
 * @returns {String} JWT refresh token
 */
exports.generateRefreshToken = (payload) => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpiresIn
  });
};

/**
 * Verify JWT token
 * @param {String} token - JWT token to verify
 * @returns {Object} Decoded token payload or null if invalid
 */
exports.verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    logger.warn(`JWT verification failed: ${error.message}`);
    return null;
  }
};

/**
 * Generate token response object with access and refresh tokens
 * @param {Object} user - User object
 * @param {Object} role - Role object
 * @returns {Object} Token response object
 */
exports.generateTokenResponse = (user, role) => {
  // Create token payload
  const payload = {
    id: user._id,
    username: user.username,
    email: user.email,
    role: role.name
  };
  
  // Generate tokens
  const accessToken = exports.generateAccessToken(payload);
  const refreshToken = exports.generateRefreshToken(payload);
  
  // Token expiration times
  const accessExpires = jwt.decode(accessToken).exp * 1000; // Convert to milliseconds
  const refreshExpires = jwt.decode(refreshToken).exp * 1000; // Convert to milliseconds
  
  return {
    accessToken,
    refreshToken,
    expiresAt: new Date(accessExpires).toISOString(),
    refreshExpiresAt: new Date(refreshExpires).toISOString(),
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: {
        id: role._id,
        name: role.name
      }
    }
  };
};