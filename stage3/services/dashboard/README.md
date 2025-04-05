# Dashboard Service

A microservice for managing dashboard preferences and widget data in the Kiryana Inventory System.

## Features

- Dashboard preference management (create, update, delete)
- Widget data retrieval and caching
- Integration with other microservices (inventory, product, store, reporting)
- User-specific dashboard configurations
- Real-time data visualization

## Architecture

The Dashboard Service follows a clean architecture pattern:

- **Controllers**: Handle HTTP requests and responses
- **Models**: Define data schemas and business logic
- **Routes**: Define API endpoints
- **Middleware**: Handle authentication, validation, and error handling
- **Utils**: Provide shared utilities and helper functions

## API Endpoints

### Dashboard Preferences

- `GET /api/dashboards`: Get user dashboard preferences
- `POST /api/dashboards`: Create a new dashboard preference
- `GET /api/dashboards/:id`: Get dashboard preference by ID
- `PUT /api/dashboards/:id`: Update a dashboard preference
- `DELETE /api/dashboards/:id`: Delete a dashboard preference
- `PUT /api/dashboards/:id/default`: Set dashboard as default
- `GET /api/dashboards/default/:dashboardType`: Get default dashboard for type

### Widgets

- `GET /api/widgets/sales-summary`: Get sales summary widget data
- `GET /api/widgets/inventory-status`: Get inventory status widget data
- `GET /api/widgets/low-stock-alerts`: Get low stock alerts widget data
- `GET /api/widgets/recent-movements`: Get recent inventory movements widget data
- `GET /api/widgets/top-products`: Get top selling products widget data

## Getting Started

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file based on `.env.example` with your configuration

3. Start the server:
   ```
   npm start
   ```

   Or for development with auto-reload:
   ```
   npm run dev
   ```

## Dependencies

- Express: Web framework
- Mongoose: MongoDB ODM
- Axios: HTTP client for service communication
- Winston: Logging
- Helmet: Security middleware
- Compression: Response compression
- Morgan: HTTP request logger