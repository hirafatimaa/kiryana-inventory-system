from datetime import datetime
from flask import Blueprint, flash, redirect, render_template, request, url_for
from flask_login import current_user, login_required

from app import db
from models import Product, Store, InventoryMovement

# Create blueprint
bp = Blueprint('inventory', __name__, url_prefix='/inventory')


@bp.route('/store/<int:store_id>/stock-in', methods=['GET', 'POST'])
@login_required
def stock_in(store_id):
    """Record new inventory (stock in)"""
    store = Store.query.get_or_404(store_id)
    
    # Verify user has write access to this store
    if not current_user.has_store_write_access(store_id):
        flash('You do not have permission to add inventory to this store.', 'danger')
        return redirect(url_for('store.dashboard', store_id=store_id))
    
    # Get products for this store
    products = Product.query.filter_by(store_id=store_id).order_by(Product.name).all()
    
    if request.method == 'POST':
        product_id = request.form.get('product_id')
        quantity = request.form.get('quantity')
        unit_price = request.form.get('unit_price')
        reference = request.form.get('reference')
        notes = request.form.get('notes')
        
        # Handle date input in various formats 
        movement_date_str = request.form.get('movement_date')
        if movement_date_str:
            try:
                movement_date = datetime.strptime(movement_date_str, '%Y-%m-%d')
            except ValueError:
                movement_date = datetime.utcnow()
        else:
            movement_date = datetime.utcnow()
        
        # Validate required fields
        if not product_id or not quantity:
            flash('Product and quantity are required.', 'danger')
            return redirect(url_for('inventory.stock_in', store_id=store_id))
        
        # Convert numeric values
        try:
            product_id = int(product_id)
            quantity = int(quantity)
            unit_price = float(unit_price) if unit_price else 0
        except ValueError:
            flash('Invalid numeric values provided.', 'danger')
            return redirect(url_for('inventory.stock_in', store_id=store_id))
        
        # Validate that quantity is positive
        if quantity <= 0:
            flash('Quantity must be a positive number.', 'danger')
            return redirect(url_for('inventory.stock_in', store_id=store_id))
        
        # Check if product exists and belongs to this store
        product = Product.query.get(product_id)
        if not product or product.store_id != store_id:
            flash('Invalid product selected.', 'danger')
            return redirect(url_for('inventory.stock_in', store_id=store_id))
        
        # Create inventory movement
        movement = InventoryMovement(
            product_id=product_id,
            store_id=store_id,
            movement_type='stock_in',
            quantity=quantity,
            unit_price=unit_price,
            reference=reference,
            notes=notes,
            created_by=current_user.id,
            movement_date=movement_date
        )
        
        # Update product quantity
        product.current_quantity += quantity
        
        # If no unit price is set for the product, update it
        if not product.unit_price and unit_price:
            product.unit_price = unit_price
        
        db.session.add(movement)
        db.session.commit()
        
        flash(f'Added {quantity} units of {product.name} to inventory.', 'success')
        return redirect(url_for('inventory.stock_in', store_id=store_id))
    
    return render_template('inventory/stock_in.html', store=store, products=products)


@bp.route('/store/<int:store_id>/sales', methods=['GET', 'POST'])
@login_required
def sales(store_id):
    """Record sales transaction"""
    store = Store.query.get_or_404(store_id)
    
    # Verify user has write access to this store
    if not current_user.has_store_write_access(store_id):
        flash('You do not have permission to record sales for this store.', 'danger')
        return redirect(url_for('store.dashboard', store_id=store_id))
    
    # Get products for this store
    products = Product.query.filter_by(store_id=store_id).order_by(Product.name).all()
    
    if request.method == 'POST':
        product_id = request.form.get('product_id')
        quantity = request.form.get('quantity')
        unit_price = request.form.get('unit_price')
        reference = request.form.get('reference')
        notes = request.form.get('notes')
        
        # Handle date input in various formats 
        movement_date_str = request.form.get('movement_date')
        if movement_date_str:
            try:
                movement_date = datetime.strptime(movement_date_str, '%Y-%m-%d')
            except ValueError:
                movement_date = datetime.utcnow()
        else:
            movement_date = datetime.utcnow()
        
        # Validate required fields
        if not product_id or not quantity:
            flash('Product and quantity are required.', 'danger')
            return redirect(url_for('inventory.sales', store_id=store_id))
        
        # Convert numeric values
        try:
            product_id = int(product_id)
            quantity = int(quantity)
            unit_price = float(unit_price) if unit_price else 0
        except ValueError:
            flash('Invalid numeric values provided.', 'danger')
            return redirect(url_for('inventory.sales', store_id=store_id))
        
        # Validate that quantity is positive
        if quantity <= 0:
            flash('Quantity must be a positive number.', 'danger')
            return redirect(url_for('inventory.sales', store_id=store_id))
        
        # Check if product exists and belongs to this store
        product = Product.query.get(product_id)
        if not product or product.store_id != store_id:
            flash('Invalid product selected.', 'danger')
            return redirect(url_for('inventory.sales', store_id=store_id))
        
        # Check if there's enough inventory
        if product.current_quantity < quantity:
            flash(f'Not enough inventory for {product.name}. Only {product.current_quantity} available.', 'danger')
            return redirect(url_for('inventory.sales', store_id=store_id))
        
        # Create inventory movement
        movement = InventoryMovement(
            product_id=product_id,
            store_id=store_id,
            movement_type='sale',
            quantity=quantity,
            unit_price=unit_price if unit_price else product.unit_price,
            reference=reference,
            notes=notes,
            created_by=current_user.id,
            movement_date=movement_date
        )
        
        # Update product quantity
        product.current_quantity -= quantity
        
        db.session.add(movement)
        db.session.commit()
        
        flash(f'Recorded sale of {quantity} units of {product.name}.', 'success')
        return redirect(url_for('inventory.sales', store_id=store_id))
    
    return render_template('inventory/sales.html', store=store, products=products)


