#!/bin/bash

# Start Inventory Service
echo "Starting Kiryana Inventory System - Inventory Service"
cd "$(dirname "$0")"
node services/inventory/src/app.js
