import os

def fix_base_html():
    """Fix the base.html template file with corrected links"""
    path = os.path.join('stage2', 'templates', 'base.html')
    
    try:
        with open(path, 'r') as file:
            content = file.read()
        
        # Fix footer to use hardcoded year
        content = content.replace(
            '<small>&copy; {{ now.year }} Kiryana Inventory System - Multi-Store Edition</small>',
            '<small>&copy; 2025 Kiryana Inventory System - Multi-Store Edition</small>'
        )
        
        # Replace URL building with static URLs based on actual routes
        # First, fix all store.dashboard routes
        content = content.replace('url_for(\'store.dashboard\')', '\'\/\'')
        
        # Fix product routes
        content = content.replace('url_for(\'product.products\')', '\'\/products\'')
        
        # Fix inventory routes
        content = content.replace('url_for(\'inventory.stock_in\')', '\'\/stock-in\'')
        content = content.replace('url_for(\'inventory.sales\')', '\'\/sales\'')
        content = content.replace('url_for(\'inventory.removals\')', '\'\/removals\'')
        content = content.replace('url_for(\'inventory.transfers\')', '\'\/inventory\/transfers\'')
        content = content.replace('url_for(\'inventory.current\')', '\'\/inventory\'')
        
        # Fix supplier routes
        content = content.replace('url_for(\'supplier.suppliers\')', '\'\/suppliers\'')
        content = content.replace('url_for(\'supplier.purchase_orders\')', '\'\/purchase-orders\'')
        
        # Fix report routes
        content = content.replace('url_for(\'report.inventory_movements\')', '\'\/reports\'')
        content = content.replace('url_for(\'report.sales_report\')', '\'\/reports\'')
        content = content.replace('url_for(\'report.low_stock\')', '\'\/reports\'')
        content = content.replace('url_for(\'report.valuation\')', '\'\/reports\'')
        
        # Fix admin routes
        content = content.replace('url_for(\'store.manage_stores\')', '\'\/stores\'')
        content = content.replace('url_for(\'auth.manage_users\')', '\'\/users\'')
        content = content.replace('url_for(\'api.api_documentation\')', '\'\/api\/docs\'')
        
        # Fix auth routes
        content = content.replace('url_for(\'auth.change_password\')', '\'\/change-password\'')
        content = content.replace('url_for(\'auth.logout\')', '\'\/logout\'')
        content = content.replace('url_for(\'store.select_store\')', '\'\/store-select\'')
        
        # Fix any other url_for endpoints
        content = content.replace('url_for(\'main.index\')', '\'\/\'')
        content = content.replace('url_for(\'index\')', '\'\/\'')
        
        with open(path, 'w') as file:
            file.write(content)
        
        return True
    except Exception as e:
        print(f"Error fixing {path}: {e}")
        return False

def fix_store_select_html():
    """Fix the store/select_store.html template file"""
    path = os.path.join('stage2', 'templates', 'store', 'select_store.html')
    
    try:
        with open(path, 'r') as file:
            content = file.read()
        
        # Replace URL building with static URLs
        content = content.replace('url_for(\'store.select_store\')', '\'\/store-select\'')
        
        with open(path, 'w') as file:
            file.write(content)
        
        return True
    except Exception as e:
        print(f"Error fixing {path}: {e}")
        return False

def add_routes_file():
    """Create a new routes.py file with the correct routes for Stage 2"""
    path = os.path.join('routes.py')
    
    try:
        content = """# routes.py - Added to fix missing routes
from flask import Flask, redirect, url_for

def register_additional_routes(app):
    \"\"\"Add additional routes to handle redirects for Stage 2 links\"\"\"
    
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
"""
        
        with open(path, 'w') as file:
            file.write(content)
        
        return True
    except Exception as e:
        print(f"Error creating {path}: {e}")
        return False

if __name__ == "__main__":
    if fix_base_html():
        print("Successfully fixed base.html")
    else:
        print("Failed to fix base.html")
        
    if fix_store_select_html():
        print("Successfully fixed store/select_store.html")
    else:
        print("Failed to fix store/select_store.html")
        
    if add_routes_file():
        print("Successfully created routes.py")
    else:
        print("Failed to create routes.py")