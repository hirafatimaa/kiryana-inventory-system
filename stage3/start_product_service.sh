#!/bin/bash

# Start Product Service
echo "Starting Kiryana Inventory System - Product Service"
cd "$(dirname "$0")"
node services/product/src/app.js
