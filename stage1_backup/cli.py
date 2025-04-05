#!/usr/bin/env python3
"""
Kiryana Inventory System - Command Line Interface
Developed by Hira Fatima

This CLI allows you to manage inventory operations directly from the terminal.
"""

import argparse
import os
import sys
from datetime import datetime
from tabulate import tabulate

# Ensure app is in the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Create the application context without running the web server
def setup_cli():
    """Setup the CLI environment and database connection"""
    from app import app
    return app.app_context()

# Import models after setting path
from app import db
from models import Product, InventoryMovement, Store

# Initialize parser
parser = argparse.ArgumentParser(description='Kiryana Inventory CLI')
subparsers = parser.add_subparsers(dest='command', help='Command to run')

# Product Commands
def register_product_commands():
    # List products
    list_parser = subparsers.add_parser('list-products', help='List all products')
    list_parser.add_argument('--low-stock', action='store_true', help='Show only low stock products')
    
    # Add product
    add_parser = subparsers.add_parser('add-product', help='Add a new product')
    add_parser.add_argument('--name', required=True, help='Product name')
    add_parser.add_argument('--sku', required=True, help='Product SKU')
    add_parser.add_argument('--description', help='Product description')
    add_parser.add_argument('--price', type=float, required=True, help='Unit price')
    add_parser.add_argument('--reorder', type=int, default=10, help='Reorder level')
    
    # Show product details
    show_parser = subparsers.add_parser('show-product', help='Show product details')
    show_parser.add_argument('--id', type=int, help='Product ID')
    show_parser.add_argument('--sku', help='Product SKU')

# Inventory Commands
def register_inventory_commands():
    # Stock in
    stock_in_parser = subparsers.add_parser('stock-in', help='Record stock in')
    stock_in_parser.add_argument('--product-id', type=int, required=True, help='Product ID')
    stock_in_parser.add_argument('--quantity', type=int, required=True, help='Quantity')
    stock_in_parser.add_argument('--price', type=float, help='Unit price (optional, will use product price if not specified)')
    stock_in_parser.add_argument('--reference', help='Reference (Invoice/PO)')
    stock_in_parser.add_argument('--notes', help='Additional notes')
    
    # Record sale
    sale_parser = subparsers.add_parser('sale', help='Record a sale')
    sale_parser.add_argument('--product-id', type=int, required=True, help='Product ID')
    sale_parser.add_argument('--quantity', type=int, required=True, help='Quantity')
    sale_parser.add_argument('--price', type=float, help='Unit price (optional, will use product price if not specified)')
    sale_parser.add_argument('--reference', help='Reference (Receipt number)')
    sale_parser.add_argument('--notes', help='Additional notes')
    
    # Record removal
    removal_parser = subparsers.add_parser('removal', help='Record inventory removal')
    removal_parser.add_argument('--product-id', type=int, required=True, help='Product ID')
    removal_parser.add_argument('--quantity', type=int, required=True, help='Quantity')
    removal_parser.add_argument('--reason', choices=['damaged', 'expired', 'stolen', 'other'], default='other', help='Removal reason')
    removal_parser.add_argument('--notes', help='Additional notes')

# Report Commands
def register_report_commands():
    # Inventory report
    inventory_parser = subparsers.add_parser('inventory', help='Show current inventory')
    
    # Movement report
    movement_parser = subparsers.add_parser('movements', help='Show inventory movements')
    movement_parser.add_argument('--product-id', type=int, help='Filter by product ID')
    movement_parser.add_argument('--type', choices=['stock_in', 'sale', 'removal'], help='Filter by movement type')
    movement_parser.add_argument('--days', type=int, default=30, help='Number of days to show (default: 30)')

