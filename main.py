#!/usr/bin/env python
"""
Kiryana Inventory System - Main Entry Point

This file redirects to the appropriate stage. The current active stage is Stage 2.
"""

import os
import sys

# For gunicorn, we need to expose the Flask app directly
# Import the app from stage2
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'stage2'))

try:
    from stage2.app import create_app
    app = create_app()
except ImportError:
    # If stage2 module isn't found, try direct import
    sys.path.insert(0, 'stage2')
    from app import create_app
    app = create_app()

# Only run the interactive menu when executed directly
if __name__ == "__main__":
    print("Kiryana Inventory System")
    print("------------------------")
    print("1. Stage 2: Multi-store Flask application")
    print("2. Stage 3: Microservices architecture")
    print()
    choice = input("Please select a stage to run (1-2), or press Enter for Stage 2: ")

    if not choice or choice == "1":
        print("\nStarting Stage 2 (Multi-store Flask application)...")
        # Change directory to stage2 and run its main.py
        os.chdir("stage2")
        # Import and run the app
        app.run(host="0.0.0.0", port=5000, debug=True)

    elif choice == "2":
        print("\nStarting Stage 3 requires running multiple microservices.")
        print("Please use the VS Code launch configuration or run ./run_stage3.sh")
        print("Alternatively, cd into stage3 and run ./start_all_services.sh")
        sys.exit(0)

    else:
        print("Invalid choice. Please run again and select 1 or 2.")
        sys.exit(1)