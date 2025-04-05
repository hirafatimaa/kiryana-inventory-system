#!/bin/bash

# Start Stage 3 API Gateway
echo "Starting Kiryana Inventory System - Stage 3 API Gateway"
cd "$(dirname "$0")"
node api_gateway/src/index.js
