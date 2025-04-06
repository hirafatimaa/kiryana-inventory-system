
#!/bin/bash

echo "Starting Kiryana Inventory System - Stage 3"
echo "----------------------------------------"

# Start API Gateway
node api_gateway/src/index.js &
echo "Started API Gateway on port 3000"

# Start Auth Service
cd services/auth/src && node server.js &
echo "Started Auth Service on port 3001"

# Start Product Service  
cd ../product/src && node server.js &
echo "Started Product Service on port 3002"

# Start Inventory Service
cd ../inventory/src && node server.js &
echo "Started Inventory Service on port 3003"

# Start Store Service
cd ../store/src && node server.js &
echo "Started Store Service on port 3004"

# Start Reporting Service
cd ../reporting/src && node server.js &
echo "Started Reporting Service on port 3005"

# Wait for all background processes
wait
