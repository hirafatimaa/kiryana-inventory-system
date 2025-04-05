# Product Microservice

This microservice handles all product-related operations for the Kiryana Inventory System.

## Features

- Product management (CRUD operations)
- Category management
- Stock level tracking across stores
- Low stock alerts
- Product search and filtering

## API Endpoints

### Products

- `GET /api/products` - Get all products with filtering
- `POST /api/products` - Create a new product
- `GET /api/products/low-stock` - Get products with low stock
- `GET /api/products/:id` - Get a product by ID
- `PUT /api/products/:id` - Update a product
- `DELETE /api/products/:id` - Delete/deactivate a product
- `PATCH /api/products/:id/stock` - Update product stock

### Categories

- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create a new category
- `GET /api/categories/:id` - Get a category by ID
- `PUT /api/categories/:id` - Update a category
- `DELETE /api/categories/:id` - Delete a category

## Environment Variables

- `PORT` - Port to run the service on (default: 3001)
- `MONGODB_URI` - MongoDB connection string
- `NODE_ENV` - Environment (development, production)
- `AUTH_SERVICE_URL` - URL of the authentication service
- `LOG_LEVEL` - Logging level (default: info)
- `CORS_ORIGINS` - Comma-separated list of allowed origins

## Getting Started

1. Install dependencies:
   ```
   npm install
   ```

2. Start the service:
   ```
   npm start
   ```

3. For development with auto-reload:
   ```
   npm run dev
   ```

## Authentication and Authorization

This service relies on the Auth Service for token verification. All endpoints require a valid JWT token except for the health check endpoint.

### Role-Based Access Control

- `admin` - Full access to all endpoints
- `inventory_manager` - Create, read, update products and categories
- `store_manager` - Read products and update stock levels
- `staff` - Read-only access to products and categories