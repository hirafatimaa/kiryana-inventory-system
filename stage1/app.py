import os
import logging
from datetime import datetime
from flask import Flask, g, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from werkzeug.middleware.proxy_fix import ProxyFix
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Define base model class
class Base(DeclarativeBase):
    pass

# Initialize SQLAlchemy with the model class
db = SQLAlchemy(model_class=Base)

# Create the Flask application
app = Flask(__name__)

# Set the secret key from environment variable
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "default_development_key")

# Fix for reverse proxies
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Get database URL from environment or use a default for development
database_url = os.environ.get("DATABASE_URL")
if not database_url:
    logger.warning("DATABASE_URL not found in environment, using default SQLite database")
    database_url = "sqlite:///kiryana.db"

# Configure the database connection
app.config["SQLALCHEMY_DATABASE_URI"] = database_url
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Initialize the app with the extension
db.init_app(app)

# Import models and create database tables
with app.app_context():
    # Import models here to avoid circular imports
    try:
        import models
        db.create_all()
        logger.info("Database tables created")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")

# Import and register views
try:
    from views import register_views
    register_views(app)
    logger.info("Views registered")
except Exception as e:
    logger.error(f"Error registering views: {e}")

# Default route
@app.route('/')
def home():
    return redirect(url_for('index'))

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
