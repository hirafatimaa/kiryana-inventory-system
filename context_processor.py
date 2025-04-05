import os
from datetime import datetime

def add_context_processor():
    """Add a context processor to app.py"""
    path = os.path.join('stage2', 'app.py')
    
    try:
        with open(path, 'r') as file:
            content = file.read()
        
        # Check if datetime is already imported
        if 'from datetime import datetime' not in content:
            # Add datetime import
            content = content.replace(
                'from flask import Flask',
                'from flask import Flask\nfrom datetime import datetime'
            )
        
        # Add context processor if not already present
        if '@app.context_processor\ndef inject_now():' not in content:
            # Find a good spot to insert context processor - after app creation but before routes
            insertion_point = 'app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)'
            
            context_processor = '''
    # Add datetime to all templates
    @app.context_processor
    def inject_now():
        return {'now': datetime.utcnow()}
'''
            
            content = content.replace(
                insertion_point,
                insertion_point + context_processor
            )
        
        with open(path, 'w') as file:
            file.write(content)
        
        return True
    except Exception as e:
        print(f"Error adding context processor to {path}: {e}")
        return False

if __name__ == "__main__":
    if add_context_processor():
        print("Successfully added context processor")
    else:
        print("Failed to add context processor")