from datetime import datetime
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

from app import db


# User and Authentication Models
class Role(db.Model):
    """User roles for permissions"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(20), unique=True, nullable=False)
    description = db.Column(db.String(255))
    
    # Admin role has full system access
    # Manager role has full access to assigned stores
    # Staff role has limited access to assigned stores


class User(UserMixin, db.Model):
    """User account model"""
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    first_name = db.Column(db.String(64))
    last_name = db.Column(db.String(64))
    password_hash = db.Column(db.String(256), nullable=False)
    role_id = db.Column(db.Integer, db.ForeignKey('role.id'), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    last_login = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    role = db.relationship('Role', backref='users')
    store_permissions = db.relationship('StorePermission', backref='user', cascade='all, delete-orphan')
    
    def set_password(self, password):
        """Set the password hash"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check if password is correct"""
        return check_password_hash(self.password_hash, password)
    
    def has_store_access(self, store_id):
        """Check if user has access to a specific store"""
        # Admin has access to all stores
        if self.role.name == 'admin':
            return True
        
        # Check if user has explicit permission for this store
        for perm in self.store_permissions:
            if perm.store_id == store_id:
                return True
                
        return False
    
    def has_store_write_access(self, store_id):
        """Check if user has write access to a specific store"""
        # Admin has write access to all stores
        if self.role.name == 'admin':
            return True
        
        # Managers have write access to their stores
        if self.role.name == 'manager':
            for perm in self.store_permissions:
                if perm.store_id == store_id:
                    return True
        
        # Staff might have write permissions based on their specific permission level
        for perm in self.store_permissions:
            if perm.store_id == store_id and perm.permission_level == 'write':
                return True
                
        return False
    
    @property
    def full_name(self):
        """Return user's full name"""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        elif self.first_name:
            return self.first_name
        elif self.last_name:
            return self.last_name
        return self.username


class StorePermission(db.Model):
    """Store-specific permissions for users"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    store_id = db.Column(db.Integer, db.ForeignKey('store.id'), nullable=False)
    permission_level = db.Column(db.String(20), default='read')  # 'read', 'write', 'admin'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship with Store is defined in Store model
    
    # Enforce unique user-store combinations
    __table_args__ = (
        db.UniqueConstraint('user_id', 'store_id', name='unique_user_store_permission'),
    )


# Store Models
class Store(db.Model):
    """Store location model"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(20), unique=True, nullable=False)
    location = db.Column(db.String(255))
    address = db.Column(db.Text)
    phone = db.Column(db.String(20))
    email = db.Column(db.String(120))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    products = db.relationship('Product', backref='store', cascade='all, delete-orphan')
    inventory_movements = db.relationship('InventoryMovement', backref='store', cascade='all, delete-orphan')
    permissions = db.relationship('StorePermission', backref='store', cascade='all, delete-orphan')


# Product Models
class Product(db.Model):
    """Product model"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    sku = db.Column(db.String(50))
    barcode = db.Column(db.String(50))
    description = db.Column(db.Text)
    category = db.Column(db.String(50))
    unit_price = db.Column(db.Float, nullable=False, default=0)
    cost_price = db.Column(db.Float)
    current_quantity = db.Column(db.Integer, default=0)
    reorder_level = db.Column(db.Integer, default=10)
    location_in_store = db.Column(db.String(100))
    image_url = db.Column(db.String(255))
    store_id = db.Column(db.Integer, db.ForeignKey('store.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    inventory_movements = db.relationship('InventoryMovement', backref='product', cascade='all, delete-orphan')
    supplier_products = db.relationship('SupplierProduct', backref='product', cascade='all, delete-orphan')
    
    def is_low_stock(self):
        """Check if product is at or below reorder level"""
        return self.current_quantity <= self.reorder_level
    
    def get_stock_value(self):
        """Calculate current stock value"""
        return self.current_quantity * self.unit_price


# Inventory Models
class InventoryMovement(db.Model):
    """Inventory movement records"""
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    store_id = db.Column(db.Integer, db.ForeignKey('store.id'), nullable=False)
    movement_type = db.Column(db.String(20), nullable=False)  # 'stock_in', 'sale', 'removal', 'transfer_in', 'transfer_out'
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Float, nullable=False)
    reference = db.Column(db.String(50))  # Invoice #, Sales Receipt #, etc.
    notes = db.Column(db.Text)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'))
    movement_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Creator relationship
    creator = db.relationship('User', backref='inventory_movements')
    
    def get_total_value(self):
        """Calculate total value of movement"""
        return self.quantity * self.unit_price


# Supplier Models
class Supplier(db.Model):
    """Supplier model"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    contact_name = db.Column(db.String(100))
    email = db.Column(db.String(120))
    phone = db.Column(db.String(20))
    address = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    supplier_products = db.relationship('SupplierProduct', backref='supplier', cascade='all, delete-orphan')
    purchase_orders = db.relationship('PurchaseOrder', backref='supplier', cascade='all, delete-orphan')


