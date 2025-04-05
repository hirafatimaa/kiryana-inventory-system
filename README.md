# Kiryana Inventory System

A scalable inventory tracking system for kiryana stores, leveraging microservices architecture to provide comprehensive multi-store inventory management with intelligent analytics and user-friendly interfaces.

## Project Structure

This project is organized into three stages of development:

- **Stage 1**: Initial prototype (deprecated, moved to `stage1_backup/`)
- **Stage 2**: Multi-store flask application (located in `stage2/`)
- **Stage 3**: Microservices architecture (located in `stage3/`)

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
- Password: admin_password

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

See [CLI README](stage2/README_CLI.md) for detailed CLI usage.
