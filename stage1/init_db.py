"""
Kiryana Inventory System - Database Initialization Script
This script initializes the database with required tables and initial data
"""
import os
import sys
from dotenv import load_dotenv
import logging

# Setup logging
logging.basicConfig(level=logging.DEBUG, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Import Flask app and database
from app import app, db
from models import Store, Product, InventoryMovement

def initialize_database():
    """Initialize database with tables and default data"""
    with app.app_context():
        logger.info("Starting database initialization...")
        
        # Create all tables
        try:
            db.create_all()
            logger.info("Database tables created successfully")
        except Exception as e:
            logger.error(f"Error creating tables: {e}")
            return False
        
        # Check if default store exists
        try:
            store_count = Store.query.count()
            if store_count == 0:
                # Create default store
                default_store = Store(
                    name="Main Store",
                    location="Default Location"
                )
                db.session.add(default_store)
                db.session.commit()
                logger.info(f"Created default store: {default_store.name} (ID: {default_store.id})")
            else:
                logger.info(f"Found {store_count} existing stores, skipping default store creation")
                
            # Display all tables
            inspector = db.inspect(db.engine)
            table_names = inspector.get_table_names()
            logger.info(f"Available tables: {', '.join(table_names)}")
            
            # Success
            return True
            
        except Exception as e:
            logger.error(f"Error initializing data: {e}")
            return False

if __name__ == "__main__":
    success = initialize_database()
    if success:
        print("Database initialized successfully!")
    else:
        print("Database initialization failed. Check the logs for details.")
        sys.exit(1)