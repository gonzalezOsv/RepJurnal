import pymysql
import os # Import the 'os' module

def initialize_database():
    """Initialize the database for testing by running the SQL script."""
    connection = None # Initialize connection to None
    try:
        print("initialize_database... start")
        # IMPORTANT: Change 'localhost' to your MariaDB service name in Docker Compose
        # If your docker-compose.yml has 'mariadb:', use 'mariadb' here.
        connection = pymysql.connect(
            host='mariadb',             # <--- CHANGE THIS from 'localhost'
            user='flaskuser',
            password='flaskpassword',
            database='fitness_tracker'
        )
        print("initialize_database... connected")

        # The script_path line will depend on your exact project structure.
        # Assuming 'scripts' is a directory at the same level as 'app'
        # and you're running from the root of your project:
        script_path = os.path.join('app', 'scripts', 'init_db.sql')
        # OR, if 'scripts' is inside 'app' (like app/scripts/init_db.sql)
        # and initialize_database.py is also inside 'app', then:
        # script_path = os.path.join(os.path.dirname(__file__), 'scripts', 'init_db.sql')
        # Let's assume the latter for now, as it's more robust for package structure
        script_dir = os.path.dirname(os.path.abspath(__file__))
        script_path = os.path.join(script_dir, 'scripts', 'init_db.sql')

        with connection.cursor() as cursor:
            # Check if the SQL script file exists
            if not os.path.exists(script_path):
                print(f"Error: SQL script not found at {script_path}")
                return # Exit if script not found

            with open(script_path, 'r') as f:
                sql_script = f.read()
            for statement in sql_script.split(';'):
                if statement.strip():
                    try:
                        cursor.execute(statement)
                    except pymysql.Error as sql_err:
                        print(f"Error executing SQL statement: {statement.strip()} - {sql_err}")
                        # Depending on your needs, you might want to raise the error or continue
            connection.commit()
        print("Database initialized successfully.")
    except pymysql.Error as db_err: # Catch specific PyMySQL errors
        print(f"Error connecting to or initializing database: {db_err}")
    except FileNotFoundError:
        print(f"Error: SQL script 'init_db.sql' not found at expected path: {script_path}")
    except Exception as e: # Catch any other unexpected errors
        print(f"An unexpected error occurred during database initialization: {e}")
    finally:
        # Only attempt to close the connection if it was successfully established
        if connection:
            connection.close()
            print("Database connection closed.")
        print("initialize_database... end")