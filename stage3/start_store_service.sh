#!/bin/bash

# Start Store Service
echo "Starting Kiryana Inventory System - Store Service"
cd "$(dirname "$0")"
node services/store/src/app.js
