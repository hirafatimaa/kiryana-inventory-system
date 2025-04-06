"""
Kiryana Inventory System - Database Setup Script
Developed by Hira Fatima

This script creates all required database tables and initializes a default store.
"""
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Make sure app and models are imported in the correct order
from app import app, db
from models import Store, Product, InventoryMovement

def setup_database():
    """Create all database tables and initialize with default data"""
    with app.app_context():
        print("Creating database tables...")
        
        # Drop existing tables (be careful with this in production!)
        # Uncomment only if you need to recreate all tables
        # db.drop_all()
        
        # Create all tables defined in models
        db.create_all()
        
        # Verify that tables exist by checking table names
        inspector = db.inspect(db.engine)
        tables = inspector.get_table_names()
        print(f"Created tables: {', '.join(tables)}")
        
        # Check if we have any stores
        store_count = Store.query.count()
        
        if store_count == 0:
            # Create a default store
            default_store = Store(
                name="Main Store",
                location="Default Location"
            )
            
            db.session.add(default_store)
            db.session.commit()
            
            print(f"Created default store: {default_store.name} (ID: {default_store.id})")
        else:
            print(f"Database already has {store_count} stores. No default store created.")
        
        print("Database setup complete!")

if __name__ == "__main__":
    setup_database()