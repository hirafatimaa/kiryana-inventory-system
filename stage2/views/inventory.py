from flask import Blueprint, render_template, redirect, url_for, flash
from flask_login import login_required, current_user

bp = Blueprint('inventory', __name__, url_prefix='/inventory')

@bp.route('/')
@login_required
def index():
    """Placeholder for inventory view"""
    return render_template('placeholder.html', title='Inventory', message='Inventory management module will be implemented here.')
