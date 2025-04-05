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
        
        # Replace URL building with static URLs
        content = content.replace('url_for(\'store.dashboard\')', '\'\/\'')
        content = content.replace('url_for(\'product.products\')', '\'\/products\'')
        content = content.replace('url_for(\'inventory.stock_in\')', '\'\/stock_in\'')
        content = content.replace('url_for(\'inventory.sales\')', '\'\/sales\'')
        content = content.replace('url_for(\'inventory.removals\')', '\'\/removals\'')
        content = content.replace('url_for(\'inventory.transfers\')', '\'\/inventory\/transfers\'')
        content = content.replace('url_for(\'inventory.current\')', '\'\/inventory\'')
        content = content.replace('url_for(\'supplier.suppliers\')', '\'\/suppliers\'')
        content = content.replace('url_for(\'supplier.purchase_orders\')', '\'\/purchase_orders\'')
        content = content.replace('url_for(\'report.inventory_movements\')', '\'\/reports\/inventory\'')
        content = content.replace('url_for(\'report.sales_report\')', '\'\/reports\/sales\'')
        content = content.replace('url_for(\'report.low_stock\')', '\'\/reports\/low_stock\'')
        content = content.replace('url_for(\'report.valuation\')', '\'\/reports\/valuation\'')
        content = content.replace('url_for(\'store.manage_stores\')', '\'\/stores\/manage\'')
        content = content.replace('url_for(\'auth.manage_users\')', '\'\/users\/manage\'')
        content = content.replace('url_for(\'api.api_documentation\')', '\'\/api\/docs\'')
        content = content.replace('url_for(\'auth.change_password\')', '\'\/auth\/change_password\'')
        content = content.replace('url_for(\'auth.logout\')', '\'\/auth\/logout\'')
        content = content.replace('url_for(\'store.select_store\')', '\'\/store\/select\'')
        
        # Fix any remaining url_for endpoints
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
        content = content.replace('url_for(\'store.select_store\')', '\'\/store\/select\'')
        
        with open(path, 'w') as file:
            file.write(content)
        
        return True
    except Exception as e:
        print(f"Error fixing {path}: {e}")
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