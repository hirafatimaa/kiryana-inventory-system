# Kiryana Inventory System

A scalable inventory tracking system for kiryana stores, leveraging microservices architecture to provide comprehensive multi-store inventory management with intelligent analytics and user-friendly interfaces.

## Project Structure

This project is organized into three stages of development:

- **Stage 1**: Single Store (located in `stage1/`)
- **Stage 2**: Multi-store flask application (located in `stage2/`)
- **Stage 3**: Microservices architecture (located in `stage3/`)

## Technical Architecture

### Stage 1: Single Store

- **Frontend**: HTML/CSS/JS with Flask templates
- **Backend**: Python Flask application
- **Database**: SQLite for local storage
- **Features**: Basic CRUD operations for inventory management
![Stage 1](assets/stage1_dashboard.png)
![Stage 1](assets/stage1_report.png)
![Stage 1](assets/stage1_products.png)
![Stage 1](assets/stage1_addnewproduct.png)
![Stage 1](assets/stage1_inventory.png)

### Stage 2: Multi-Store

- **Frontend**: Enhanced UI with Bootstrap
- **Backend**: Flask with Blueprint-based modules
- **Database**: PostgreSQL
- **Security**: Flask-Login for authentication
- **API**: RESTful API endpoints

![Stage 2](assets/stage2_login.png)
![Stage 2](assets/stage2_managestore.png)
![Stage 2](assets/stage2_addnewstore.png)

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

### Installation

1. Clone the repository
2. Navigate to the desired stage directory:
   ```bash
   cd stage1  # For single store solution
   python init_db.py

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

## Running the Application

### Quick Start

Simple run scripts are provided in the root directory:

```bash
# To run Stage 2 (Flask application)
./run_stage2.sh

# To run Stage 3 (Microservices)
./run_stage3.sh
```

### VS Code Integration

This project includes VS Code launch configurations to easily run either Stage 2 or Stage 3:

1. Open the project in VS Code
2. Go to Run and Debug (Ctrl+Shift+D)
3. Select from the dropdown:
   - `Stage 2 - Run Kiryana App` to run the Flask application
   - `Stage 3 - Run All Microservices` to run all Stage 3 microservices
   - Individual Stage 3 services can also be run separately

### Stage 2 (Flask Multi-Store Application)

To run the Stage 2 application manually:

```bash
cd stage2
./start.sh
# or directly with
python main.py
```

This will start the Flask application on http://localhost:5000.

Default admin credentials:
- Username: admin
- Email: admin@example.com
- Password: admin_secure_password

### Stage 3 (Microservices Architecture)

The Stage 3 architecture consists of several microservices managed by an API Gateway:

- API Gateway (port 3000)
- Auth Service (port 3001)
- Product Service (port 3002)
- Inventory Service (port 3003)
- Store Service (port 3004)
- Reporting Service (port 3005)

To run all services at once:

```bash
cd stage3
./start_all_services.sh
```

API Gateway will be available at http://localhost:3000.

For more detailed instructions, refer to [Stage 3 README](stage3/README_HOW_TO_RUN.md).

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

## Core Technologies

- Python-based multi-store application (Stage 2)
- Node.js-based microservices (Stage 3)
- PostgreSQL database (shared across stages)
- RESTful API design
- JWT authentication

## Database

Both Stage 2 and Stage 3 use the same PostgreSQL database. Database connection is configured through environment variables in `.env` files.

## Command Line Interface (CLI)

The system includes a Command Line Interface for inventory management:

```bash
# From Stage 2 directory
python cli.py --help
```
See [CLI README](stage1/README_CLI.md) for detailed CLI usage.

![Stage 1](assets/stage1_cli.png)
![Stage 1](assets/stage1_cli2.png)

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

Project Link: [https://github.com/hira-fatimaa/kiryana-inventory-system](https://github.com/hira-fatimaa/kiryana-inventory-system)

---

Developed by Hira Fatima for the growing needs of kiryana stores across Pakistan.

© 2025 Hira Fatima - All Rights Reserved