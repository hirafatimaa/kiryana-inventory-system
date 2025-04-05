from flask import Blueprint, render_template, redirect, url_for, flash
from flask_login import login_required, current_user

bp = Blueprint('supplier', __name__, url_prefix='/supplier')

@bp.route('/')
@login_required
def index():
    """Placeholder for supplier view"""
    return render_template('placeholder.html', title='Suppliers', message='Supplier management module will be implemented here.')
