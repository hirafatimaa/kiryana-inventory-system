# Kiryana Inventory Tracking System

A scalable inventory management solution for kiryana stores, designed to evolve from a single store solution to a multi-store enterprise system.

## Project Overview

This inventory tracking system solves key business challenges:

1. **Real-time Stock Visibility**: Prevent stockouts and overstocking by maintaining accurate inventory levels
2. **Streamlined Stock Management**: Record stock movements including purchases, sales, and removals
3. **Inventory Reporting**: Generate reports to track inventory history and status
4. **Low Stock Alerts**: Get notified when products reach reorder levels

## Architecture and Design Decisions

The system follows a phased approach to development:

### Phase 1: Single Store Solution (Current)
- Flask-based web application with SQLAlchemy ORM
- SQLite database for local storage
- Simple data model: Products, Inventory Movements, Store
- Basic web interface for inventory operations
- Reporting functionality with filtering options

### Phase 2: Multi-Store Solution (Future)
- Migration to PostgreSQL database
- Enhanced REST API for external integrations
- Authentication and authorization system
- Store-specific inventory tracking
- Centralized product catalog

### Phase 3: Enterprise Scale (Future)
- Horizontal scaling with load balancing
- Event-driven architecture for real-time updates
- Read/write separation for performance
- Caching layer for frequently accessed data
- Comprehensive API rate limiting and security

## Data Model

The system uses three primary models:

1. **Product**: Stores product information including name, SKU, description, price, and current quantity
2. **InventoryMovement**: Tracks all stock changes with movement types (stock-in, sale, removal), quantities, and timestamps
3. **Store**: Represents physical store locations (for Phase 1, a single default store is used)

## Installation and Setup

### Prerequisites
- Python 3.8+
- Flask and SQLAlchemy
- WTForms for form handling

### Environment Variables
- `SESSION_SECRET`: Secret key for session management
- `DATABASE_URL`: Database connection string (defaults to SQLite for development)

### Running the Application
1. Clone the repository
2. Install the required dependencies
3. Set up environment variables
4. Run `python main.py` to start the application

## Features

### Current Features (Phase 1)
- Product management (add, edit, list)
- Inventory tracking (stock-in, sales, removals)
- Current inventory status view
- Low stock alerts
- Basic reporting with filtering options
- Responsive web interface

### Planned Features (Phase 2-3)
- Multi-store support
- User authentication and role-based access
- Supplier management
- Purchase order system
- Integration with POS systems
- Mobile application
- Analytics dashboard

## Testing

To test the application:
1. Add products via the product management interface
2. Record stock-in transactions
3. Record sales and removals
4. Generate reports to verify inventory movements
5. Check dashboard for low stock alerts

## Design Decisions and Trade-offs

### Database Choice
- **Phase 1**: SQLite for simplicity and portability
- **Phase 2+**: PostgreSQL for concurrency, reliability, and scalability

### Architecture Evolution
- Starting with a monolithic application for faster development
- Designed with clean separation of concerns to facilitate future microservices transition
- Models designed to support multi-store operations from the beginning

### Security Considerations
- Form validation to prevent malicious input
- CSRF protection on all forms
- Prepared statements via SQLAlchemy to prevent SQL injection

## Conclusion

This inventory tracking system provides a solid foundation for kiryana stores to manage their inventory efficiently. The phased development approach allows for incremental adoption and scaling as business needs grow.
