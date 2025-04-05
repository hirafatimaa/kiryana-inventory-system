from datetime import datetime, timedelta
import functools
import json
import secrets

from flask import Blueprint, jsonify, request, render_template, abort, current_app
from flask_login import current_user, login_required

from app import db
from models import User, Store, Product, InventoryMovement, StorePermission

bp = Blueprint('api', __name__, url_prefix='/api')

# API Authentication
class APIToken(db.Model):
    """API Token for authenticating API requests"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    token = db.Column(db.String(64), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    expires_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship
    user = db.relationship('User', backref='api_tokens')
    
    def is_expired(self):
        """Check if token is expired"""
        if not self.expires_at:
            return False
        return datetime.utcnow() > self.expires_at

def token_required(f):
    """Decorator for API routes that require token authentication"""
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('X-API-Token')
        if not token:
            return jsonify({'error': 'API token is missing!'}), 401
        
        api_token = APIToken.query.filter_by(token=token).first()
        if not api_token or api_token.is_expired():
            return jsonify({'error': 'Invalid or expired API token!'}), 401
        
        # Add user to request context for permission checks
        request.api_user = api_token.user
        return f(*args, **kwargs)
    return decorated

# API Documentation
@bp.route('/docs')
@login_required
def api_documentation():
    """API documentation page"""
    # This would be a more comprehensive page in a real app
    return render_template('api/documentation.html', title='API Documentation')

# API Token Management
@bp.route('/tokens', methods=['GET'])
@login_required
def list_tokens():
    """List API tokens for the current user"""
    tokens = APIToken.query.filter_by(user_id=current_user.id).all()
    return jsonify([{
        'id': token.id,
        'name': token.name,
        'created_at': token.created_at.isoformat(),
        'expires_at': token.expires_at.isoformat() if token.expires_at else None
    } for token in tokens])

@bp.route('/tokens', methods=['POST'])
@login_required
def create_token():
    """Create a new API token"""
    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({'error': 'Name is required!'}), 400
    
    # Generate a token with 64 chars
    token_value = secrets.token_hex(32)
    
    # Default expiration is 30 days
    expires_at = None
    if 'expires_days' in data and data['expires_days']:
        expires_at = datetime.utcnow() + timedelta(days=data['expires_days'])
    
    api_token = APIToken(
        user_id=current_user.id,
        token=token_value,
        name=data['name'],
        expires_at=expires_at
    )
    
    db.session.add(api_token)
    db.session.commit()
    
    return jsonify({
        'id': api_token.id,
        'token': token_value,  # Only returned once when created
        'name': api_token.name,
        'expires_at': api_token.expires_at.isoformat() if api_token.expires_at else None
    })

@bp.route('/tokens/<int:token_id>', methods=['DELETE'])
@login_required
def delete_token(token_id):
    """Delete an API token"""
    token = APIToken.query.get_or_404(token_id)
    
    # Check ownership
    if token.user_id != current_user.id and current_user.role.name != 'admin':
        abort(403)
    
    db.session.delete(token)
    db.session.commit()
    
    return jsonify({'message': 'Token deleted successfully'})

# API Endpoints
@bp.route('/stores', methods=['GET'])
@token_required
def get_stores():
    """Get list of stores the user has access to"""
    user = request.api_user
    
    if user.role.name == 'admin':
        # Admin can see all stores
        stores = Store.query.filter_by(is_active=True).all()
    else:
        # Other users can only see stores they have permissions for
        store_permissions = StorePermission.query.filter_by(user_id=user.id).all()
        store_ids = [p.store_id for p in store_permissions]
        stores = Store.query.filter(Store.id.in_(store_ids), Store.is_active == True).all()
    
    return jsonify([{
        'id': store.id,
        'name': store.name,
        'code': store.code,
        'location': store.location
    } for store in stores])

@bp.route('/stores/<int:store_id>/products', methods=['GET'])
@token_required
def get_store_products(store_id):
    """Get products for a specific store"""
    user = request.api_user
    
    # Check store access
    if not user.has_store_access(store_id):
        return jsonify({'error': 'Access denied to this store'}), 403
    
    # Get products
    products = Product.query.filter_by(store_id=store_id).all()
    
    return jsonify([{
        'id': product.id,
        'sku': product.sku,
        'name': product.name,
        'description': product.description,
        'unit_price': product.unit_price,
        'current_quantity': product.current_quantity,
        'reorder_level': product.reorder_level,
        'category': product.category,
        'cost_price': product.cost_price,
        'barcode': product.barcode,
        'is_low_stock': product.is_low_stock(),
        'total_value': product.current_quantity * product.unit_price
    } for product in products])

@bp.route('/stores/<int:store_id>/inventory', methods=['GET'])
@token_required
def get_store_inventory(store_id):
    """Get current inventory for a specific store"""
    user = request.api_user
    
    # Check store access
    if not user.has_store_access(store_id):
        return jsonify({'error': 'Access denied to this store'}), 403
    
    # Get products
    products = Product.query.filter_by(store_id=store_id).all()
    
    # Get inventory summary
    low_stock_count = sum(1 for p in products if p.is_low_stock())
    out_of_stock_count = sum(1 for p in products if p.current_quantity <= 0)
    total_value = sum(p.current_quantity * p.unit_price for p in products)
    
    return jsonify({
        'store_id': store_id,
        'product_count': len(products),
        'low_stock_count': low_stock_count,
        'out_of_stock_count': out_of_stock_count,
        'total_value': total_value,
        'products': [{
            'id': product.id,
            'name': product.name,
            'sku': product.sku,
            'current_quantity': product.current_quantity,
            'unit_price': product.unit_price,
            'value': product.current_quantity * product.unit_price,
            'status': 'Low Stock' if product.is_low_stock() else 'Out of Stock' if product.current_quantity <= 0 else 'In Stock'
        } for product in products]
    })

@bp.route('/stores/<int:store_id>/movements', methods=['GET'])
@token_required
def get_store_movements(store_id):
    """Get inventory movements for a specific store"""
    user = request.api_user
    
    # Check store access
    if not user.has_store_access(store_id):
        return jsonify({'error': 'Access denied to this store'}), 403
    
    # Parse query parameters
    movement_type = request.args.get('type')
    days = request.args.get('days', default=30, type=int)
    product_id = request.args.get('product_id', type=int)
    
    # Base query
    query = InventoryMovement.query.filter_by(store_id=store_id)
    
    # Apply filters
    if movement_type:
        query = query.filter_by(movement_type=movement_type)
    
    if product_id:
        query = query.filter_by(product_id=product_id)
    
    # Date filter
    if days:
        start_date = datetime.utcnow() - timedelta(days=days)
        query = query.filter(InventoryMovement.movement_date >= start_date)
    
    # Execute query
    movements = query.order_by(InventoryMovement.movement_date.desc()).all()
    
    return jsonify([{
        'id': movement.id,
        'product_id': movement.product_id,
        'product_name': movement.product.name,
        'movement_type': movement.movement_type,
        'quantity': movement.quantity,
        'unit_price': movement.unit_price,
        'total_value': movement.quantity * movement.unit_price,
        'reference': movement.reference,
        'notes': movement.notes,
        'movement_date': movement.movement_date.isoformat()
    } for movement in movements])

@bp.route('/stores/<int:store_id>/stock-in', methods=['POST'])
@token_required
def create_stock_in(store_id):
    """Record stock in for a specific store"""
    user = request.api_user
    
    # Check store access with write permission
    store_permission = StorePermission.query.filter_by(
        user_id=user.id,
        store_id=store_id
    ).first()
    
    if not store_permission or store_permission.permission_level == 'read':
        return jsonify({'error': 'Write access denied to this store'}), 403
    
    # Validate request data
    data = request.get_json()
    if not data or 'product_id' not in data or 'quantity' not in data or 'unit_price' not in data:
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Check product exists and belongs to this store
    product = Product.query.get(data['product_id'])
    if not product or product.store_id != store_id:
        return jsonify({'error': 'Invalid product ID'}), 400
    
    # Create stock in movement
    movement = InventoryMovement(
        product_id=data['product_id'],
        store_id=store_id,
        movement_type='stock_in',
        quantity=data['quantity'],
        unit_price=data['unit_price'],
        reference=data.get('reference'),
        notes=data.get('notes'),
        created_by=user.id,
        movement_date=datetime.utcnow()
    )
    db.session.add(movement)
    
    # Update product quantity
    product.current_quantity += data['quantity']
    
    db.session.commit()
    
    return jsonify({
        'id': movement.id,
        'product_id': movement.product_id,
        'product_name': product.name,
        'quantity': movement.quantity,
        'unit_price': movement.unit_price,
        'total_value': movement.quantity * movement.unit_price,
        'new_stock_level': product.current_quantity,
        'message': f"Recorded stock in of {movement.quantity} units for '{product.name}'"
    })

@bp.route('/stores/<int:store_id>/sale', methods=['POST'])
@token_required
def create_sale(store_id):
    """Record sale for a specific store"""
    user = request.api_user
    
    # Check store access with write permission
    store_permission = StorePermission.query.filter_by(
        user_id=user.id,
        store_id=store_id
    ).first()
    
    if not store_permission or store_permission.permission_level == 'read':
        return jsonify({'error': 'Write access denied to this store'}), 403
    
    # Validate request data
    data = request.get_json()
    if not data or 'product_id' not in data or 'quantity' not in data:
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Check product exists and belongs to this store
    product = Product.query.get(data['product_id'])
    if not product or product.store_id != store_id:
        return jsonify({'error': 'Invalid product ID'}), 400
    
    # Check sufficient quantity
    if product.current_quantity < data['quantity']:
        return jsonify({
            'error': 'Insufficient quantity',
            'available': product.current_quantity,
            'requested': data['quantity']
        }), 400
    
    # Use product's unit price if not provided
    unit_price = data.get('unit_price', product.unit_price)
    
    # Create sale movement
    movement = InventoryMovement(
        product_id=data['product_id'],
        store_id=store_id,
        movement_type='sale',
        quantity=data['quantity'],
        unit_price=unit_price,
        reference=data.get('reference'),
        notes=data.get('notes'),
        created_by=user.id,
        movement_date=datetime.utcnow()
    )
    db.session.add(movement)
    
    # Update product quantity
    product.current_quantity -= data['quantity']
    
    db.session.commit()
    
    return jsonify({
        'id': movement.id,
        'product_id': movement.product_id,
        'product_name': product.name,
        'quantity': movement.quantity,
        'unit_price': movement.unit_price,
        'total_value': movement.quantity * movement.unit_price,
        'new_stock_level': product.current_quantity,
        'message': f"Recorded sale of {movement.quantity} units of '{product.name}'"
    })