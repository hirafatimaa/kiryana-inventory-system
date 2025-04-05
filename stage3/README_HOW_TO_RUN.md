# Kiryana Inventory System - Stage 3

## Running the Microservices Architecture

Stage 3 of the Kiryana Inventory System uses a microservices architecture built with Node.js. This README provides instructions on how to run the system.

### Prerequisites

- Node.js 20.x or later
- PostgreSQL database (same database used in previous stages)
- Environment variables properly configured in the `.env` file

### Environment Setup

The `.env` file in the `stage3` directory contains all the necessary configuration for the microservices. Make sure it includes:

- API Gateway configuration
- Microservice URLs
- Database connection string
- JWT secret for authentication

### Starting the Services

#### Option 1: Start All Services at Once

Run the master script to start all microservices and the API gateway:

```bash
cd stage3
./start_all_services.sh
```

This will start all services in the correct order and keep them running.

#### Option 2: Start Individual Services

You can also start each service individually in separate terminals:

1. Auth Service:
   ```bash
   cd stage3
   ./start_auth_service.sh
   ```

2. Product Service:
   ```bash
   cd stage3
   ./start_product_service.sh
   ```

3. Inventory Service:
   ```bash
   cd stage3
   ./start_inventory_service.sh
   ```

4. Store Service:
   ```bash
   cd stage3
   ./start_store_service.sh
   ```

5. Reporting Service:
   ```bash
   cd stage3
   ./start_reporting_service.sh
   ```

6. API Gateway (start this last):
   ```bash
   cd stage3
   ./start_api_gateway.sh
   ```

### Service Ports

- API Gateway: http://localhost:3000
- Auth Service: http://localhost:3001
- Product Service: http://localhost:3002
- Inventory Service: http://localhost:3003
- Store Service: http://localhost:3004
- Reporting Service: http://localhost:3005

### REST API Endpoints

Access all services through the API Gateway using the following routes:

- Authentication: `/api/v1/auth/...`
- Products: `/api/v1/products/...`
- Inventory: `/api/v1/inventory/...`
- Stores: `/api/v1/stores/...`
- Reports: `/api/v1/reports/...`

### Troubleshooting

If you encounter issues:

1. Check the logs for each service
2. Verify the database connection is working
3. Ensure all ports are available
4. Check the `.env` file has correct configuration