@bp.route('/store/<int:store_id>/removals', methods=['GET', 'POST'])
@login_required
def removals(store_id):
    """Record inventory removals (damaged, expired, etc.)"""
    store = Store.query.get_or_404(store_id)
    
    # Verify user has write access to this store
    if not current_user.has_store_write_access(store_id):
        flash('You do not have permission to record removals for this store.', 'danger')
        return redirect(url_for('store.dashboard', store_id=store_id))
    
    # Get products for this store
    products = Product.query.filter_by(store_id=store_id).order_by(Product.name).all()
    
    if request.method == 'POST':
        product_id = request.form.get('product_id')
        quantity = request.form.get('quantity')
        reason = request.form.get('reason')
        notes = request.form.get('notes')
        
        # Handle date input in various formats 
        movement_date_str = request.form.get('movement_date')
        if movement_date_str:
            try:
                movement_date = datetime.strptime(movement_date_str, '%Y-%m-%d')
            except ValueError:
                movement_date = datetime.utcnow()
        else:
            movement_date = datetime.utcnow()
        
        # Validate required fields
        if not product_id or not quantity or not reason:
            flash('Product, quantity, and reason are required.', 'danger')
            return redirect(url_for('inventory.removals', store_id=store_id))
        
        # Convert numeric values
        try:
            product_id = int(product_id)
            quantity = int(quantity)
        except ValueError:
            flash('Invalid numeric values provided.', 'danger')
            return redirect(url_for('inventory.removals', store_id=store_id))
        
        # Validate that quantity is positive
        if quantity <= 0:
            flash('Quantity must be a positive number.', 'danger')
            return redirect(url_for('inventory.removals', store_id=store_id))
        
        # Check if product exists and belongs to this store
        product = Product.query.get(product_id)
        if not product or product.store_id != store_id:
            flash('Invalid product selected.', 'danger')
            return redirect(url_for('inventory.removals', store_id=store_id))
        
        # Check if there's enough inventory
        if product.current_quantity < quantity:
            flash(f'Not enough inventory for {product.name}. Only {product.current_quantity} available.', 'danger')
            return redirect(url_for('inventory.removals', store_id=store_id))
        
        # Combine reason and notes
        full_notes = f"Reason: {reason}\n{notes if notes else ''}"
        
        # Create inventory movement
        movement = InventoryMovement(
            product_id=product_id,
            store_id=store_id,
            movement_type='removal',
            quantity=quantity,
            unit_price=product.unit_price,
            reference=f"Removal: {reason}",
            notes=full_notes,
            created_by=current_user.id,
            movement_date=movement_date
        )
        
        # Update product quantity
        product.current_quantity -= quantity
        
        db.session.add(movement)
        db.session.commit()
        
        flash(f'Recorded removal of {quantity} units of {product.name}.', 'success')
        return redirect(url_for('inventory.removals', store_id=store_id))
    
    return render_template('inventory/removals.html', store=store, products=products)


@bp.route('/store/<int:store_id>/movements')
@login_required
def movements(store_id):
    """View inventory movements for a store"""
    store = Store.query.get_or_404(store_id)
    
    # Verify user has access to this store
    if not current_user.has_store_access(store_id):
        flash('You do not have access to this store.', 'danger')
        return redirect(url_for('store.select_store'))
    
    # Apply filters
    product_id = request.args.get('product_id')
    movement_type = request.args.get('movement_type')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    # Build query
    query = InventoryMovement.query.filter_by(store_id=store_id)
    
    # Apply product filter
    if product_id:
        query = query.filter_by(product_id=product_id)
    
    # Apply movement type filter
    if movement_type:
        query = query.filter_by(movement_type=movement_type)
    
    # Apply date filters
    if start_date:
        try:
            start_date_obj = datetime.strptime(start_date, '%Y-%m-%d')
            query = query.filter(InventoryMovement.movement_date >= start_date_obj)
        except ValueError:
            pass
    
    if end_date:
        try:
            end_date_obj = datetime.strptime(end_date, '%Y-%m-%d')
            query = query.filter(InventoryMovement.movement_date <= end_date_obj)
        except ValueError:
            pass
    
    # Get products for filter dropdown
    products = Product.query.filter_by(store_id=store_id).order_by(Product.name).all()
    
    # Get movements with ordering
    movements = query.order_by(InventoryMovement.movement_date.desc()).all()
    
    return render_template('inventory/movements.html', 
                          store=store, 
                          movements=movements,
                          products=products,
                          product_id=product_id,
                          movement_type=movement_type,
                          start_date=start_date,
                          end_date=end_date)