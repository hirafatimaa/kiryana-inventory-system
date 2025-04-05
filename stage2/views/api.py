from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from app import db
from models import Store, Product, InventoryMovement, Supplier

# Create blueprint
bp = Blueprint('api', __name__, url_prefix='/api')


@bp.route('/store/<int:store_id>/products')
@login_required
def get_products(store_id):
    """Get all products for a store"""
    # Verify user has access to this store
    if not current_user.has_store_access(store_id):
        return jsonify({"error": "Access denied"}), 403
    
    # Get products
    products = Product.query.filter_by(store_id=store_id).all()
    
    # Convert to JSON
    products_json = [{
        'id': p.id,
        'name': p.name,
        'sku': p.sku,
        'barcode': p.barcode,
        'category': p.category,
        'unit_price': p.unit_price,
        'current_quantity': p.current_quantity,
        'reorder_level': p.reorder_level,
        'is_low_stock': p.is_low_stock()
    } for p in products]
    
    return jsonify(products_json)


@bp.route('/store/<int:store_id>/product/<int:product_id>')
@login_required
def get_product(store_id, product_id):
    """Get a specific product"""
    # Verify user has access to this store
    if not current_user.has_store_access(store_id):
        return jsonify({"error": "Access denied"}), 403
    
    # Get product
    product = Product.query.get_or_404(product_id)
    
    # Verify product belongs to this store
    if product.store_id != store_id:
        return jsonify({"error": "Product not found in this store"}), 404
    
    # Convert to JSON
    product_json = {
        'id': product.id,
        'name': product.name,
        'sku': product.sku,
        'barcode': product.barcode,
        'description': product.description,
        'category': product.category,
        'unit_price': product.unit_price,
        'cost_price': product.cost_price,
        'current_quantity': product.current_quantity,
        'reorder_level': product.reorder_level,
        'location_in_store': product.location_in_store,
        'is_low_stock': product.is_low_stock(),
        'store_id': product.store_id
    }
    
    return jsonify(product_json)


@bp.route('/store/<int:store_id>/product/<int:product_id>/movements')
@login_required
def get_product_movements(store_id, product_id):
    """Get movements for a specific product"""
    # Verify user has access to this store
    if not current_user.has_store_access(store_id):
        return jsonify({"error": "Access denied"}), 403
    
    # Get product
    product = Product.query.get_or_404(product_id)
    
    # Verify product belongs to this store
    if product.store_id != store_id:
        return jsonify({"error": "Product not found in this store"}), 404
    
    # Get movements
    movements = InventoryMovement.query.filter_by(
        product_id=product_id,
        store_id=store_id
    ).order_by(InventoryMovement.movement_date.desc()).all()
    
    # Convert to JSON
    movements_json = [{
        'id': m.id,
        'movement_type': m.movement_type,
        'quantity': m.quantity,
        'unit_price': m.unit_price,
        'total_value': m.get_total_value(),
        'reference': m.reference,
        'notes': m.notes,
        'movement_date': m.movement_date.isoformat(),
        'created_at': m.created_at.isoformat()
    } for m in movements]
    
    return jsonify(movements_json)


@bp.route('/store/<int:store_id>/low-stock')
@login_required
def get_low_stock(store_id):
    """Get low stock products"""
    # Verify user has access to this store
    if not current_user.has_store_access(store_id):
        return jsonify({"error": "Access denied"}), 403
    
    # Get low stock products
    products = Product.query.filter(
        Product.store_id == store_id,
        Product.current_quantity <= Product.reorder_level
    ).all()
    
    # Convert to JSON
    products_json = [{
        'id': p.id,
        'name': p.name,
        'sku': p.sku,
        'category': p.category,
        'current_quantity': p.current_quantity,
        'reorder_level': p.reorder_level,
        'unit_price': p.unit_price
    } for p in products]
    
    return jsonify(products_json)


@bp.route('/store/<int:store_id>/suppliers')
@login_required
def get_suppliers(store_id):
    """Get all suppliers"""
    # Verify user has access to this store
    if not current_user.has_store_access(store_id):
        return jsonify({"error": "Access denied"}), 403
    
    # Get suppliers
    suppliers = Supplier.query.filter_by(is_active=True).all()
    
    # Convert to JSON
    suppliers_json = [{
        'id': s.id,
        'name': s.name,
        'contact_name': s.contact_name,
        'email': s.email,
        'phone': s.phone
    } for s in suppliers]
    
    return jsonify(suppliers_json)


@bp.route('/store/<int:store_id>/recent-movements')
@login_required
def get_recent_movements(store_id):
    """Get recent inventory movements"""
    # Verify user has access to this store
    if not current_user.has_store_access(store_id):
        return jsonify({"error": "Access denied"}), 403
    
    # Get limit parameter
    limit = request.args.get('limit', 10, type=int)
    
    # Get recent movements
    movements = InventoryMovement.query.filter_by(
        store_id=store_id
    ).order_by(InventoryMovement.movement_date.desc()).limit(limit).all()
    
    # Convert to JSON with product info
    movements_json = [{
        'id': m.id,
        'product_id': m.product_id,
        'product_name': m.product.name,
        'movement_type': m.movement_type,
        'quantity': m.quantity,
        'unit_price': m.unit_price,
        'total_value': m.get_total_value(),
        'reference': m.reference,
        'movement_date': m.movement_date.isoformat()
    } for m in movements]
    
    return jsonify(movements_json)


@bp.route('/user/stores')
@login_required
def get_user_stores():
    """Get stores accessible to the current user"""
    if current_user.role.name == 'admin':
        # Admin can see all stores
        stores = Store.query.filter_by(is_active=True).all()
    else:
        # Other users can only see stores they have access to
        store_ids = [perm.store_id for perm in current_user.store_permissions]
        stores = Store.query.filter(
            Store.id.in_(store_ids),
            Store.is_active == True
        ).all()
    
    # Convert to JSON
    stores_json = [{
        'id': s.id,
        'name': s.name,
        'code': s.code,
        'location': s.location,
        'address': s.address,
        'phone': s.phone,
        'email': s.email
    } for s in stores]
    
    return jsonify(stores_json)