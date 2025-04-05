#!/bin/bash

# Start Reporting Service
echo "Starting Kiryana Inventory System - Reporting Service"
cd "$(dirname "$0")"
node services/reporting/src/app.js
