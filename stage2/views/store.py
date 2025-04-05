from flask import Blueprint, flash, redirect, render_template, request, url_for
from flask_login import current_user, login_required

from app import db
from models import Store, StorePermission, User, Product, InventoryMovement

# Create blueprint
bp = Blueprint('store', __name__, url_prefix='/store')


@bp.route('/select')
@login_required
def select_store():
    """Store selection page"""
    # Admin can see all stores, other users only see permitted ones
    if current_user.role.name == 'admin':
        stores = Store.query.filter_by(is_active=True).all()
    else:
        # Get store IDs from user's permissions
        store_ids = [perm.store_id for perm in current_user.store_permissions]
        stores = Store.query.filter(Store.id.in_(store_ids), Store.is_active==True).all()
    
    return render_template('store/select_store.html', stores=stores)


@bp.route('/<int:store_id>/dashboard')
@login_required
def dashboard(store_id):
    """Store dashboard with key metrics"""
    # Verify user has access to this store
    if not current_user.has_store_access(store_id):
        flash('You do not have access to this store.', 'danger')
        return redirect(url_for('store.select_store'))
    
    # Get the store
    store = Store.query.get_or_404(store_id)
    
    # Get low stock products
    low_stock_products = store.products.filter(
        Product.current_quantity <= Product.reorder_level
    ).order_by(Product.current_quantity).limit(5).all()
    
    # Get recent inventory movements
    recent_movements = store.inventory_movements.order_by(
        InventoryMovement.movement_date.desc()
    ).limit(5).all()
    
    # Get product count
    product_count = store.products.count()
    
    # Get low stock count
    low_stock_count = store.products.filter(
        Product.current_quantity <= Product.reorder_level
    ).count()
    
    return render_template('store/dashboard.html',
                          store=store,
                          product_count=product_count,
                          low_stock_count=low_stock_count,
                          low_stock_products=low_stock_products,
                          recent_movements=recent_movements)


@bp.route('/list')
@login_required
def list_stores():
    """List all stores the user has access to"""
    # Admin can see all stores, other users only see permitted ones
    if current_user.role.name == 'admin':
        stores = Store.query.all()
    else:
        # Get store IDs from user's permissions
        store_ids = [perm.store_id for perm in current_user.store_permissions]
        stores = Store.query.filter(Store.id.in_(store_ids)).all()
    
    return render_template('store/list.html', stores=stores)


@bp.route('/add', methods=['GET', 'POST'])
@login_required
def add_store():
    """Add a new store"""
    # Only admin can add stores
    if current_user.role.name != 'admin':
        flash('Only administrators can add stores.', 'danger')
        return redirect(url_for('store.select_store'))
    
    if request.method == 'POST':
        name = request.form.get('name')
        code = request.form.get('code')
        location = request.form.get('location')
        address = request.form.get('address')
        phone = request.form.get('phone')
        email = request.form.get('email')
        
        # Validate required fields
        if not name or not code:
            flash('Name and code are required fields.', 'danger')
            return redirect(url_for('store.add_store'))
        
        # Check if code already exists
        existing_store = Store.query.filter_by(code=code).first()
        if existing_store:
            flash(f'A store with code {code} already exists.', 'danger')
            return redirect(url_for('store.add_store'))
        
        # Create new store
        store = Store(
            name=name,
            code=code,
            location=location,
            address=address,
            phone=phone,
            email=email,
            is_active=True
        )
        
        db.session.add(store)
        db.session.commit()
        
        flash(f'Store {name} has been created successfully.', 'success')
        return redirect(url_for('store.list_stores'))
    
    return render_template('store/add.html')


