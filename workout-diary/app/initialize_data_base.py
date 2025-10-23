import pymysql
import os
import logging

# Create a logger for database initialization
logger = logging.getLogger('database_init')
logger.setLevel(logging.INFO)

# Console handler for database init (since app logger may not be ready yet)
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
console_formatter = logging.Formatter('[%(asctime)s] DB_INIT %(levelname)s: %(message)s')
console_handler.setFormatter(console_formatter)
logger.addHandler(console_handler)


def initialize_database():
    """
    Initialize the database with schema from init_db.sql.
    In development mode, also loads test_data.sql with sample users and workouts.
    This runs on first startup in development/testing environments.
    """
    connection = None
    try:
        logger.info("Database initialization starting...")
        
        # Get credentials from environment (try Railway's variable names first)
        db_host = os.getenv('DB_HOST') or os.getenv('MYSQLHOST') or os.getenv('MYSQL_HOST') or 'db'
        db_user = os.getenv('DB_USER') or os.getenv('MYSQLUSER') or os.getenv('MYSQL_USER') or 'flaskuser'
        db_password = os.getenv('DB_PASSWORD') or os.getenv('MYSQLPASSWORD') or os.getenv('MYSQL_PASSWORD') or 'flaskpassword'
        db_name = os.getenv('DB_NAME') or os.getenv('MYSQL_DATABASE') or 'fitness_tracker'
        db_port = int(os.getenv('DB_PORT') or os.getenv('MYSQLPORT') or os.getenv('MYSQL_PORT') or '3306')
        flask_env = os.getenv('FLASK_ENV', 'production')
        
        logger.info(f"Connecting to database at {db_host}:{db_port}/{db_name} as {db_user}")
        
        connection = pymysql.connect(
            host=db_host,
            port=db_port,
            user=db_user,
            password=db_password,
            database=db_name
        )
        logger.info("Database connection established")

        # Get the directory where this file is located (app/)
        # Then go up one level to workout-diary/ and into scripts/
        app_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(app_dir)  # Go up from app/ to workout-diary/
        script_path = os.path.join(project_root, 'scripts', 'init_db.sql')
        test_data_path = os.path.join(project_root, 'scripts', 'test_data.sql')

        with connection.cursor() as cursor:
            # Check if the SQL script file exists
            if not os.path.exists(script_path):
                logger.error(f"SQL script not found at {script_path}")
                return  # Exit if script not found
            
            logger.info(f"Loading SQL script from {script_path}")
            
            with open(script_path, 'r') as f:
                sql_script = f.read()
            
            statement_count = 0
            error_count = 0
            
            for statement in sql_script.split(';'):
                if statement.strip():
                    try:
                        cursor.execute(statement)
                        statement_count += 1
                    except pymysql.Error as sql_err:
                        error_count += 1
                        logger.warning(f"Error executing SQL statement #{statement_count}: {sql_err}")
                        # Don't log the full statement as it might contain sensitive data
            
            connection.commit()
            logger.info(f"Database initialized successfully. Executed {statement_count} statements ({error_count} errors)")
            
            # Load test data in development mode
            if flask_env == 'development' and os.path.exists(test_data_path):
                logger.info(f"🔧 Development mode detected - Loading test data from {test_data_path}")
                
                with open(test_data_path, 'r') as f:
                    test_sql_script = f.read()
                
                test_statement_count = 0
                test_error_count = 0
                
                for statement in test_sql_script.split(';'):
                    if statement.strip():
                        try:
                            cursor.execute(statement)
                            test_statement_count += 1
                        except pymysql.Error as sql_err:
                            test_error_count += 1
                            logger.warning(f"Error executing test data statement #{test_statement_count}: {sql_err}")
                
                connection.commit()
                logger.info(f"✅ Test data loaded successfully! Executed {test_statement_count} statements ({test_error_count} errors)")
                logger.info("=" * 60)
                logger.info("🎉 DEVELOPMENT MODE - Test Users Available:")
                logger.info("  Username: tom101    | Password: vL5MYe7HdD4bhmY##")
                logger.info("  Username: jess101   | Password: vL5MYe7HdD4bhmY##")
                logger.info("  Username: danny101  | Password: vL5MYe7HdD4bhmY##")
                logger.info("=" * 60)
            
    except pymysql.Error as db_err:  # Catch specific PyMySQL errors
        logger.error(f"Database error during initialization: {db_err}")
    except FileNotFoundError as fnf_err:
        logger.error(f"SQL script file not found: {fnf_err}")
    except Exception as e:  # Catch any other unexpected errors
        logger.error(f"Unexpected error during database initialization: {e}", exc_info=True)
    finally:
        # Only attempt to close the connection if it was successfully established
        if connection:
            connection.close()
            logger.info("Database connection closed")
        logger.info("Database initialization complete")