# Store Management Commands
def register_store_commands():
    # List stores
    list_stores_parser = subparsers.add_parser('list-stores', help='List all stores')
    
    # Add store
    add_store_parser = subparsers.add_parser('add-store', help='Add a new store')
    add_store_parser.add_argument('--name', required=True, help='Store name')
    add_store_parser.add_argument('--code', required=True, help='Store code (unique identifier)')
    add_store_parser.add_argument('--location', required=True, help='Store location')
    
    # Show store details
    show_store_parser = subparsers.add_parser('show-store', help='Show store details')
    show_store_parser.add_argument('--id', type=int, required=True, help='Store ID')

# Command Handlers
def handle_list_products(args):
    """List all products with their current inventory"""
    with setup_cli():
        query = Product.query
        
        if args.low_stock:
            query = query.filter(Product.current_quantity <= Product.reorder_level)
            
        products = query.order_by(Product.name).all()
        
        if not products:
            print("No products found.")
            return
        
        # Format the output
        headers = ["ID", "SKU", "Name", "Current Qty", "Reorder Level", "Unit Price", "Status"]
        rows = []
        
        for p in products:
            status = "Out of Stock" if p.current_quantity == 0 else \
                     "Low Stock" if p.current_quantity <= p.reorder_level else \
                     "In Stock"
            
            rows.append([
                p.id,
                p.sku,
                p.name,
                p.current_quantity,
                p.reorder_level,
                f"{p.unit_price:.2f}",
                status
            ])
        
        print(tabulate(rows, headers=headers, tablefmt="grid"))
        print(f"Total: {len(products)} products")

def handle_add_product(args):
    """Add a new product"""
    with setup_cli():
        # Check if product with SKU already exists
        existing = Product.query.filter_by(sku=args.sku).first()
        if existing:
            print(f"Error: Product with SKU '{args.sku}' already exists.")
            return
        
        # Get default store
        store = Store.query.first()
        if not store:
            print("Error: No store found in the database.")
            return
        
        # Create new product
        new_product = Product(
            name=args.name,
            sku=args.sku,
            description=args.description or "",
            unit_price=args.price,
            reorder_level=args.reorder,
            store_id=store.id
        )
        
        db.session.add(new_product)
        db.session.commit()
        
        print(f"Product '{args.name}' added successfully with ID: {new_product.id}")

def handle_show_product(args):
    """Show detailed product information"""
    with setup_cli():
        product = None
        
        if args.id:
            product = Product.query.get(args.id)
        elif args.sku:
            product = Product.query.filter_by(sku=args.sku).first()
        else:
            print("Error: Either --id or --sku must be specified")
            return
            
        if not product:
            print("Product not found.")
            return
            
        print("\nProduct Details:")
        print("=" * 50)
        print(f"ID:             {product.id}")
        print(f"Name:           {product.name}")
        print(f"SKU:            {product.sku}")
        print(f"Description:    {product.description}")
        print(f"Unit Price:     {product.unit_price:.2f}")
        print(f"Current Qty:    {product.current_quantity}")
        print(f"Reorder Level:  {product.reorder_level}")
        
        status = "Out of Stock" if product.current_quantity == 0 else \
                 "Low Stock" if product.current_quantity <= product.reorder_level else \
                 "In Stock"
        print(f"Status:         {status}")
        print(f"Created:        {product.created_at}")
        print(f"Last Updated:   {product.updated_at}")
        print("=" * 50)
        
        # Show recent movements
        movements = InventoryMovement.query.filter_by(product_id=product.id).order_by(
            InventoryMovement.movement_date.desc()).limit(5).all()
            
        if movements:
            print("\nRecent Movements:")
            headers = ["Date", "Type", "Quantity", "Unit Price", "Reference"]
            rows = []
            
            for m in movements:
                movement_type = "Stock In" if m.movement_type == "stock_in" else \
                               "Sale" if m.movement_type == "sale" else \
                               "Removal"
                               
                rows.append([
                    m.movement_date.strftime("%Y-%m-%d"),
                    movement_type,
                    m.quantity,
                    f"{m.unit_price:.2f}",
                    m.reference or ""
                ])
                
            print(tabulate(rows, headers=headers, tablefmt="simple"))

