from datetime import datetime, timedelta
from flask import Blueprint, flash, jsonify, redirect, render_template, request, url_for
from flask_login import current_user, login_required
from sqlalchemy import func, extract

from app import db
from models import Store, Product, InventoryMovement, SalesOrder, SalesOrderItem

# Create blueprint
bp = Blueprint('report', __name__, url_prefix='/report')


@bp.route('/store/<int:store_id>/inventory')
@login_required
def inventory_report(store_id):
    """Inventory value and status report"""
    store = Store.query.get_or_404(store_id)
    
    # Verify user has access to this store
    if not current_user.has_store_access(store_id):
        flash('You do not have access to this store.', 'danger')
        return redirect(url_for('store.select_store'))
    
    # Get products with their current value
    products = Product.query.filter_by(store_id=store_id).all()
    
    # Calculate total inventory value
    total_value = sum(product.current_quantity * product.unit_price for product in products)
    
    # Count low stock products
    low_stock_count = Product.query.filter(
        Product.store_id == store_id,
        Product.current_quantity <= Product.reorder_level
    ).count()
    
    # Count out of stock products
    out_of_stock_count = Product.query.filter_by(
        store_id=store_id, 
        current_quantity=0
    ).count()
    
    return render_template('report/inventory.html',
                          store=store,
                          products=products,
                          total_value=total_value,
                          low_stock_count=low_stock_count,
                          out_of_stock_count=out_of_stock_count)


@bp.route('/store/<int:store_id>/movements')
@login_required
def movement_report(store_id):
    """Inventory movement (sales, stock-in, removals) report"""
    store = Store.query.get_or_404(store_id)
    
    # Verify user has access to this store
    if not current_user.has_store_access(store_id):
        flash('You do not have access to this store.', 'danger')
        return redirect(url_for('store.select_store'))
    
    # Get filter parameters
    product_id = request.args.get('product_id', type=int)
    movement_type = request.args.get('movement_type')
    
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    
    # Parse date strings if provided
    start_date = None
    end_date = None
    
    if start_date_str:
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
        except ValueError:
            pass
    
    if end_date_str:
        try:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
            # Set to end of day
            end_date = end_date.replace(hour=23, minute=59, second=59)
        except ValueError:
            pass
    
    # Build query
    query = InventoryMovement.query.filter_by(store_id=store_id)
    
    if product_id:
        query = query.filter_by(product_id=product_id)
    
    if movement_type:
        query = query.filter_by(movement_type=movement_type)
    
    if start_date:
        query = query.filter(InventoryMovement.movement_date >= start_date)
    
    if end_date:
        query = query.filter(InventoryMovement.movement_date <= end_date)
    
    # Get movements ordered by date
    movements = query.order_by(InventoryMovement.movement_date.desc()).all()
    
    # Calculate summary stats
    total_stock_in = sum(m.quantity for m in movements if m.movement_type == 'stock_in')
    total_sales = sum(m.quantity for m in movements if m.movement_type == 'sale')
    total_removals = sum(m.quantity for m in movements if m.movement_type == 'removal')
    
    total_stock_in_value = sum(m.quantity * m.unit_price for m in movements if m.movement_type == 'stock_in')
    total_sales_value = sum(m.quantity * m.unit_price for m in movements if m.movement_type == 'sale')
    total_removals_value = sum(m.quantity * m.unit_price for m in movements if m.movement_type == 'removal')
    
    # Get products for filter dropdown
    products = Product.query.filter_by(store_id=store_id).order_by(Product.name).all()
    
    return render_template('report/movements.html',
                          store=store,
                          movements=movements,
                          products=products,
                          product_id=product_id,
                          movement_type=movement_type,
                          start_date=start_date_str,
                          end_date=end_date_str,
                          total_stock_in=total_stock_in,
                          total_sales=total_sales,
                          total_removals=total_removals,
                          total_stock_in_value=total_stock_in_value,
                          total_sales_value=total_sales_value,
                          total_removals_value=total_removals_value)


