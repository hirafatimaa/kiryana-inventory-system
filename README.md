# Kiryana Inventory System

A comprehensive inventory tracking system for kiryana stores (small retail shops) with a growth path from single store to multi-store enterprise solution.

## Project Overview

This system allows kiryana store owners to track their inventory, record stock movements (purchases, sales, and removals), and generate reports. It follows a three-stage implementation approach to accommodate different scales of operation:

### Three-Stage Implementation

1. **Stage 1: Single Store** - Local storage for a single kiryana store
   - Basic inventory management
   - Product tracking
   - Stock movement recording (in/out)
   - Simple reporting

2. **Stage 2: Multi-Store** - PostgreSQL-based solution for up to 500 stores
   - Multi-store support
   - User authentication and role-based permissions
   - Store-specific views and operations
   - Advanced reporting and analytics
   - Supplier management
   - REST API for integrations

3. **Stage 3: Enterprise** - Microservices architecture for thousands of stores
   - Horizontally scalable microservices
   - High availability and fault tolerance
   - Real-time analytics and monitoring
   - Event-driven architecture
   - Global deployment capabilities

## Features

### Core Features Across All Stages

- **Product Management**: Add, edit, and manage product information
- **Inventory Tracking**: Monitor stock levels and receive low stock alerts
- **Stock Movements**: Record stock-in, sales, and manual removals
- **Reporting**: Generate inventory reports and movement histories

### Stage 2 Additional Features

- **Multi-Store Management**: Operate and track multiple store locations
- **User Management**: Role-based access control (Admin, Manager, Staff)
- **Supplier Management**: Track suppliers and their product relationships
- **Purchase Order Processing**: Create and manage purchase orders
- **Sales Order Management**: Record and track sales orders
- **Inventory Transfers**: Move inventory between stores
- **Advanced Reporting**: Store-specific and consolidated reports

### Stage 3 Additional Features

- **Real-Time Analytics**: Live dashboards and business intelligence
- **Distributed Data**: Data sharding and replication
- **High Availability**: Fault tolerance and disaster recovery
- **Global Scale**: Support for thousands of concurrent users
- **Advanced Security**: OAuth2, encryption, and audit logging

## Technical Architecture

### Stage 1: Single Store

- **Frontend**: HTML/CSS/JS with Flask templates
- **Backend**: Python Flask application
- **Database**: SQLite for local storage
- **Features**: Basic CRUD operations for inventory management

### Stage 2: Multi-Store

- **Frontend**: Enhanced UI with Bootstrap
- **Backend**: Flask with Blueprint-based modules
- **Database**: PostgreSQL
- **Security**: Flask-Login for authentication
- **API**: RESTful API endpoints

### Stage 3: Enterprise

- **Architecture**: Microservices pattern
- **Services**:
  - Authentication Service
  - Product Service
  - Inventory Service
  - Store Service
  - Reporting Service
- **Infrastructure**: API Gateway, Message Queue
- **Deployment**: Containerized services for horizontal scaling

## Getting Started

### Prerequisites

- Python 3.x
- PostgreSQL database (for Stage 2 and 3)
- Required Python packages:
  - flask
  - flask-login
  - flask-sqlalchemy
  - flask-wtf
  - gunicorn
  - psycopg2-binary
  - sqlalchemy
  - tabulate
  - werkzeug
  - wtforms
  - email-validator

### Installation

1. Clone the repository
2. Navigate to the desired stage directory:
   ```bash
   cd stage1  # For single store solution
   # OR
   cd stage2  # For multi-store solution
   ```
3. Set up environment variables:
   ```
   DATABASE_URL=postgresql://user:password@localhost/kiryana_inventory
   ```
4. Run the application:
   ```bash
   python main.py
   ```

### Default Login (Stage 2 and 3)

- Username: admin
- Password: admin123 (change immediately after first login)

## Usage

### Web Interface

The system provides a web interface for all operations:

1. Login to the system
2. Navigate to the desired store (for Stage 2 and 3)
3. Use the dashboard to access different functions:
   - Add/edit products
   - Record stock movements
   - Generate reports
   - Manage users and permissions (admin)

### Command-Line Interface

A CLI is also available for all core operations:

```bash
# Display help
python cli.py --help

# List all products
python cli.py products list

# Add a new product
python cli.py products add "Product Name" --price 10.99

# Record stock in
python cli.py inventory stock-in 1 50 --price 9.50

# Record a sale
python cli.py inventory sell 1 5

# Show current inventory
python cli.py inventory status
```

## Contributing

Contributions to improve the Kiryana Inventory System are welcome. Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Contact

Project Link: [https://github.com/yourusername/kiryana-inventory-system](https://github.com/yourusername/kiryana-inventory-system)

---

Developed by Bazaar Technologies for the growing needs of kiryana stores.