from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_required, current_user

from app import db
from forms import StoreForm
from models import Store, StorePermission

# Create the blueprint
bp = Blueprint('store', __name__, url_prefix='/store')


@bp.route('/dashboard/<int:store_id>')
@login_required
def dashboard(store_id):
    """Dashboard showing store metrics and stats."""
    # Check store access permission
    if not current_user.has_store_access(store_id):
        flash('You do not have access to this store', 'danger')
        return redirect(url_for('store.select_store'))
    
    # Get store data
    store = Store.query.get_or_404(store_id)
    
    # Get dashboard stats
    from models import Product, InventoryMovement
    import datetime
    
    # Basic inventory stats
    product_count = Product.query.filter_by(store_id=store_id).count()
    
    # Get low stock products
    low_stock_products = Product.query.filter_by(store_id=store_id).filter(
        Product.current_quantity <= Product.reorder_level
    ).all()
    
    # Get total inventory value
    inventory_value = db.session.query(
        db.func.sum(Product.current_quantity * Product.unit_price)
    ).filter_by(store_id=store_id).scalar() or 0
    
    # Get recent movements (last 7 days)
    last_week = datetime.datetime.now() - datetime.timedelta(days=7)
    recent_movements = InventoryMovement.query.filter_by(
        store_id=store_id
    ).filter(
        InventoryMovement.movement_date >= last_week
    ).order_by(
        InventoryMovement.movement_date.desc()
    ).limit(10).all()
    
    # Sales summary for current month
    start_of_month = datetime.datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    sales_this_month = InventoryMovement.query.filter_by(
        store_id=store_id,
        movement_type='sale'
    ).filter(
        InventoryMovement.movement_date >= start_of_month
    ).all()
    
    sales_value = sum(m.quantity * m.unit_price for m in sales_this_month)
    sales_count = len(sales_this_month)
    
    # Purchases summary for current month
    purchases_this_month = InventoryMovement.query.filter_by(
        store_id=store_id,
        movement_type='stock_in'
    ).filter(
        InventoryMovement.movement_date >= start_of_month
    ).all()
    
    purchases_value = sum(m.quantity * m.unit_price for m in purchases_this_month)
    purchases_count = len(purchases_this_month)
    
    return render_template('store/dashboard.html',
                          title=f'Dashboard - {store.name}',
                          store=store,
                          product_count=product_count,
                          low_stock_products=low_stock_products,
                          inventory_value=inventory_value,
                          recent_movements=recent_movements,
                          sales_value=sales_value,
                          sales_count=sales_count,
                          purchases_value=purchases_value,
                          purchases_count=purchases_count)


@bp.route('/select')
@login_required
def select_store():
    """Store selection page."""
    # Admin users can see all stores
    if current_user.role.name == 'admin':
        stores = Store.query.filter_by(is_active=True).all()
    else:
        # Other users can only see stores they have permissions for
        store_permissions = StorePermission.query.filter_by(user_id=current_user.id).all()
        store_ids = [p.store_id for p in store_permissions]
        stores = Store.query.filter(Store.id.in_(store_ids), Store.is_active == True).all()
    
    # If only one store, redirect to that store's dashboard
    if len(stores) == 1:
        return redirect(url_for('store.dashboard', store_id=stores[0].id))
    
    return render_template('store/select_store.html', title='Select Store', stores=stores)


@bp.route('/manage')
@login_required
def manage_stores():
    """Store management page (admin only)."""
    # Only admins can manage stores
    if current_user.role.name != 'admin':
        flash('You do not have permission to manage stores', 'danger')
        return redirect(url_for('store.select_store'))
    
    stores = Store.query.all()
    return render_template('store/manage_stores.html', title='Manage Stores', stores=stores)


@bp.route('/add', methods=['GET', 'POST'])
@login_required
def add_store():
    """Add new store page (admin only)."""
    # Only admins can add stores
    if current_user.role.name != 'admin':
        flash('You do not have permission to add stores', 'danger')
        return redirect(url_for('store.select_store'))
    
    form = StoreForm()
    
    if form.validate_on_submit():
        store = Store(
            name=form.name.data,
            code=form.code.data,
            location=form.location.data,
            address=form.address.data,
            phone=form.phone.data,
            email=form.email.data,
            is_active=True
        )
        
        db.session.add(store)
        db.session.commit()
        
        flash(f'Store {form.name.data} has been added!', 'success')
        return redirect(url_for('store.manage_stores'))
    
    return render_template('store/add_store.html', title='Add New Store', form=form)


@bp.route('/<int:store_id>/edit', methods=['GET', 'POST'])
@login_required
def edit_store(store_id):
    """Edit store page (admin only)."""
    # Only admins can edit stores
    if current_user.role.name != 'admin':
        flash('You do not have permission to edit stores', 'danger')
        return redirect(url_for('store.select_store'))
    
    store = Store.query.get_or_404(store_id)
    form = StoreForm(obj=store)
    
    if form.validate_on_submit():
        store.name = form.name.data
        store.code = form.code.data
        store.location = form.location.data
        store.address = form.address.data
        store.phone = form.phone.data
        store.email = form.email.data
        
        db.session.commit()
        
        flash(f'Store {store.name} has been updated!', 'success')
        return redirect(url_for('store.manage_stores'))
    
    return render_template('store/edit_store.html', title='Edit Store', form=form, store=store)


@bp.route('/<int:store_id>/toggle', methods=['POST'])
@login_required
def toggle_store_active(store_id):
    """Toggle store active status (admin only)."""
    # Only admins can toggle store status
    if current_user.role.name != 'admin':
        flash('You do not have permission to change store status', 'danger')
        return redirect(url_for('store.select_store'))
    
    store = Store.query.get_or_404(store_id)
    store.is_active = not store.is_active
    db.session.commit()
    
    status = 'activated' if store.is_active else 'deactivated'
    flash(f'Store {store.name} has been {status}', 'success')
    
    return redirect(url_for('store.manage_stores'))