import os
import logging
from datetime import datetime
from dotenv import load_dotenv

from flask import Flask, g, redirect, request, session, url_for
from flask_login import LoginManager, current_user
from flask_sqlalchemy import SQLAlchemy
from flask_wtf.csrf import CSRFProtect
from sqlalchemy.orm import DeclarativeBase
from werkzeug.middleware.proxy_fix import ProxyFix

# Load environment variables from .env file
load_dotenv()

# Initialize logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


# Set up SQLAlchemy with a base class for declarative models
class Base(DeclarativeBase):
    pass


# Initialize extensions
db = SQLAlchemy(model_class=Base)
csrf = CSRFProtect()
login_manager = LoginManager()


def create_app():
    """Create and configure the Flask application"""
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = os.environ.get("SESSION_SECRET", "inventory_tracking_system_stage2_key")
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get("DATABASE_URL")
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        "pool_recycle": 300,
        "pool_pre_ping": True,
    }
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Additional configuration from environment variables
    app.config['DEBUG'] = os.environ.get("FLASK_DEBUG", "1") == "1"
    app.config['FLASK_ENV'] = os.environ.get("FLASK_ENV", "development")
    
    # Enable proxy fix for proper URL generation behind proxies
    app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)
    # Add datetime to all templates
    @app.context_processor
    def inject_now():
        return {'now': datetime.utcnow()}

    
    # Initialize extensions with app
    db.init_app(app)
    csrf.init_app(app)
    login_manager.init_app(app)
    
    # Configure login manager
    login_manager.login_view = 'auth.login'
    login_manager.login_message = 'Please log in to access this page.'
    login_manager.login_message_category = 'info'
    
    # Import User model for login manager
    from models import User
    
    @login_manager.user_loader
    def load_user(user_id):
        """Load user by ID for Flask-Login"""
        return User.query.get(int(user_id))
    
    # Process before request
    @app.before_request
    def before_request():
        """Run before each request"""
        g.user = current_user
        
        # Update session timeout
        session.permanent = True
        
        # Update last seen for logged in users
        if current_user.is_authenticated:
            current_user.last_login = datetime.utcnow()
            db.session.commit()
        
        # Store permission checks
        if request.endpoint and 'store_id' in request.view_args:
            store_id = request.view_args['store_id']
            
            # If not admin and no access to this store, redirect to store selection
            if current_user.is_authenticated and not current_user.has_store_access(store_id):
                return redirect(url_for('store.select_store'))
    
    # Register blueprints
    with app.app_context():
        # Ensure models are imported before creating tables
        from models import StorePermission  # noqa

        # Create database tables if they don't exist
        db.create_all()
        
        # Register blueprints
        from views.auth import bp as auth_bp
        from views.store import bp as store_bp
        from views.product import bp as product_bp
        from views.inventory import bp as inventory_bp
        from views.supplier import bp as supplier_bp
        from views.report import bp as report_bp
        from views.api import bp as api_bp
        
        app.register_blueprint(auth_bp)
        app.register_blueprint(store_bp)
        app.register_blueprint(product_bp)
        app.register_blueprint(inventory_bp)
        app.register_blueprint(supplier_bp)
        app.register_blueprint(report_bp)
        app.register_blueprint(api_bp)
        
        # Register a root route
        @app.route('/')
        def index():
            """Home page redirects to store selection or dashboard"""
            if current_user.is_authenticated:
                return redirect(url_for('store.select_store'))
            return redirect(url_for('auth.login'))
        
        # Initialize roles and admin account if not existing
        init_admin_and_roles(app)
    
    return app


def init_admin_and_roles(app):
    """Initialize default roles and admin account if not existing"""
    from models import Role, User
    
    # Create default roles if they don't exist
    roles = {
        'admin': 'Full system administrator with all permissions',
        'manager': 'Store manager with full access to assigned stores',
        'staff': 'Store staff with limited access to assigned stores'
    }
    
    for role_name, description in roles.items():
        role = Role.query.filter_by(name=role_name).first()
        if not role:
            app.logger.info(f"Creating role: {role_name}")
            role = Role(name=role_name, description=description)
            db.session.add(role)
    
    # Create admin user if no users exist
    if User.query.count() == 0:
        admin_role = Role.query.filter_by(name='admin').first()
        if admin_role:
            admin_username = os.environ.get("ADMIN_USERNAME", "admin")
            admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
            admin_password = os.environ.get("ADMIN_PASSWORD", "admin_secure_password")
            
            app.logger.info(f"Creating default admin user: {admin_username}")
            admin = User(
                username=admin_username,
                email=admin_email,
                first_name='Admin',
                role_id=admin_role.id,
                is_active=True
            )
            admin.set_password(admin_password)
            db.session.add(admin)
    
    db.session.commit()


# Create the application instance
app = create_app()