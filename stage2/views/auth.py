from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import check_password_hash

from app import db
from forms import LoginForm, RegistrationForm, ChangePasswordForm
from models import User, Role, StorePermission

# Create the blueprint
bp = Blueprint('auth', __name__, url_prefix='/auth')


@bp.route('/login', methods=['GET', 'POST'])
def login():
    """User login page."""
    # Redirect if already logged in
    if current_user.is_authenticated:
        return redirect(url_for('store.select_store'))
    
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        
        # Check if user exists and password is correct
        if user and user.check_password(form.password.data):
            # Check if user is active
            if not user.is_active:
                flash('This account has been deactivated. Please contact an administrator.', 'danger')
                return render_template('auth/login.html', form=form)
            
            # Log the user in
            login_user(user, remember=form.remember_me.data)
            flash(f'Welcome back, {user.full_name}!', 'success')
            
            # Redirect to the page the user was trying to access
            next_page = request.args.get('next')
            if not next_page or next_page.startswith('/'):
                next_page = url_for('store.select_store')
            return redirect(next_page)
        else:
            flash('Invalid username or password', 'danger')
    
    return render_template('auth/login.html', title='Login', form=form)


@bp.route('/logout')
def logout():
    """Logout route."""
    logout_user()
    flash('You have been logged out', 'info')
    return redirect(url_for('auth.login'))


@bp.route('/register', methods=['GET', 'POST'])
@login_required
def register():
    """Register a new user (admin only)."""
    # Only admins can register new users
    if current_user.role.name != 'admin':
        flash('You do not have permission to register new users', 'danger')
        return redirect(url_for('store.select_store'))
    
    form = RegistrationForm()
    
    # Populate role choices from database
    form.role.choices = [(r.id, r.name) for r in Role.query.order_by(Role.name).all()]
    
    if form.validate_on_submit():
        user = User(
            username=form.username.data,
            email=form.email.data,
            first_name=form.first_name.data,
            last_name=form.last_name.data,
            role_id=form.role.data,
            is_active=True
        )
        user.set_password(form.password.data)
        
        db.session.add(user)
        db.session.commit()
        
        flash(f'User {form.username.data} has been registered!', 'success')
        return redirect(url_for('auth.manage_users'))
    
    return render_template('auth/register.html', title='Register New User', form=form)


@bp.route('/change-password', methods=['GET', 'POST'])
@login_required
def change_password():
    """Change password page."""
    form = ChangePasswordForm()
    
    if form.validate_on_submit():
        # Verify current password
        if not current_user.check_password(form.current_password.data):
            flash('Current password is incorrect', 'danger')
            return render_template('auth/change_password.html', form=form)
        
        # Update password
        current_user.set_password(form.new_password.data)
        db.session.commit()
        
        flash('Your password has been updated', 'success')
        return redirect(url_for('store.select_store'))
    
    return render_template('auth/change_password.html', title='Change Password', form=form)


@bp.route('/users')
@login_required
def manage_users():
    """User management page (admin only)."""
    # Only admins can manage users
    if current_user.role.name != 'admin':
        flash('You do not have permission to manage users', 'danger')
        return redirect(url_for('store.select_store'))
    
    users = User.query.all()
    return render_template('auth/users.html', title='Manage Users', users=users)


@bp.route('/users/<int:user_id>/edit', methods=['GET', 'POST'])
@login_required
def edit_user(user_id):
    """Edit user page (admin only)."""
    # Only admins can edit users
    if current_user.role.name != 'admin':
        flash('You do not have permission to edit users', 'danger')
        return redirect(url_for('store.select_store'))
    
    user = User.query.get_or_404(user_id)
    form = RegistrationForm(obj=user)
    
    # Populate role choices from database
    form.role.choices = [(r.id, r.name) for r in Role.query.order_by(Role.name).all()]
    
    # Don't require password for editing
    form.password.validators = []
    form.confirm_password.validators = []
    
    if form.validate_on_submit():
        user.username = form.username.data
        user.email = form.email.data
        user.first_name = form.first_name.data
        user.last_name = form.last_name.data
        user.role_id = form.role.data
        
        # Only update password if provided
        if form.password.data:
            user.set_password(form.password.data)
        
        db.session.commit()
        
        flash(f'User {user.username} has been updated!', 'success')
        return redirect(url_for('auth.manage_users'))
    
    return render_template('auth/edit_user.html', title='Edit User', form=form, user=user)


@bp.route('/users/<int:user_id>/toggle', methods=['POST'])
@login_required
def toggle_user_active(user_id):
    """Toggle user active status (admin only)."""
    # Only admins can toggle user status
    if current_user.role.name != 'admin':
        flash('You do not have permission to change user status', 'danger')
        return redirect(url_for('store.select_store'))
    
    # Don't allow deactivating own account
    if user_id == current_user.id:
        flash('You cannot deactivate your own account', 'danger')
        return redirect(url_for('auth.manage_users'))
    
    user = User.query.get_or_404(user_id)
    user.is_active = not user.is_active
    db.session.commit()
    
    status = 'activated' if user.is_active else 'deactivated'
    flash(f'User {user.username} has been {status}', 'success')
    
    return redirect(url_for('auth.manage_users'))


@bp.route('/users/<int:user_id>/stores', methods=['GET', 'POST'])
@login_required
def user_store_permissions(user_id):
    """Manage user store permissions (admin only)."""
    # Only admins can manage store permissions
    if current_user.role.name != 'admin':
        flash('You do not have permission to manage store permissions', 'danger')
        return redirect(url_for('store.select_store'))
    
    user = User.query.get_or_404(user_id)
    
    # Admin users don't need store permissions (they have access to all)
    if user.role.name == 'admin':
        flash('Admin users have access to all stores by default', 'info')
        return redirect(url_for('auth.manage_users'))
    
    # Get all stores and user's existing permissions
    from models import Store
    stores = Store.query.filter_by(is_active=True).all()
    
    # Handle form submission (adding/updating permissions)
    if request.method == 'POST':
        # Clear existing permissions first
        StorePermission.query.filter_by(user_id=user.id).delete()
        
        # Add new permissions based on form data
        for store in stores:
            store_id_str = str(store.id)
            if store_id_str in request.form:
                permission_level = request.form.get(f'permission_level_{store.id}', 'read')
                
                # Create new permission
                permission = StorePermission(
                    user_id=user.id,
                    store_id=store.id,
                    permission_level=permission_level
                )
                db.session.add(permission)
        
        db.session.commit()
        flash(f'Store permissions updated for {user.username}', 'success')
        return redirect(url_for('auth.manage_users'))
    
    # Get existing permissions for form display
    user_permissions = {p.store_id: p.permission_level for p in user.store_permissions}
    
    return render_template('auth/user_store_permissions.html', 
                          title=f'Store Permissions for {user.username}',
                          user=user, 
                          stores=stores, 
                          user_permissions=user_permissions)