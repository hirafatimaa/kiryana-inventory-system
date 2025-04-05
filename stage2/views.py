from datetime import datetime, date
from flask import render_template, request, redirect, url_for, flash
from app import db
from models import Product, InventoryMovement, Store
from forms import ProductForm, StockInForm, SaleForm, RemovalForm, ReportFilterForm

def register_views(app):
    """Register all view functions with the Flask app"""
    
    @app.route('/')
    def index():
        """Homepage with dashboard"""
        # Get counts for dashboard
        product_count = Product.query.count()
        low_stock_count = Product.query.filter(Product.current_quantity <= Product.reorder_level).count()
        
        # Get latest movements
        recent_movements = InventoryMovement.query.order_by(
            InventoryMovement.movement_date.desc()
        ).limit(5).all()
        
        # Get low stock products
        low_stock_products = Product.query.filter(
            Product.current_quantity <= Product.reorder_level
        ).order_by(Product.current_quantity).limit(5).all()
        
        return render_template('index.html',
                              product_count=product_count,
                              low_stock_count=low_stock_count,
                              recent_movements=recent_movements,
                              low_stock_products=low_stock_products)
    
    @app.route('/products')
    def products():
        """List all products"""
        products = Product.query.all()
        return render_template('products.html', products=products)
    
    @app.route('/products/add', methods=['GET', 'POST'])
    def add_product():
        """Add a new product"""
        form = ProductForm()
        if form.validate_on_submit():
            # Get default store (for Phase 1)
            store = Store.query.first()
            
            product = Product(
                name=form.name.data,
                sku=form.sku.data,
                description=form.description.data,
                unit_price=form.unit_price.data,
                reorder_level=form.reorder_level.data,
                store_id=store.id
            )
            db.session.add(product)
            db.session.commit()
            flash('Product added successfully!', 'success')
            return redirect(url_for('products'))
        
        return render_template('add_product.html', form=form)
    
    @app.route('/products/edit/<int:product_id>', methods=['GET', 'POST'])
    def edit_product(product_id):
        """Edit an existing product"""
        product = Product.query.get_or_404(product_id)
        form = ProductForm(obj=product)
        
        if form.validate_on_submit():
            form.populate_obj(product)
            db.session.commit()
            flash('Product updated successfully!', 'success')
            return redirect(url_for('products'))
        
        return render_template('add_product.html', form=form, edit=True)
    
    @app.route('/stock-in', methods=['GET', 'POST'])
    def stock_in():
        """Record new inventory"""
        # Get all products for the dropdown
        products = Product.query.all()
        product_choices = [(p.id, f"{p.name} (SKU: {p.sku})") for p in products]
        
        form = StockInForm()
        form.product_id.choices = product_choices
        
        if form.validate_on_submit():
            product = Product.query.get(form.product_id.data)
            store = Store.query.first()  # Default store for Phase 1
            
            # Create inventory movement
            movement = InventoryMovement(
                product_id=form.product_id.data,
                store_id=store.id,
                movement_type='stock_in',
                quantity=form.quantity.data,
                unit_price=form.unit_price.data,
                reference=form.reference.data,
                notes=form.notes.data,
                movement_date=form.movement_date.data or datetime.utcnow()
            )
            
            # Update product quantity
            product.current_quantity += form.quantity.data
            
            # Save changes
            db.session.add(movement)
            db.session.commit()
            
            flash(f'Added {form.quantity.data} units of {product.name} to inventory!', 'success')
            return redirect(url_for('stock_in'))
        
        # Get recent stock-in movements
        recent_movements = InventoryMovement.query.filter_by(
            movement_type='stock_in'
        ).order_by(InventoryMovement.movement_date.desc()).limit(10).all()
        
        return render_template('stock_in.html', form=form, recent_movements=recent_movements)
    
    @app.route('/sales', methods=['GET', 'POST'])
    def sales():
        """Record sales"""
        # Get all products for the dropdown
        products = Product.query.all()
        product_choices = [(p.id, f"{p.name} (SKU: {p.sku}, Available: {p.current_quantity})") for p in products]
        
        form = SaleForm()
        form.product_id.choices = product_choices
        
        if form.validate_on_submit():
            product = Product.query.get(form.product_id.data)
            store = Store.query.first()  # Default store for Phase 1
            
            # Check if enough inventory
            if product.current_quantity < form.quantity.data:
                flash(f'Not enough inventory! Only {product.current_quantity} units available.', 'danger')
                return redirect(url_for('sales'))
            
            # Create inventory movement
            movement = InventoryMovement(
                product_id=form.product_id.data,
                store_id=store.id,
                movement_type='sale',
                quantity=form.quantity.data,
                unit_price=form.unit_price.data,
                reference=form.reference.data,
                notes=form.notes.data,
                movement_date=form.movement_date.data or datetime.utcnow()
            )
            
            # Update product quantity
            product.current_quantity -= form.quantity.data
            
            # Save changes
            db.session.add(movement)
            db.session.commit()
            
            flash(f'Recorded sale of {form.quantity.data} units of {product.name}!', 'success')
            return redirect(url_for('sales'))
        
        # Get recent sales movements
        recent_sales = InventoryMovement.query.filter_by(
            movement_type='sale'
        ).order_by(InventoryMovement.movement_date.desc()).limit(10).all()
        
        return render_template('sales.html', form=form, recent_sales=recent_sales)
    
    @app.route('/removals', methods=['GET', 'POST'])
    def removals():
        """Record manual removals"""
        # Get all products for the dropdown
        products = Product.query.all()
        product_choices = [(p.id, f"{p.name} (SKU: {p.sku}, Available: {p.current_quantity})") for p in products]
        
        form = RemovalForm()
        form.product_id.choices = product_choices
        
        if form.validate_on_submit():
            product = Product.query.get(form.product_id.data)
            store = Store.query.first()  # Default store for Phase 1
            
            # Check if enough inventory
            if product.current_quantity < form.quantity.data:
                flash(f'Not enough inventory! Only {product.current_quantity} units available.', 'danger')
                return redirect(url_for('removals'))
            
            # Create inventory movement
            movement = InventoryMovement(
                product_id=form.product_id.data,
                store_id=store.id,
                movement_type='removal',
                quantity=form.quantity.data,
                unit_price=product.unit_price,  # Use current product price
                notes=f"Reason: {form.reason.data}. {form.notes.data}",
                movement_date=form.movement_date.data or datetime.utcnow()
            )
            
            # Update product quantity
            product.current_quantity -= form.quantity.data
            
            # Save changes
            db.session.add(movement)
            db.session.commit()
            
            flash(f'Recorded removal of {form.quantity.data} units of {product.name}!', 'success')
            return redirect(url_for('removals'))
        
        # Get recent removal movements
        recent_removals = InventoryMovement.query.filter_by(
            movement_type='removal'
        ).order_by(InventoryMovement.movement_date.desc()).limit(10).all()
        
        return render_template('removals.html', form=form, recent_removals=recent_removals)
    
    @app.route('/inventory')
    def inventory():
        """View current inventory levels"""
        products = Product.query.all()
        return render_template('inventory.html', products=products)
    
    @app.route('/reports', methods=['GET', 'POST'])
    def reports():
        """Generate inventory reports"""
        # Get all products for the dropdown
        products = Product.query.all()
        product_choices = [(0, 'All Products')]
        product_choices.extend([(p.id, p.name) for p in products])
        
        form = ReportFilterForm()
        form.product_id.choices = product_choices
        
        query = InventoryMovement.query
        
        if form.validate_on_submit():
            # Apply filters
            if form.product_id.data and form.product_id.data > 0:
                query = query.filter_by(product_id=form.product_id.data)
            
            if form.movement_type.data:
                query = query.filter_by(movement_type=form.movement_type.data)
            
            if form.start_date.data:
                query = query.filter(InventoryMovement.movement_date >= form.start_date.data)
            
            if form.end_date.data:
                query = query.filter(InventoryMovement.movement_date <= form.end_date.data)
        
        # Get movements based on filters
        movements = query.order_by(InventoryMovement.movement_date.desc()).all()
        
        # Calculate summary statistics
        total_stock_in = sum(m.quantity for m in movements if m.movement_type == 'stock_in')
        total_sales = sum(m.quantity for m in movements if m.movement_type == 'sale')
        total_removals = sum(m.quantity for m in movements if m.movement_type == 'removal')
        
        return render_template('reports.html', 
                              form=form, 
                              movements=movements,
                              total_stock_in=total_stock_in,
                              total_sales=total_sales,
                              total_removals=total_removals)
