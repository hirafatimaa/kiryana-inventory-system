from flask import Blueprint, flash, redirect, render_template, request, url_for
from flask_login import current_user, login_required

from app import db
from models import Product, Store, Supplier, SupplierProduct

# Create blueprint
bp = Blueprint('supplier', __name__, url_prefix='/supplier')


@bp.route('/store/<int:store_id>/list')
@login_required
def list_suppliers(store_id):
    """List all suppliers"""
    store = Store.query.get_or_404(store_id)
    
    # Verify user has access to this store
    if not current_user.has_store_access(store_id):
        flash('You do not have access to this store.', 'danger')
        return redirect(url_for('store.select_store'))
    
    suppliers = Supplier.query.filter_by(is_active=True).all()
    return render_template('supplier/list.html', suppliers=suppliers, store=store)


@bp.route('/store/<int:store_id>/add', methods=['GET', 'POST'])
@login_required
def add_supplier(store_id):
    """Add a new supplier"""
    store = Store.query.get_or_404(store_id)
    
    # Verify user has write access to this store
    if not current_user.has_store_write_access(store_id):
        flash('You do not have permission to add suppliers.', 'danger')
        return redirect(url_for('supplier.list_suppliers', store_id=store_id))
    
    if request.method == 'POST':
        name = request.form.get('name')
        contact_name = request.form.get('contact_name')
        email = request.form.get('email')
        phone = request.form.get('phone')
        address = request.form.get('address')
        
        # Validate required fields
        if not name:
            flash('Supplier name is required.', 'danger')
            return redirect(url_for('supplier.add_supplier', store_id=store_id))
        
        # Create new supplier
        supplier = Supplier(
            name=name,
            contact_name=contact_name,
            email=email,
            phone=phone,
            address=address,
            is_active=True
        )
        
        db.session.add(supplier)
        db.session.commit()
        
        flash(f'Supplier {name} has been added successfully.', 'success')
        return redirect(url_for('supplier.list_suppliers', store_id=store_id))
    
    return render_template('supplier/add.html', store=store)


@bp.route('/store/<int:store_id>/edit/<int:supplier_id>', methods=['GET', 'POST'])
@login_required
def edit_supplier(store_id, supplier_id):
    """Edit an existing supplier"""
    store = Store.query.get_or_404(store_id)
    supplier = Supplier.query.get_or_404(supplier_id)
    
    # Verify user has write access to this store
    if not current_user.has_store_write_access(store_id):
        flash('You do not have permission to edit suppliers.', 'danger')
        return redirect(url_for('supplier.list_suppliers', store_id=store_id))
    
    if request.method == 'POST':
        name = request.form.get('name')
        contact_name = request.form.get('contact_name')
        email = request.form.get('email')
        phone = request.form.get('phone')
        address = request.form.get('address')
        is_active = 'is_active' in request.form
        
        # Validate required fields
        if not name:
            flash('Supplier name is required.', 'danger')
            return redirect(url_for('supplier.edit_supplier', store_id=store_id, supplier_id=supplier_id))
        
        # Update supplier
        supplier.name = name
        supplier.contact_name = contact_name
        supplier.email = email
        supplier.phone = phone
        supplier.address = address
        supplier.is_active = is_active
        
        db.session.commit()
        
        flash(f'Supplier {name} has been updated successfully.', 'success')
        return redirect(url_for('supplier.list_suppliers', store_id=store_id))
    
    return render_template('supplier/edit.html', supplier=supplier, store=store)


@bp.route('/store/<int:store_id>/view/<int:supplier_id>')
@login_required
def view_supplier(store_id, supplier_id):
    """View detailed supplier information"""
    store = Store.query.get_or_404(store_id)
    supplier = Supplier.query.get_or_404(supplier_id)
    
    # Verify user has access to this store
    if not current_user.has_store_access(store_id):
        flash('You do not have access to this store.', 'danger')
        return redirect(url_for('store.select_store'))
    
    # Get products for this supplier
    supplier_products = SupplierProduct.query.filter_by(supplier_id=supplier_id).all()
    
    return render_template('supplier/view.html', 
                          supplier=supplier, 
                          store=store,
                          supplier_products=supplier_products)


