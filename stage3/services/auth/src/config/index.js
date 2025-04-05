/**
 * Configuration
 * 
 * Central configuration for the auth service
 */

require('dotenv').config();

module.exports = {
  server: {
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3001,
    basePath: process.env.BASE_PATH || '/api/v1/auth',
    corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['*']
  },
  database: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/kiryana_auth',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'kiryana-auth-secret-key',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/auth-service.log'
  },
  security: {
    passwordSaltRounds: parseInt(process.env.PASSWORD_SALT_ROUNDS || '10', 10)
  }
};