def handle_stock_in(args):
    """Record stock in transaction"""
    with setup_cli():
        # Check if product exists
        product = Product.query.get(args.product_id)
        if not product:
            print(f"Error: Product with ID {args.product_id} not found.")
            return
            
        # Get default store
        store = Store.query.first()
        if not store:
            print("Error: No store found in the database.")
            return
            
        # Use product price if not specified
        unit_price = args.price if args.price is not None else product.unit_price
            
        # Create movement record
        movement = InventoryMovement(
            product_id=product.id,
            store_id=store.id,
            movement_type="stock_in",
            quantity=args.quantity,
            unit_price=unit_price,
            reference=args.reference,
            notes=args.notes,
            movement_date=datetime.utcnow()
        )
        
        # Update product quantity
        product.current_quantity += args.quantity
        
        # Save changes
        db.session.add(movement)
        db.session.commit()
        
        print(f"Recorded stock in of {args.quantity} units for '{product.name}'")
        print(f"New stock level: {product.current_quantity}")

def handle_sale(args):
    """Record a sale transaction"""
    with setup_cli():
        # Check if product exists
        product = Product.query.get(args.product_id)
        if not product:
            print(f"Error: Product with ID {args.product_id} not found.")
            return
            
        # Check if sufficient stock
        if product.current_quantity < args.quantity:
            print(f"Error: Insufficient stock. Available: {product.current_quantity}, Requested: {args.quantity}")
            return
            
        # Get default store
        store = Store.query.first()
        if not store:
            print("Error: No store found in the database.")
            return
            
        # Use product price if not specified
        unit_price = args.price if args.price is not None else product.unit_price
            
        # Create movement record
        movement = InventoryMovement(
            product_id=product.id,
            store_id=store.id,
            movement_type="sale",
            quantity=args.quantity,
            unit_price=unit_price,
            reference=args.reference,
            notes=args.notes,
            movement_date=datetime.utcnow()
        )
        
        # Update product quantity
        product.current_quantity -= args.quantity
        
        # Save changes
        db.session.add(movement)
        db.session.commit()
        
        print(f"Recorded sale of {args.quantity} units of '{product.name}'")
        print(f"New stock level: {product.current_quantity}")
        
        if product.current_quantity <= product.reorder_level:
            print(f"WARNING: Product is now at or below reorder level ({product.reorder_level})")

def handle_removal(args):
    """Record inventory removal"""
    with setup_cli():
        # Check if product exists
        product = Product.query.get(args.product_id)
        if not product:
            print(f"Error: Product with ID {args.product_id} not found.")
            return
            
        # Check if sufficient stock
        if product.current_quantity < args.quantity:
            print(f"Error: Insufficient stock. Available: {product.current_quantity}, Requested: {args.quantity}")
            return
            
        # Get default store
        store = Store.query.first()
        if not store:
            print("Error: No store found in the database.")
            return
            
        # Combine reason and notes
        notes = f"Reason: {args.reason}"
        if args.notes:
            notes += f" - {args.notes}"
            
        # Create movement record
        movement = InventoryMovement(
            product_id=product.id,
            store_id=store.id,
            movement_type="removal",
            quantity=args.quantity,
            unit_price=product.unit_price,  # Use current product price
            notes=notes,
            movement_date=datetime.utcnow()
        )
        
        # Update product quantity
        product.current_quantity -= args.quantity
        
        # Save changes
        db.session.add(movement)
        db.session.commit()
        
        print(f"Recorded removal of {args.quantity} units of '{product.name}'")
        print(f"New stock level: {product.current_quantity}")

