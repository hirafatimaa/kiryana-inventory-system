#!/bin/bash

# Start Auth Service
echo "Starting Kiryana Inventory System - Auth Service"
cd "$(dirname "$0")"
node services/auth/src/app.js
