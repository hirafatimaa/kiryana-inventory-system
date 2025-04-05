from flask import Blueprint, flash, redirect, render_template, request, url_for
from flask_login import current_user, login_required, login_user, logout_user
from werkzeug.security import check_password_hash, generate_password_hash

from app import db
from models import Role, User

# Create blueprint
bp = Blueprint('auth', __name__, url_prefix='/auth')


@bp.route('/login', methods=['GET', 'POST'])
def login():
    """User login page"""
    # If already logged in, redirect to store selection
    if current_user.is_authenticated:
        return redirect(url_for('store.select_store'))
    
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        remember = 'remember' in request.form
        
        # Validate inputs
        if not username or not password:
            flash('Username and password are required.', 'danger')
            return redirect(url_for('auth.login'))
        
        # Find user by username
        user = User.query.filter_by(username=username).first()
        
        # Check if user exists and password is correct
        if not user or not user.check_password(password):
            flash('Invalid username or password.', 'danger')
            return redirect(url_for('auth.login'))
        
        # Check if user is active
        if not user.is_active:
            flash('This account has been disabled. Please contact an administrator.', 'danger')
            return redirect(url_for('auth.login'))
        
        # Log in the user
        login_user(user, remember=remember)
        flash(f'Welcome back, {user.full_name}!', 'success')
        
        # Redirect to the page they were trying to access, or store selection
        next_page = request.args.get('next')
        if next_page:
            return redirect(next_page)
        return redirect(url_for('store.select_store'))
    
    return render_template('auth/login.html')


@bp.route('/logout')
@login_required
def logout():
    """Log out the current user"""
    logout_user()
    flash('You have been logged out.', 'info')
    return redirect(url_for('auth.login'))


@bp.route('/profile')
@login_required
def profile():
    """View user profile"""
    return render_template('auth/profile.html')


@bp.route('/profile/edit', methods=['GET', 'POST'])
@login_required
def edit_profile():
    """Edit user profile"""
    if request.method == 'POST':
        first_name = request.form.get('first_name')
        last_name = request.form.get('last_name')
        email = request.form.get('email')
        current_password = request.form.get('current_password')
        new_password = request.form.get('new_password')
        confirm_password = request.form.get('confirm_password')
        
        # Validate email
        if email and email != current_user.email:
            # Check if email is already taken
            existing_user = User.query.filter_by(email=email).first()
            if existing_user and existing_user.id != current_user.id:
                flash('Email is already in use by another account.', 'danger')
                return redirect(url_for('auth.edit_profile'))
            
            current_user.email = email
        
        # Update names
        if first_name:
            current_user.first_name = first_name
        if last_name:
            current_user.last_name = last_name
        
        # Change password if requested
        if current_password and new_password:
            # Check if current password is correct
            if not current_user.check_password(current_password):
                flash('Current password is incorrect.', 'danger')
                return redirect(url_for('auth.edit_profile'))
            
            # Validate new password
            if len(new_password) < 8:
                flash('New password must be at least 8 characters long.', 'danger')
                return redirect(url_for('auth.edit_profile'))
            
            if new_password != confirm_password:
                flash('New password and confirmation do not match.', 'danger')
                return redirect(url_for('auth.edit_profile'))
            
            # Set new password
            current_user.set_password(new_password)
            flash('Password updated successfully.', 'success')
        
        # Save changes
        db.session.commit()
        flash('Profile updated successfully.', 'success')
        return redirect(url_for('auth.profile'))
    
    return render_template('auth/edit_profile.html')


@bp.route('/users')
@login_required
def list_users():
    """List all users (admin only)"""
    # Only admins can see user list
    if current_user.role.name != 'admin':
        flash('You do not have permission to access this page.', 'danger')
        return redirect(url_for('store.select_store'))
    
    users = User.query.all()
    return render_template('auth/list_users.html', users=users)


@bp.route('/users/add', methods=['GET', 'POST'])
@login_required
def add_user():
    """Add a new user (admin only)"""
    # Only admins can add users
    if current_user.role.name != 'admin':
        flash('You do not have permission to access this page.', 'danger')
        return redirect(url_for('store.select_store'))
    
    roles = Role.query.all()
    
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        first_name = request.form.get('first_name')
        last_name = request.form.get('last_name')
        password = request.form.get('password')
        role_id = request.form.get('role_id')
        is_active = 'is_active' in request.form
        
        # Validate required fields
        if not username or not email or not password or not role_id:
            flash('Username, email, password, and role are required.', 'danger')
            return redirect(url_for('auth.add_user'))
        
        # Check if username is already taken
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            flash('Username is already taken.', 'danger')
            return redirect(url_for('auth.add_user'))
        
        # Check if email is already taken
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            flash('Email is already registered.', 'danger')
            return redirect(url_for('auth.add_user'))
        
        # Create new user
        user = User(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name,
            role_id=role_id,
            is_active=is_active
        )
        user.set_password(password)
        
        db.session.add(user)
        db.session.commit()
        
        flash(f'User {username} has been created successfully.', 'success')
        return redirect(url_for('auth.list_users'))
    
    return render_template('auth/add_user.html', roles=roles)


@bp.route('/users/edit/<int:user_id>', methods=['GET', 'POST'])
@login_required
def edit_user(user_id):
    """Edit an existing user (admin only)"""
    # Only admins can edit users
    if current_user.role.name != 'admin':
        flash('You do not have permission to access this page.', 'danger')
        return redirect(url_for('store.select_store'))
    
    user = User.query.get_or_404(user_id)
    roles = Role.query.all()
    
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        first_name = request.form.get('first_name')
        last_name = request.form.get('last_name')
        role_id = request.form.get('role_id')
        is_active = 'is_active' in request.form
        new_password = request.form.get('new_password')
        
        # Validate required fields
        if not username or not email or not role_id:
            flash('Username, email, and role are required.', 'danger')
            return redirect(url_for('auth.edit_user', user_id=user_id))
        
        # Check if username is already taken by another user
        existing_user = User.query.filter_by(username=username).first()
        if existing_user and existing_user.id != user_id:
            flash('Username is already taken.', 'danger')
            return redirect(url_for('auth.edit_user', user_id=user_id))
        
        # Check if email is already taken by another user
        existing_user = User.query.filter_by(email=email).first()
        if existing_user and existing_user.id != user_id:
            flash('Email is already registered.', 'danger')
            return redirect(url_for('auth.edit_user', user_id=user_id))
        
        # Update user
        user.username = username
        user.email = email
        user.first_name = first_name
        user.last_name = last_name
        user.role_id = role_id
        user.is_active = is_active
        
        # Set new password if provided
        if new_password:
            user.set_password(new_password)
        
        db.session.commit()
        
        flash(f'User {username} has been updated successfully.', 'success')
        return redirect(url_for('auth.list_users'))
    
    return render_template('auth/edit_user.html', user=user, roles=roles)