class SupplierProduct(db.Model):
    """Supplier-Product relationship"""
    id = db.Column(db.Integer, primary_key=True)
    supplier_id = db.Column(db.Integer, db.ForeignKey('supplier.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    supplier_sku = db.Column(db.String(50))
    cost_price = db.Column(db.Float)
    lead_time_days = db.Column(db.Integer)
    minimum_order_quantity = db.Column(db.Integer, default=1)
    is_preferred = db.Column(db.Boolean, default=False)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Enforce unique supplier-product combinations
    __table_args__ = (
        db.UniqueConstraint('supplier_id', 'product_id', name='unique_supplier_product'),
    )


# Purchase Order Models
class PurchaseOrder(db.Model):
    """Purchase order model"""
    id = db.Column(db.Integer, primary_key=True)
    supplier_id = db.Column(db.Integer, db.ForeignKey('supplier.id'), nullable=False)
    store_id = db.Column(db.Integer, db.ForeignKey('store.id'), nullable=False)
    order_number = db.Column(db.String(50))
    status = db.Column(db.String(20), default='draft')  # 'draft', 'ordered', 'partial', 'received', 'cancelled'
    expected_delivery_date = db.Column(db.Date)
    notes = db.Column(db.Text)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    store = db.relationship('Store', backref='purchase_orders')
    creator = db.relationship('User', backref='purchase_orders')
    items = db.relationship('PurchaseOrderItem', backref='purchase_order', cascade='all, delete-orphan')
    
    def get_total_value(self):
        """Calculate total value of purchase order"""
        return sum(item.quantity_ordered * item.unit_price for item in self.items)


class PurchaseOrderItem(db.Model):
    """Purchase order item model"""
    id = db.Column(db.Integer, primary_key=True)
    purchase_order_id = db.Column(db.Integer, db.ForeignKey('purchase_order.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    quantity_ordered = db.Column(db.Integer, nullable=False)
    quantity_received = db.Column(db.Integer, default=0)
    unit_price = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    product = db.relationship('Product')
    
    def get_total_value(self):
        """Calculate total value of order item"""
        return self.quantity_ordered * self.unit_price
    
    def get_received_value(self):
        """Calculate value of received items"""
        return self.quantity_received * self.unit_price


# Sales Order Models
class SalesOrder(db.Model):
    """Sales order model"""
    id = db.Column(db.Integer, primary_key=True)
    store_id = db.Column(db.Integer, db.ForeignKey('store.id'), nullable=False)
    customer_name = db.Column(db.String(100))
    customer_phone = db.Column(db.String(20))
    order_number = db.Column(db.String(50))
    status = db.Column(db.String(20), default='draft')  # 'draft', 'completed', 'cancelled'
    payment_method = db.Column(db.String(20))
    payment_status = db.Column(db.String(20), default='pending')  # 'pending', 'paid', 'partial', 'refunded'
    notes = db.Column(db.Text)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    store = db.relationship('Store', backref='sales_orders')
    creator = db.relationship('User', backref='sales_orders')
    items = db.relationship('SalesOrderItem', backref='sales_order', cascade='all, delete-orphan')
    
    def get_subtotal(self):
        """Calculate subtotal value (before discounts)"""
        return sum(item.get_line_total() for item in self.items)
    
    def get_total_discount(self):
        """Calculate total discount value"""
        return sum(item.get_discount_amount() for item in self.items)
    
    def get_total(self):
        """Calculate total value (after discounts)"""
        return self.get_subtotal() - self.get_total_discount()


class SalesOrderItem(db.Model):
    """Sales order item model"""
    id = db.Column(db.Integer, primary_key=True)
    sales_order_id = db.Column(db.Integer, db.ForeignKey('sales_order.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Float, nullable=False)
    discount_percent = db.Column(db.Float, default=0)  # Percentage discount
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    product = db.relationship('Product')
    
    def get_line_total(self):
        """Calculate line total (before discount)"""
        return self.quantity * self.unit_price
    
    def get_discount_amount(self):
        """Calculate discount amount"""
        return self.get_line_total() * (self.discount_percent / 100)
    
    def get_discounted_total(self):
        """Calculate total after discount"""
        return self.get_line_total() - self.get_discount_amount()


# Inventory Transfer Models
class InventoryTransfer(db.Model):
    """Inventory transfer between stores"""
    id = db.Column(db.Integer, primary_key=True)
    source_store_id = db.Column(db.Integer, db.ForeignKey('store.id'), nullable=False)
    destination_store_id = db.Column(db.Integer, db.ForeignKey('store.id'), nullable=False)
    transfer_number = db.Column(db.String(50))
    status = db.Column(db.String(20), default='pending')  # 'pending', 'in_transit', 'completed', 'cancelled'
    notes = db.Column(db.Text)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    source_store = db.relationship('Store', foreign_keys=[source_store_id])
    destination_store = db.relationship('Store', foreign_keys=[destination_store_id])
    creator = db.relationship('User', backref='inventory_transfers')
    items = db.relationship('InventoryTransferItem', backref='inventory_transfer', cascade='all, delete-orphan')


class InventoryTransferItem(db.Model):
    """Inventory transfer item"""
    id = db.Column(db.Integer, primary_key=True)
    inventory_transfer_id = db.Column(db.Integer, db.ForeignKey('inventory_transfer.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    product = db.relationship('Product')