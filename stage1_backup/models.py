# Kiryana Inventory System
# Developed by Hira Fatima
# Database models for inventory tracking

from datetime import datetime
from app import db

class Store(db.Model):
    """
    Store model for tracking multiple stores in later phases.
    For Phase 1, we'll use a single default store.
    """
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(20), unique=True, nullable=False)
    location = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    products = db.relationship('Product', backref='store', lazy=True)
    movements = db.relationship('InventoryMovement', backref='store', lazy=True)
    
    def __repr__(self):
        return f"<Store {self.name}>"

class Product(db.Model):
    """
    Product model for storing product information.
    """
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    sku = db.Column(db.String(50), unique=True)
    description = db.Column(db.Text)
    unit_price = db.Column(db.Float, default=0.0)
    current_quantity = db.Column(db.Integer, default=0)
    reorder_level = db.Column(db.Integer, default=10)
    store_id = db.Column(db.Integer, db.ForeignKey('store.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    movements = db.relationship('InventoryMovement', backref='product', lazy=True)
    
    def __repr__(self):
        return f"<Product {self.name}>"
    
    def update_quantity(self):
        """
        Update current quantity based on all inventory movements.
        This is a helper method to recalculate quantity if needed.
        """
        movements = self.movements
        total_in = sum(m.quantity for m in movements if m.movement_type == 'stock_in')
        total_out = sum(m.quantity for m in movements if m.movement_type in ['sale', 'removal'])
        self.current_quantity = total_in - total_out
        return self.current_quantity
    
    def is_low_stock(self):
        """Check if product is below reorder level"""
        return self.current_quantity <= self.reorder_level

class InventoryMovement(db.Model):
    """
    InventoryMovement model for tracking stock changes.
    Types: 
    - stock_in: New inventory received
    - sale: Product sold to customer
    - removal: Manual removal (damaged, expired, etc.)
    """
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    store_id = db.Column(db.Integer, db.ForeignKey('store.id'), nullable=False)
    movement_type = db.Column(db.String(20), nullable=False)  # 'stock_in', 'sale', 'removal'
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Float)  # Price at the time of movement
    reference = db.Column(db.String(50))  # Invoice number, sales receipt, etc.
    notes = db.Column(db.Text)
    movement_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<InventoryMovement {self.movement_type} {self.quantity}>"