def handle_inventory(args):
    """Show current inventory status"""
    with setup_cli():
        # Order by current_quantity in descending order using SQLAlchemy's desc()
        from sqlalchemy import desc
        products = Product.query.order_by(desc(Product.current_quantity)).all()
        
        if not products:
            print("No products found.")
            return
            
        # Calculate total inventory value
        total_value = sum(p.current_quantity * p.unit_price for p in products)
        
        # Format the output
        headers = ["SKU", "Product Name", "Qty", "Unit Price", "Value", "Status"]
        rows = []
        
        for p in products:
            status = "Out of Stock" if p.current_quantity == 0 else \
                     "Low Stock" if p.current_quantity <= p.reorder_level else \
                     "In Stock"
                     
            value = p.current_quantity * p.unit_price
            
            rows.append([
                p.sku,
                p.name,
                p.current_quantity,
                f"{p.unit_price:.2f}",
                f"{value:.2f}",
                status
            ])
            
        print("\nCURRENT INVENTORY")
        print("=" * 80)
        print(tabulate(rows, headers=headers, tablefmt="grid"))
        print("-" * 80)
        print(f"Total Items: {sum(p.current_quantity for p in products)}")
        print(f"Total Value: {total_value:.2f}")
        print(f"Low Stock Items: {sum(1 for p in products if p.current_quantity <= p.reorder_level and p.current_quantity > 0)}")
        print(f"Out of Stock Items: {sum(1 for p in products if p.current_quantity == 0)}")

def handle_movements(args):
    """Show inventory movements report"""
    with setup_cli():
        from datetime import timedelta
        
        # Build the query
        query = InventoryMovement.query
        
        if args.product_id:
            query = query.filter_by(product_id=args.product_id)
            
        if args.type:
            query = query.filter_by(movement_type=args.type)
            
        # Filter by date
        if args.days:
            cutoff_date = datetime.utcnow() - timedelta(days=args.days)
            query = query.filter(InventoryMovement.movement_date >= cutoff_date)
            
        # Get the movements
        movements = query.order_by(InventoryMovement.movement_date.desc()).all()
        
        if not movements:
            print("No movements found matching the criteria.")
            return
            
        # Calculate totals
        total_stock_in = sum(m.quantity for m in movements if m.movement_type == "stock_in")
        total_sales = sum(m.quantity for m in movements if m.movement_type == "sale")
        total_removals = sum(m.quantity for m in movements if m.movement_type == "removal")
        
        # Get product lookup dictionary
        product_ids = {m.product_id for m in movements}
        products = {p.id: p.name for p in Product.query.filter(Product.id.in_(product_ids)).all()}
        
        # Format the output
        headers = ["Date", "Product", "Type", "Quantity", "Unit Price", "Total", "Reference"]
        rows = []
        
        for m in movements:
            movement_type = "Stock In" if m.movement_type == "stock_in" else \
                           "Sale" if m.movement_type == "sale" else \
                           "Removal"
                           
            product_name = products.get(m.product_id, f"Unknown ({m.product_id})")
            total = m.quantity * m.unit_price
            
            rows.append([
                m.movement_date.strftime("%Y-%m-%d"),
                product_name,
                movement_type,
                m.quantity,
                f"{m.unit_price:.2f}",
                f"{total:.2f}",
                m.reference or ""
            ])
            
        print("\nINVENTORY MOVEMENTS REPORT")
        
        # Show filter info
        print("=" * 80)
        if args.product_id:
            product = Product.query.get(args.product_id)
            if product:
                print(f"Product: {product.name} (ID: {product.id})")
        
        if args.type:
            print(f"Movement Type: {args.type}")
            
        print(f"Period: Last {args.days} days")
        print("=" * 80)
        
        print(tabulate(rows, headers=headers, tablefmt="grid"))
        print("-" * 80)
        print(f"Total Stock In: {total_stock_in}")
        print(f"Total Sales: {total_sales}")
        print(f"Total Removals: {total_removals}")
        print(f"Net Change: {total_stock_in - total_sales - total_removals}")