@bp.route('/store/<int:store_id>/products/<int:supplier_id>', methods=['GET', 'POST'])
@login_required
def supplier_products(store_id, supplier_id):
    """Manage products for a supplier"""
    store = Store.query.get_or_404(store_id)
    supplier = Supplier.query.get_or_404(supplier_id)
    
    # Verify user has write access to this store
    if not current_user.has_store_write_access(store_id):
        flash('You do not have permission to manage supplier products.', 'danger')
        return redirect(url_for('supplier.view_supplier', store_id=store_id, supplier_id=supplier_id))
    
    # Get existing supplier products
    supplier_products = SupplierProduct.query.filter_by(supplier_id=supplier_id).all()
    
    # Get products for this store for the dropdown
    products = Product.query.filter_by(store_id=store_id).all()
    
    if request.method == 'POST':
        product_id = request.form.get('product_id')
        supplier_sku = request.form.get('supplier_sku')
        cost_price = request.form.get('cost_price')
        lead_time_days = request.form.get('lead_time_days')
        minimum_order_quantity = request.form.get('minimum_order_quantity')
        is_preferred = 'is_preferred' in request.form
        notes = request.form.get('notes')
        
        # Validate required fields
        if not product_id:
            flash('Product is required.', 'danger')
            return redirect(url_for('supplier.supplier_products', store_id=store_id, supplier_id=supplier_id))
        
        # Convert numeric values
        try:
            product_id = int(product_id)
            cost_price = float(cost_price) if cost_price else None
            lead_time_days = int(lead_time_days) if lead_time_days else None
            minimum_order_quantity = int(minimum_order_quantity) if minimum_order_quantity else 1
        except ValueError:
            flash('Invalid numeric values provided.', 'danger')
            return redirect(url_for('supplier.supplier_products', store_id=store_id, supplier_id=supplier_id))
        
        # Check if product exists
        product = Product.query.get(product_id)
        if not product:
            flash('Selected product does not exist.', 'danger')
            return redirect(url_for('supplier.supplier_products', store_id=store_id, supplier_id=supplier_id))
        
        # Check if supplier-product relationship already exists
        existing = SupplierProduct.query.filter_by(supplier_id=supplier_id, product_id=product_id).first()
        if existing:
            # Update existing
            existing.supplier_sku = supplier_sku
            existing.cost_price = cost_price
            existing.lead_time_days = lead_time_days
            existing.minimum_order_quantity = minimum_order_quantity
            existing.is_preferred = is_preferred
            existing.notes = notes
            flash(f'Updated supplier information for {product.name}.', 'success')
        else:
            # Create new
            supplier_product = SupplierProduct(
                supplier_id=supplier_id,
                product_id=product_id,
                supplier_sku=supplier_sku,
                cost_price=cost_price,
                lead_time_days=lead_time_days,
                minimum_order_quantity=minimum_order_quantity,
                is_preferred=is_preferred,
                notes=notes
            )
            db.session.add(supplier_product)
            flash(f'Added {product.name} to supplier {supplier.name}.', 'success')
        
        db.session.commit()
        return redirect(url_for('supplier.supplier_products', store_id=store_id, supplier_id=supplier_id))
    
    return render_template('supplier/products.html', 
                          supplier=supplier,
                          store=store,
                          supplier_products=supplier_products,
                          products=products)


@bp.route('/store/<int:store_id>/products/<int:supplier_id>/remove/<int:product_id>')
@login_required
def remove_supplier_product(store_id, supplier_id, product_id):
    """Remove a product from a supplier"""
    store = Store.query.get_or_404(store_id)
    supplier = Supplier.query.get_or_404(supplier_id)
    
    # Verify user has write access to this store
    if not current_user.has_store_write_access(store_id):
        flash('You do not have permission to manage supplier products.', 'danger')
        return redirect(url_for('supplier.view_supplier', store_id=store_id, supplier_id=supplier_id))
    
    # Find the supplier-product relationship
    supplier_product = SupplierProduct.query.filter_by(supplier_id=supplier_id, product_id=product_id).first()
    
    if supplier_product:
        product = Product.query.get(product_id)
        db.session.delete(supplier_product)
        db.session.commit()
        flash(f'Removed {product.name} from supplier {supplier.name}.', 'success')
    else:
        flash('Product is not associated with this supplier.', 'warning')
    
    return redirect(url_for('supplier.supplier_products', store_id=store_id, supplier_id=supplier_id))