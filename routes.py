# routes.py - Added to fix missing routes
from flask import Flask, redirect, url_for

def register_additional_routes(app):
    """Add additional routes to handle redirects for Stage 2 links"""
    
    @app.route('/products')
    def products_redirect():
        return redirect(url_for('products'))
    
    @app.route('/stock-in')
    def stock_in_redirect():
        return redirect(url_for('stock_in'))
    
    @app.route('/sales')
    def sales_redirect():
        return redirect(url_for('sales'))
    
    @app.route('/removals')
    def removals_redirect():
        return redirect(url_for('removals'))
    
    @app.route('/inventory')
    def inventory_redirect():
        return redirect(url_for('inventory'))
    
    @app.route('/reports')
    def reports_redirect():
        return redirect(url_for('reports'))
    
    @app.route('/store-select')
    def store_select_redirect():
        return redirect('/')
    
    print("Additional routes registered for compatibility with Stage 2 templates")