# Store command handlers
def handle_list_stores(args):
    """List all stores"""
    with setup_cli():
        stores = Store.query.order_by(Store.name).all()
        
        if not stores:
            print("No stores found.")
            return
        
        # Format the output
        headers = ["ID", "Name", "Code", "Location", "Products", "Created At"]
        rows = []
        
        for s in stores:
            # Count products associated with this store
            product_count = Product.query.filter_by(store_id=s.id).count()
            
            rows.append([
                s.id,
                s.name,
                s.code,
                s.location,
                product_count,
                s.created_at.strftime("%Y-%m-%d")
            ])
        
        print(tabulate(rows, headers=headers, tablefmt="grid"))
        print(f"Total: {len(stores)} stores")

def handle_add_store(args):
    """Add a new store"""
    with setup_cli():
        # Check if store with same name already exists
        existing = Store.query.filter_by(name=args.name).first()
        if existing:
            print(f"Error: Store with name '{args.name}' already exists.")
            return
        
        # Create new store
        new_store = Store(
            name=args.name,
            code=args.code,
            location=args.location
        )
        
        db.session.add(new_store)
        db.session.commit()
        
        print(f"Store '{args.name}' added successfully with ID: {new_store.id}")

def handle_show_store(args):
    """Show detailed store information"""
    with setup_cli():
        store = Store.query.get(args.id)
        
        if not store:
            print(f"Store with ID {args.id} not found.")
            return
            
        print("\nStore Details:")
        print("=" * 50)
        print(f"ID:             {store.id}")
        print(f"Name:           {store.name}")
        print(f"Code:           {store.code}")
        print(f"Location:       {store.location}")
        print(f"Created At:     {store.created_at}")
        print(f"Updated At:     {store.updated_at}")
        print("=" * 50)
        
        # Count and show summary of products
        products = Product.query.filter_by(store_id=store.id).all()
        product_count = len(products)
        print(f"\nProducts: {product_count}")
        
        if products:
            # Calculate inventory value
            total_value = sum(p.current_quantity * p.unit_price for p in products)
            print(f"Total Inventory Value: {total_value:.2f}")
            
            # Show low stock count
            low_stock = sum(1 for p in products if p.current_quantity <= p.reorder_level)
            print(f"Low Stock Items: {low_stock}")
            
            # Show recent inventory movements
            movements = InventoryMovement.query.filter_by(store_id=store.id).order_by(
                InventoryMovement.movement_date.desc()).limit(5).all()
                
            if movements:
                print("\nRecent Movements:")
                headers = ["Date", "Product", "Type", "Quantity"]
                rows = []
                
                # Get product lookup dictionary
                product_dict = {p.id: p.name for p in products}
                
                for m in movements:
                    movement_type = "Stock In" if m.movement_type == "stock_in" else \
                                   "Sale" if m.movement_type == "sale" else \
                                   "Removal"
                                   
                    product_name = product_dict.get(m.product_id, f"Unknown ({m.product_id})")
                    
                    rows.append([
                        m.movement_date.strftime("%Y-%m-%d"),
                        product_name,
                        movement_type,
                        m.quantity
                    ])
                    
                print(tabulate(rows, headers=headers, tablefmt="simple"))
        
def main():
    """Main entry point for the CLI"""
    # Register all command groups
    register_product_commands()
    register_inventory_commands()
    register_report_commands()
    register_store_commands()
    
    # Parse arguments
    args = parser.parse_args()
    
    # No command specified
    if not args.command:
        parser.print_help()
        return
    
    # Handle commands
    command_handlers = {
        'list-products': handle_list_products,
        'add-product': handle_add_product,
        'show-product': handle_show_product,
        'stock-in': handle_stock_in,
        'sale': handle_sale,
        'removal': handle_removal,
        'inventory': handle_inventory,
        'movements': handle_movements,
        'list-stores': handle_list_stores,
        'add-store': handle_add_store,
        'show-store': handle_show_store
    }
    
    handler = command_handlers.get(args.command)
    if handler:
        try:
            handler(args)
        except Exception as e:
            print(f"Error executing command: {e}")
    else:
        print(f"Unknown command: {args.command}")
        parser.print_help()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nOperation cancelled by user.")
        sys.exit(0)