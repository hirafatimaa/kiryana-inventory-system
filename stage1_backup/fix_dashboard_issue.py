import os

def fix_template_syntax_error():
    """Fix line 25 in base.html with the syntax error href="/"" -> href="/">"""
    path = os.path.join('stage2', 'templates', 'base.html')
    
    try:
        with open(path, 'r') as file:
            content = file.read()
        
        # Fix the syntax error in line 25
        if 'href="/""' in content:
            content = content.replace('href="/""', 'href="/">')
        
        with open(path, 'w') as file:
            file.write(content)
        
        print(f"Fixed syntax error in {path}")
        return True
    except Exception as e:
        print(f"Error fixing syntax error in {path}: {e}")
        return False

if __name__ == "__main__":
    fix_template_syntax_error()