@bp.route('/store/<int:store_id>/sales')
@login_required
def sales_report(store_id):
    """Sales report by product, category, etc."""
    store = Store.query.get_or_404(store_id)
    
    # Verify user has access to this store
    if not current_user.has_store_access(store_id):
        flash('You do not have access to this store.', 'danger')
        return redirect(url_for('store.select_store'))
    
    # Get filter parameters
    product_id = request.args.get('product_id', type=int)
    category = request.args.get('category')
    period = request.args.get('period', 'last30')
    
    # Calculate date range based on period
    end_date = datetime.now()
    
    if period == 'last7':
        start_date = end_date - timedelta(days=7)
    elif period == 'last30':
        start_date = end_date - timedelta(days=30)
    elif period == 'last90':
        start_date = end_date - timedelta(days=90)
    elif period == 'lastyear':
        start_date = end_date - timedelta(days=365)
    elif period == 'custom':
        # Parse custom date range
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        
        if start_date_str:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
            except ValueError:
                start_date = end_date - timedelta(days=30)
        else:
            start_date = end_date - timedelta(days=30)
        
        if end_date_str:
            try:
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
                # Set to end of day
                end_date = end_date.replace(hour=23, minute=59, second=59)
            except ValueError:
                pass
    else:
        # Default to last 30 days
        start_date = end_date - timedelta(days=30)
    
    # Build query for sales movements
    query = InventoryMovement.query.filter(
        InventoryMovement.store_id == store_id,
        InventoryMovement.movement_type == 'sale',
        InventoryMovement.movement_date.between(start_date, end_date)
    )
    
    if product_id:
        query = query.filter_by(product_id=product_id)
    
    if category:
        query = query.join(Product).filter(Product.category == category)
    
    # Get sales movements
    sales = query.order_by(InventoryMovement.movement_date.desc()).all()
    
    # Calculate summary stats
    total_quantity = sum(s.quantity for s in sales)
    total_value = sum(s.quantity * s.unit_price for s in sales)
    
    # Calculate sales by product
    sales_by_product = db.session.query(
        Product.name,
        func.sum(InventoryMovement.quantity).label('quantity'),
        func.sum(InventoryMovement.quantity * InventoryMovement.unit_price).label('value')
    ).join(InventoryMovement).filter(
        InventoryMovement.store_id == store_id,
        InventoryMovement.movement_type == 'sale',
        InventoryMovement.movement_date.between(start_date, end_date)
    )
    
    if product_id:
        sales_by_product = sales_by_product.filter(Product.id == product_id)
    
    if category:
        sales_by_product = sales_by_product.filter(Product.category == category)
    
    sales_by_product = sales_by_product.group_by(Product.name).order_by(func.sum(InventoryMovement.quantity).desc()).all()
    
    # Get products for filter dropdown
    products = Product.query.filter_by(store_id=store_id).order_by(Product.name).all()
    
    # Get categories for filter dropdown
    categories = db.session.query(Product.category).filter(
        Product.store_id == store_id,
        Product.category != None,
        Product.category != ''
    ).distinct().all()
    categories = [c[0] for c in categories]
    
    return render_template('report/sales.html',
                          store=store,
                          sales=sales,
                          total_quantity=total_quantity,
                          total_value=total_value,
                          sales_by_product=sales_by_product,
                          products=products,
                          categories=categories,
                          product_id=product_id,
                          category=category,
                          period=period,
                          start_date=start_date.strftime('%Y-%m-%d') if isinstance(start_date, datetime) else '',
                          end_date=end_date.strftime('%Y-%m-%d'))


@bp.route('/store/<int:store_id>/chart/sales')
@login_required
def sales_chart_data(store_id):
    """API endpoint for sales chart data"""
    # Verify user has access to this store
    if not current_user.has_store_access(store_id):
        return jsonify({"error": "Access denied"}), 403
    
    # Get filter parameters
    period = request.args.get('period', 'last30')
    product_id = request.args.get('product_id', type=int)
    
    # Calculate date range based on period
    end_date = datetime.now()
    
    if period == 'last7':
        start_date = end_date - timedelta(days=7)
        group_by = 'day'
    elif period == 'last30':
        start_date = end_date - timedelta(days=30)
        group_by = 'day'
    elif period == 'last90':
        start_date = end_date - timedelta(days=90)
        group_by = 'week'
    elif period == 'lastyear':
        start_date = end_date - timedelta(days=365)
        group_by = 'month'
    else:
        # Default to last 30 days
        start_date = end_date - timedelta(days=30)
        group_by = 'day'
    
    # Build query based on grouping
    if group_by == 'day':
        # Group by day
        sales_data = db.session.query(
            func.date(InventoryMovement.movement_date).label('date'),
            func.sum(InventoryMovement.quantity * InventoryMovement.unit_price).label('value')
        ).filter(
            InventoryMovement.store_id == store_id,
            InventoryMovement.movement_type == 'sale',
            InventoryMovement.movement_date.between(start_date, end_date)
        )
        
        if product_id:
            sales_data = sales_data.filter(InventoryMovement.product_id == product_id)
        
        sales_data = sales_data.group_by(func.date(InventoryMovement.movement_date)).order_by(func.date(InventoryMovement.movement_date)).all()
        
        # Format for chart
        labels = [item[0].strftime('%Y-%m-%d') for item in sales_data]
        values = [float(item[1]) for item in sales_data]
        
    elif group_by == 'week':
        # Group by week
        sales_data = db.session.query(
            func.date_trunc('week', InventoryMovement.movement_date).label('week'),
            func.sum(InventoryMovement.quantity * InventoryMovement.unit_price).label('value')
        ).filter(
            InventoryMovement.store_id == store_id,
            InventoryMovement.movement_type == 'sale',
            InventoryMovement.movement_date.between(start_date, end_date)
        )
        
        if product_id:
            sales_data = sales_data.filter(InventoryMovement.product_id == product_id)
        
        sales_data = sales_data.group_by(func.date_trunc('week', InventoryMovement.movement_date)).order_by(func.date_trunc('week', InventoryMovement.movement_date)).all()
        
        # Format for chart
        labels = [item[0].strftime('Week of %Y-%m-%d') for item in sales_data]
        values = [float(item[1]) for item in sales_data]
        
    else:  # month
        # Group by month
        sales_data = db.session.query(
            func.date_trunc('month', InventoryMovement.movement_date).label('month'),
            func.sum(InventoryMovement.quantity * InventoryMovement.unit_price).label('value')
        ).filter(
            InventoryMovement.store_id == store_id,
            InventoryMovement.movement_type == 'sale',
            InventoryMovement.movement_date.between(start_date, end_date)
        )
        
        if product_id:
            sales_data = sales_data.filter(InventoryMovement.product_id == product_id)
        
        sales_data = sales_data.group_by(func.date_trunc('month', InventoryMovement.movement_date)).order_by(func.date_trunc('month', InventoryMovement.movement_date)).all()
        
        # Format for chart
        labels = [item[0].strftime('%Y-%m') for item in sales_data]
        values = [float(item[1]) for item in sales_data]
    
    return jsonify({
        "labels": labels,
        "values": values
    })