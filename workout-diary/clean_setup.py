#!/usr/bin/env python3
"""
Clean Database Setup Script
Resets database and applies all migrations in correct order
"""

import pymysql
import os
import sys
from pathlib import Path

# ANSI color codes for terminal output
class Colors:
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    GRAY = '\033[90m'
    WHITE = '\033[97m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_header(text, color=Colors.CYAN):
    print(f"\n{color}{text}{Colors.RESET}")

def print_success(text):
    print(f"   {Colors.GREEN}✅ {text}{Colors.RESET}")

def print_error(text):
    print(f"   {Colors.RED}❌ {text}{Colors.RESET}")

def print_warning(text):
    print(f"   {Colors.YELLOW}⚠️  {text}{Colors.RESET}")

def print_info(text):
    print(f"   {Colors.GRAY}{text}{Colors.RESET}")

def load_env():
    """Load environment variables from .env file"""
    env_file = Path('.env')
    if env_file.exists():
        print_info("Loading .env file...")
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()
    else:
        print_warning("No .env file found, using defaults")

def get_db_config():
    """Get database configuration from environment"""
    return {
        'host': os.getenv('DB_HOST') or os.getenv('MYSQLHOST') or 'localhost',
        'port': int(os.getenv('DB_PORT') or os.getenv('MYSQLPORT') or '3306'),
        'user': os.getenv('DB_USER') or os.getenv('MYSQLUSER') or 'flaskuser',
        'password': os.getenv('DB_PASSWORD') or os.getenv('MYSQLPASSWORD') or 'flaskpassword',
        'database': os.getenv('DB_NAME') or os.getenv('MYSQL_DATABASE') or 'fitness_tracker'
    }

