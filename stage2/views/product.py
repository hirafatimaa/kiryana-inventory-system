from flask import Blueprint, flash, redirect, render_template, request, url_for
from flask_login import current_user, login_required

from app import db
from models import Product, Store, InventoryMovement

# Create blueprint
bp = Blueprint('product', __name__, url_prefix='/product')


@bp.route('/store/<int:store_id>/list')
@login_required
def list_products(store_id):
    """List all products for a specific store"""
    store = Store.query.get_or_404(store_id)
    
    # Verify user has access to this store
    if not current_user.has_store_access(store_id):
        flash('You do not have access to this store.', 'danger')
        return redirect(url_for('store.select_store'))
    
    products = Product.query.filter_by(store_id=store_id).all()
    return render_template('product/list.html', products=products, store=store)


@bp.route('/store/<int:store_id>/add', methods=['GET', 'POST'])
@login_required
def add_product(store_id):
    """Add a new product to a store"""
    store = Store.query.get_or_404(store_id)
    
    # Verify user has write access to this store
    if not current_user.has_store_write_access(store_id):
        flash('You do not have permission to add products to this store.', 'danger')
        return redirect(url_for('product.list_products', store_id=store_id))
    
    if request.method == 'POST':
        name = request.form.get('name')
        sku = request.form.get('sku')
        barcode = request.form.get('barcode')
        description = request.form.get('description')
        category = request.form.get('category')
        unit_price = request.form.get('unit_price')
        cost_price = request.form.get('cost_price')
        reorder_level = request.form.get('reorder_level')
        location_in_store = request.form.get('location_in_store')
        
        # Validate required fields
        if not name:
            flash('Product name is required.', 'danger')
            return redirect(url_for('product.add_product', store_id=store_id))
        
        # Convert numeric values
        try:
            unit_price = float(unit_price) if unit_price else 0
            cost_price = float(cost_price) if cost_price else None
            reorder_level = int(reorder_level) if reorder_level else 10
        except ValueError:
            flash('Invalid numeric values provided.', 'danger')
            return redirect(url_for('product.add_product', store_id=store_id))
        
        # Check if SKU already exists in this store
        if sku:
            existing_product = Product.query.filter_by(sku=sku, store_id=store_id).first()
            if existing_product:
                flash(f'A product with SKU {sku} already exists in this store.', 'danger')
                return redirect(url_for('product.add_product', store_id=store_id))
        
        # Create new product
        product = Product(
            name=name,
            sku=sku,
            barcode=barcode,
            description=description,
            category=category,
            unit_price=unit_price,
            cost_price=cost_price,
            reorder_level=reorder_level,
            location_in_store=location_in_store,
            store_id=store_id,
            current_quantity=0
        )
        
        db.session.add(product)
        db.session.commit()
        
        flash(f'Product {name} has been added successfully.', 'success')
        return redirect(url_for('product.list_products', store_id=store_id))
    
    return render_template('product/add.html', store=store)


@bp.route('/store/<int:store_id>/edit/<int:product_id>', methods=['GET', 'POST'])
@login_required
def edit_product(store_id, product_id):
    """Edit an existing product"""
    store = Store.query.get_or_404(store_id)
    product = Product.query.get_or_404(product_id)
    
    # Verify product belongs to this store
    if product.store_id != store_id:
        flash('Invalid product or store.', 'danger')
        return redirect(url_for('product.list_products', store_id=store_id))
    
    # Verify user has write access to this store
    if not current_user.has_store_write_access(store_id):
        flash('You do not have permission to edit products in this store.', 'danger')
        return redirect(url_for('product.list_products', store_id=store_id))
    
    if request.method == 'POST':
        name = request.form.get('name')
        sku = request.form.get('sku')
        barcode = request.form.get('barcode')
        description = request.form.get('description')
        category = request.form.get('category')
        unit_price = request.form.get('unit_price')
        cost_price = request.form.get('cost_price')
        reorder_level = request.form.get('reorder_level')
        location_in_store = request.form.get('location_in_store')
        
        # Validate required fields
        if not name:
            flash('Product name is required.', 'danger')
            return redirect(url_for('product.edit_product', store_id=store_id, product_id=product_id))
        
        # Convert numeric values
        try:
            unit_price = float(unit_price) if unit_price else 0
            cost_price = float(cost_price) if cost_price else None
            reorder_level = int(reorder_level) if reorder_level else 10
        except ValueError:
            flash('Invalid numeric values provided.', 'danger')
            return redirect(url_for('product.edit_product', store_id=store_id, product_id=product_id))
        
        # Check if SKU already exists and it's not this product
        if sku:
            existing_product = Product.query.filter_by(sku=sku, store_id=store_id).first()
            if existing_product and existing_product.id != product_id:
                flash(f'A product with SKU {sku} already exists in this store.', 'danger')
                return redirect(url_for('product.edit_product', store_id=store_id, product_id=product_id))
        
        # Update product
        product.name = name
        product.sku = sku
        product.barcode = barcode
        product.description = description
        product.category = category
        product.unit_price = unit_price
        product.cost_price = cost_price
        product.reorder_level = reorder_level
        product.location_in_store = location_in_store
        
        db.session.commit()
        
        flash(f'Product {name} has been updated successfully.', 'success')
        return redirect(url_for('product.list_products', store_id=store_id))
    
    return render_template('product/edit.html', product=product, store=store)


@bp.route('/store/<int:store_id>/view/<int:product_id>')
@login_required
def view_product(store_id, product_id):
    """View detailed product information"""
    store = Store.query.get_or_404(store_id)
    product = Product.query.get_or_404(product_id)
    
    # Verify product belongs to this store
    if product.store_id != store_id:
        flash('Invalid product or store.', 'danger')
        return redirect(url_for('product.list_products', store_id=store_id))
    
    # Verify user has access to this store
    if not current_user.has_store_access(store_id):
        flash('You do not have access to this store.', 'danger')
        return redirect(url_for('store.select_store'))
    
    # Get product movements
    movements = product.inventory_movements.order_by(
        InventoryMovement.movement_date.desc()
    ).limit(10).all()
    
    return render_template('product/view.html', 
                          product=product, 
                          store=store,
                          movements=movements)


@bp.route('/store/<int:store_id>/low-stock')
@login_required
def low_stock(store_id):
    """Show products with low stock levels"""
    store = Store.query.get_or_404(store_id)
    
    # Verify user has access to this store
    if not current_user.has_store_access(store_id):
        flash('You do not have access to this store.', 'danger')
        return redirect(url_for('store.select_store'))
    
    # Get products with quantity at or below reorder level
    products = Product.query.filter(
        Product.store_id == store_id,
        Product.current_quantity <= Product.reorder_level
    ).all()
    
    return render_template('product/low_stock.html', 
                          products=products, 
                          store=store)