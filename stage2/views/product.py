from flask import Blueprint, render_template, redirect, url_for, flash
from flask_login import login_required, current_user

bp = Blueprint('product', __name__, url_prefix='/product')

@bp.route('/')
@login_required
def index():
    """Placeholder for product view"""
    return render_template('placeholder.html', title='Products', message='Product management module will be implemented here.')
