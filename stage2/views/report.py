from flask import Blueprint, render_template, redirect, url_for, flash
from flask_login import login_required, current_user

bp = Blueprint('report', __name__, url_prefix='/report')

@bp.route('/')
@login_required
def index():
    """Placeholder for report view"""
    return render_template('placeholder.html', title='Reports', message='Reporting module will be implemented here.')
