# Kiryana Inventory System - Stage 3

## Overview

Stage 3 of the Kiryana Inventory System is a microservices-based architecture designed to support thousands of stores with high throughput and scalability. This system builds upon the foundation laid in Stages 1 and 2, with each microservice focusing on a specific domain of functionality.

## Architecture

The system consists of the following components:

1. **API Gateway**: Central entry point that routes requests to appropriate microservices
2. **Auth Service**: Handles authentication, authorization, and user management
3. **Product Service**: Manages product information and catalog
4. **Inventory Service**: Tracks inventory movements and stock levels
5. **Store Service**: Manages store information and statistics
6. **Reporting Service**: Generates reports and analytics

## Technology Stack

- **Backend**: Node.js 20 with Express
- **Database**: PostgreSQL (shared with previous stages)
- **Authentication**: JWT-based authentication
- **API Gateway**: Express with http-proxy-middleware
- **Caching**: In-memory caching for reports
- **Logging**: Winston and Morgan

## Deployment

See [README_HOW_TO_RUN.md](./README_HOW_TO_RUN.md) for detailed instructions on how to run the microservices.

## Development

Each microservice is designed to be independently deployable and maintainable. The services communicate with each other through the API Gateway to maintain a clean separation of concerns.

## Features

- Multi-store inventory management
- User authentication and role-based access control
- Real-time inventory tracking
- Comprehensive reporting and analytics
- Performance optimized for scale

## Migration from Stage 2

Stage 3 maintains database compatibility with Stage 2, allowing for a seamless transition. The same PostgreSQL database is used, but accessed through microservices instead of a monolithic application.
