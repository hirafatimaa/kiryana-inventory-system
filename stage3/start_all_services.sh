#!/bin/bash

# Start All Microservices
echo "Starting Kiryana Inventory System - Stage 3 (All Services)"
cd "$(dirname "$0")"

# Start each service in background
echo "Starting Auth Service..."
./start_auth_service.sh &
AUTH_PID=$!

echo "Starting Product Service..."
./start_product_service.sh &
PRODUCT_PID=$!

echo "Starting Inventory Service..."
./start_inventory_service.sh &
INVENTORY_PID=$!

echo "Starting Store Service..."
./start_store_service.sh &
STORE_PID=$!

echo "Starting Reporting Service..."
./start_reporting_service.sh &
REPORTING_PID=$!

# Wait a moment to allow services to start
sleep 5

# Start API Gateway (not in background)
echo "Starting API Gateway..."
./start_api_gateway.sh

# Clean up on exit
trap "kill $AUTH_PID $PRODUCT_PID $INVENTORY_PID $STORE_PID $REPORTING_PID" EXIT
