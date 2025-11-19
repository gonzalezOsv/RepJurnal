#!/usr/bin/env python3
"""
Database Reset Script
Resets the database to a clean state with fresh test data
"""

import os
import sys
import subprocess

def main():
    print("🔄 Resetting database to clean state...")
    print("=" * 50)
    
    try:
        # Run the database initialization
        result = subprocess.run([
            'python', '-c', 
            'from app.initialize_data_base import initialize_database; initialize_database()'
        ], capture_output=True, text=True, cwd='/app')
        
        if result.returncode == 0:
            print("✅ Database reset successful!")
            print("\n📊 Test Users Available:")
            print("  Username: tom101    | Password: vL5MYe7HdD4bhmY##")
            print("  Username: jess101   | Password: vL5MYe7HdD4bhmY##")
            print("  Username: danny101  | Password: vL5MYe7HdD4bhmY##")
            print("\n🌐 Your app is running at: http://localhost:5000")
        else:
            print("❌ Database reset failed!")
            print("Error:", result.stderr)
            sys.exit(1)
            
    except Exception as e:
        print(f"❌ Error running database reset: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()




