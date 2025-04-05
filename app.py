import os
import logging
from dotenv import load_dotenv
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from werkzeug.middleware.proxy_fix import ProxyFix

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Create database base class
class Base(DeclarativeBase):
    pass

# Initialize SQLAlchemy with the base class
db = SQLAlchemy(model_class=Base)

# Create Flask application
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "inventory_tracking_secret")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)  # needed for url_for to generate with https

# Configure application settings from environment variables
app.config['DEBUG'] = os.environ.get("FLASK_DEBUG", "1") == "1"
app.config['FLASK_ENV'] = os.environ.get("FLASK_ENV", "development")

# Configure database
# Use PostgreSQL database provided by the environment
database_url = os.environ.get("DATABASE_URL")
app.config["SQLALCHEMY_DATABASE_URI"] = database_url
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Initialize database with the app
db.init_app(app)

# Import routes
with app.app_context():
    # Import models
    from models import Product, InventoryMovement, Store

    # Create database tables
    db.create_all()
    logger.info("Database tables created")

    # Create default store if it doesn't exist (for Phase 1)
    default_store_name = os.environ.get("DEFAULT_STORE_NAME", "Main Store")
    default_store_location = os.environ.get("DEFAULT_STORE_LOCATION", "Primary Location")
    
    default_store = Store.query.filter_by(name=default_store_name).first()
    if not default_store:
        default_store = Store(name=default_store_name, location=default_store_location)
        db.session.add(default_store)
        db.session.commit()
        logger.info(f"Default store created: {default_store_name} at {default_store_location}")

    # Import views and register blueprints
    from views import register_views
    register_views(app)
    logger.info("Views registered")