def execute_sql_file(connection, filepath, description):
    """Execute a SQL file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        cursor = connection.cursor()
        
        # Split by delimiter changes and statements
        statements = []
        current_statement = []
        delimiter = ';'
        
        for line in sql_content.split('\n'):
            # Handle DELIMITER changes
            if line.strip().upper().startswith('DELIMITER'):
                if current_statement:
                    statements.append('\n'.join(current_statement))
                    current_statement = []
                delimiter = line.strip().split()[-1]
                continue
            
            current_statement.append(line)
            
            # Check if we hit the delimiter
            if line.strip().endswith(delimiter) and delimiter != ';':
                statements.append('\n'.join(current_statement))
                current_statement = []
                delimiter = ';'
            elif delimiter == ';' and line.strip().endswith(';'):
                statements.append('\n'.join(current_statement))
                current_statement = []
        
        # Add remaining statement
        if current_statement:
            statements.append('\n'.join(current_statement))
        
        # Execute each statement
        for statement in statements:
            statement = statement.strip()
            if statement and not statement.startswith('--'):
                try:
                    cursor.execute(statement)
                except Exception as e:
                    # Only show error if it's not a "already exists" warning
                    if "already exists" not in str(e).lower():
                        print_warning(f"Query warning: {str(e)[:100]}")
        
        connection.commit()
        cursor.close()
        print_success(description)
        return True
        
    except Exception as e:
        print_error(f"{description} failed: {str(e)[:200]}")
        return False

def main():
    print_header("🔄 CLEAN DATABASE SETUP", Colors.BOLD + Colors.CYAN)
    print(Colors.GRAY + "=" * 70 + Colors.RESET)
    
    # Load environment
    load_env()
    db_config = get_db_config()
    
    print_header("📊 Database Configuration:")
    print_info(f"Host: {db_config['host']}:{db_config['port']}")
    print_info(f"User: {db_config['user']}")
    print_info(f"Database: {db_config['database']}")
    
    # Confirm
    print(f"\n{Colors.RED}⚠️  WARNING: This will DROP ALL TABLES and reset the database!{Colors.RESET}")
    confirm = input(f"{Colors.YELLOW}Type 'yes' to continue: {Colors.RESET}")
    
    if confirm.lower() != 'yes':
        print_error("Setup cancelled by user")
        sys.exit(0)
    
    try:
        # Connect without database first to drop/create it
        print_header("🔌 Connecting to MySQL server...")
        connection = pymysql.connect(
            host=db_config['host'],
            port=db_config['port'],
            user=db_config['user'],
            password=db_config['password']
        )
        print_success("Connected to MySQL server")
        
        # Drop and create database
        print_header("🗑️  Step 1: Resetting Database...")
        cursor = connection.cursor()
        cursor.execute(f"DROP DATABASE IF EXISTS {db_config['database']}")
        cursor.execute(f"CREATE DATABASE {db_config['database']} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        cursor.execute(f"USE {db_config['database']}")
        cursor.close()
        connection.select_db(db_config['database'])
        print_success("Database reset complete")
        
        # Step 2: Base schema
        print_header("🏗️  Step 2: Creating Base Schema...")
        execute_sql_file(connection, 'scripts/init_db.sql', 'Base schema created')
        
        # Step 3: Run migrations in order
        print_header("🔧 Step 3: Running Migrations...")
        migrations = [
            ('scripts/migration_routines.sql', 'Routines migration'),
            ('scripts/migration_social.sql', 'Social features migration'),
            ('scripts/migration_add_tracked_exercises.sql', 'Tracked exercises migration'),
            ('scripts/migration_routines_import.sql', 'Routine import migration'),
            ('migrations/add_routine_stats.sql', '✨ Stats system migration (NEW)'),
        ]
        
        for filepath, description in migrations:
            if Path(filepath).exists():
                execute_sql_file(connection, filepath, description)
            else:
                print_warning(f"Skipping: {filepath} (not found)")
        
        # Step 4: Load test data
        print_header("🌱 Step 4: Loading Test Data...")
        execute_sql_file(connection, 'scripts/test_data.sql', 'Test data loaded')
        
        # Step 5: Load quotes
        print_header("📜 Step 5: Loading Motivational Quotes...")
        if Path('scripts/init_quotes.sql').exists():
            execute_sql_file(connection, 'scripts/init_quotes.sql', 'Quotes loaded')
        else:
            print_warning("Quotes file not found (optional)")
        
        # Step 6: Verify setup
        print_header("🔍 Step 6: Verifying Setup...")
        cursor = connection.cursor()
        
        # Count records in each table
        tables_to_check = [
            'Users',
            'WorkoutRoutines',
            'RoutineStats',
            'UserRoutineStats',
            'Friends',
            'BodyParts',
            'StandardExercises'
        ]
        
        for table in tables_to_check:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                print_info(f"{table}: {count} records")
            except:
                print_warning(f"{table}: Table may not exist")
        
        cursor.close()
        connection.close()
        
        # Success message
        print("\n" + Colors.GRAY + "=" * 70 + Colors.RESET)
        print(f"{Colors.GREEN}{Colors.BOLD}✅ SETUP COMPLETE!{Colors.RESET}")
        print("")
        
        print_header("📊 Test Users Available:", Colors.CYAN)
        print(f"   {Colors.WHITE}Username: tom101    | Password: vL5MYe7HdD4bhmY##{Colors.RESET}")
        print(f"   {Colors.WHITE}Username: jess101   | Password: vL5MYe7HdD4bhmY##{Colors.RESET}")
        print(f"   {Colors.WHITE}Username: danny101  | Password: vL5MYe7HdD4bhmY##{Colors.RESET}")
        
        print_header("🚀 Next Steps:", Colors.CYAN)
        print(f"   {Colors.WHITE}1. Start your Flask app: python app.py{Colors.RESET}")
        print(f"   {Colors.WHITE}2. Visit: http://localhost:5000{Colors.RESET}")
        print(f"   {Colors.WHITE}3. Login with a test user{Colors.RESET}")
        print(f"   {Colors.WHITE}4. Create routines and see stats! 📊{Colors.RESET}")
        
        print("\n" + Colors.GRAY + "=" * 70 + Colors.RESET + "\n")
        
    except pymysql.Error as e:
        print_error(f"Database error: {e}")
        sys.exit(1)
    except Exception as e:
        print_error(f"Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()



