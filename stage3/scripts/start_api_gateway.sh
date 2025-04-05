#!/bin/bash

# Start API Gateway
echo "Starting API Gateway..."
cd "$(dirname "$0")/.."
cd api_gateway
npm start