import os
import subprocess

def fix_all_issues():
    """Run all fix scripts to solve template issues"""
    # First run the datetime context processor fix
    print("Adding context processor for 'now' variable...")
    subprocess.run(['python', 'context_processor.py'])
    
    # Then fix template URL issues
    print("Fixing template URL issues...")
    subprocess.run(['python', 'fix_templates.py'])
    
    # Then fix any syntax errors
    print("Fixing syntax errors in templates...")
    subprocess.run(['python', 'fix_dashboard_issue.py'])
    
    print("\nAll fixes have been applied!")
    print("The following issues were fixed:")
    print("1. Fixed 'now is undefined' error by adding a context processor")
    print("2. Fixed URL building errors by replacing dynamic URLs with static ones")
    print("3. Fixed syntax error in the dashboard link")
    print("\nYou can now run the application with:")
    print("gunicorn --bind 0.0.0.0:5000 --reuse-port --reload main:app")

if __name__ == "__main__":
    fix_all_issues()