@bp.route('/<int:store_id>/edit', methods=['GET', 'POST'])
@login_required
def edit_store(store_id):
    """Edit an existing store"""
    # Only admin can edit stores
    if current_user.role.name != 'admin':
        flash('Only administrators can edit stores.', 'danger')
        return redirect(url_for('store.select_store'))
    
    store = Store.query.get_or_404(store_id)
    
    if request.method == 'POST':
        name = request.form.get('name')
        code = request.form.get('code')
        location = request.form.get('location')
        address = request.form.get('address')
        phone = request.form.get('phone')
        email = request.form.get('email')
        is_active = 'is_active' in request.form
        
        # Validate required fields
        if not name or not code:
            flash('Name and code are required fields.', 'danger')
            return redirect(url_for('store.edit_store', store_id=store_id))
        
        # Check if code already exists and it's not this store
        existing_store = Store.query.filter_by(code=code).first()
        if existing_store and existing_store.id != store_id:
            flash(f'A store with code {code} already exists.', 'danger')
            return redirect(url_for('store.edit_store', store_id=store_id))
        
        # Update store
        store.name = name
        store.code = code
        store.location = location
        store.address = address
        store.phone = phone
        store.email = email
        store.is_active = is_active
        
        db.session.commit()
        
        flash(f'Store {name} has been updated successfully.', 'success')
        return redirect(url_for('store.list_stores'))
    
    return render_template('store/edit.html', store=store)


@bp.route('/<int:store_id>/permissions')
@login_required
def store_permissions(store_id):
    """Manage user permissions for a store"""
    # Only admin can manage permissions
    if current_user.role.name != 'admin':
        flash('Only administrators can manage store permissions.', 'danger')
        return redirect(url_for('store.select_store'))
    
    store = Store.query.get_or_404(store_id)
    users = User.query.all()
    
    # Get existing permissions
    permissions = StorePermission.query.filter_by(store_id=store_id).all()
    
    return render_template('store/permissions.html', 
                          store=store, 
                          users=users, 
                          permissions=permissions)


@bp.route('/<int:store_id>/permissions/add', methods=['POST'])
@login_required
def add_permission(store_id):
    """Add a user permission to a store"""
    # Only admin can manage permissions
    if current_user.role.name != 'admin':
        flash('Only administrators can manage store permissions.', 'danger')
        return redirect(url_for('store.select_store'))
    
    user_id = request.form.get('user_id')
    permission_level = request.form.get('permission_level')
    
    # Validate inputs
    if not user_id or not permission_level:
        flash('User and permission level are required.', 'danger')
        return redirect(url_for('store.store_permissions', store_id=store_id))
    
    # Check if user exists
    user = User.query.get(user_id)
    if not user:
        flash('Selected user does not exist.', 'danger')
        return redirect(url_for('store.store_permissions', store_id=store_id))
    
    # Check if permission already exists
    existing_perm = StorePermission.query.filter_by(
        user_id=user_id, store_id=store_id
    ).first()
    
    if existing_perm:
        # Update existing permission
        existing_perm.permission_level = permission_level
        flash(f'Permission updated for {user.username}.', 'success')
    else:
        # Create new permission
        permission = StorePermission(
            user_id=user_id,
            store_id=store_id,
            permission_level=permission_level
        )
        db.session.add(permission)
        flash(f'Permission added for {user.username}.', 'success')
    
    db.session.commit()
    return redirect(url_for('store.store_permissions', store_id=store_id))


@bp.route('/<int:store_id>/permissions/<int:permission_id>/delete')
@login_required
def delete_permission(store_id, permission_id):
    """Remove a user permission from a store"""
    # Only admin can manage permissions
    if current_user.role.name != 'admin':
        flash('Only administrators can manage store permissions.', 'danger')
        return redirect(url_for('store.select_store'))
    
    permission = StorePermission.query.get_or_404(permission_id)
    
    # Ensure permission belongs to this store
    if permission.store_id != store_id:
        flash('Invalid permission ID.', 'danger')
        return redirect(url_for('store.store_permissions', store_id=store_id))
    
    user = User.query.get(permission.user_id)
    db.session.delete(permission)
    db.session.commit()
    
    flash(f'Permission removed for {user.username}.', 'success')
    return redirect(url_for('store.store_permissions', store_id=store_id))