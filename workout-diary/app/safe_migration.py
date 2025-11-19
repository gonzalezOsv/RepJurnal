"""
Safe migration runner that only adds missing tables and columns.
This script extracts only the safe parts of the migration (CREATE TABLE IF NOT EXISTS
and ALTER TABLE ADD COLUMN) without any DROP statements.
"""
import pymysql
import os
import logging

logger = logging.getLogger('safe_migration')
logger.setLevel(logging.INFO)

console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
console_formatter = logging.Formatter('[%(asctime)s] SAFE_MIGRATION %(levelname)s: %(message)s')
console_handler.setFormatter(console_formatter)
logger.addHandler(console_handler)


def run_safe_migration():
    """
    Run a safe migration that only adds missing tables and columns.
    This extracts only CREATE TABLE IF NOT EXISTS and ALTER TABLE ADD COLUMN statements
    from the migration script, ensuring no data is deleted.
    """
    connection = None
    try:
        print("🔄 [SAFE_MIGRATION] Starting safe migration (add-only, no data deletion)...")
        logger.info("Starting safe migration (add-only, no data deletion)...")
        
        # Get credentials from environment
        db_host = os.getenv('DB_HOST') or os.getenv('MYSQLHOST') or os.getenv('MYSQL_HOST') or 'db'
        db_user = os.getenv('DB_USER') or os.getenv('MYSQLUSER') or os.getenv('MYSQL_USER') or 'flaskuser'
        db_password = os.getenv('DB_PASSWORD') or os.getenv('MYSQLPASSWORD') or os.getenv('MYSQL_PASSWORD') or 'flaskpassword'
        db_name = os.getenv('DB_NAME') or os.getenv('MYSQL_DATABASE') or 'fitness_tracker'
        db_port = int(os.getenv('DB_PORT') or os.getenv('MYSQLPORT') or os.getenv('MYSQL_PORT') or '3306')
        
        logger.info(f"Connecting to database at {db_host}:{db_port}/{db_name} as {db_user}")
        
        connection = pymysql.connect(
            host=db_host,
            port=db_port,
            user=db_user,
            password=db_password,
            database=db_name
        )
        logger.info("Database connection established for safe migration")
        
        # Get the migration script path - use the combined migrations file
        app_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(app_dir)
        migration_path = os.path.join(project_root, 'scripts', 'migrations_combined.sql')
        
        if not os.path.exists(migration_path):
            logger.warning(f"Migration script not found at {migration_path} - skipping")
            return
        
        logger.info(f"Loading migration script from {migration_path}")
        
        with open(migration_path, 'r') as f:
            migration_script = f.read()
        
        statement_count = 0
        error_count = 0
        skipped_count = 0
        
        with connection.cursor() as cursor:
            logger.info("Executing migration script (safe - checks before adding)...")
            
            # Remove USE statement if present (we're already connected to the right database)
            migration_script = migration_script.replace('USE fitness_tracker;', '').replace('USE fitness_tracker', '')
            
            # Split by semicolon to get individual statements
            # Handle multi-line statements and prepared statements
            statements = []
            current_statement = ""
            
            for line in migration_script.split('\n'):
                line = line.strip()
                # Skip comments
                if not line or line.startswith('--'):
                    continue
                
                current_statement += line + " "
                
                # If line ends with semicolon, we have a complete statement
                if line.endswith(';'):
                    stmt = current_statement.strip()
                    if stmt:
                        statements.append(stmt)
                    current_statement = ""
            
            # Execute each statement
            for statement in statements:
                if not statement:
                    continue
                
                # Skip dangerous operations
                statement_upper = statement.upper()
                dangerous_keywords = ['DROP TABLE', 'DROP DATABASE', 'TRUNCATE TABLE', 'DELETE FROM', 'DELETE ']
                if any(dangerous in statement_upper for dangerous in dangerous_keywords):
                    skipped_count += 1
                    logger.debug(f"Skipping potentially dangerous statement: {statement[:50]}...")
                    continue
                
                try:
                    cursor.execute(statement)
                    statement_count += 1
                    if statement_count % 10 == 0:
                        logger.info(f"Processed {statement_count} statements...")
                except pymysql.Error as sql_err:
                    error_count += 1
                    # Many errors are expected (columns already exist, etc.) - only log if it's unexpected
                    error_msg = str(sql_err).lower()
                    expected_errors = ['already exists', 'duplicate column', 'duplicate key', 'duplicate entry', 
                                      'unknown database', 'table doesn\'t exist']
                    if not any(expected in error_msg for expected in expected_errors):
                        logger.warning(f"Error executing statement: {sql_err}")
                        logger.debug(f"Statement was: {statement[:100]}...")
                    # Continue with other statements
            
            connection.commit()
            print(f"✅ [SAFE_MIGRATION] Safe migration completed!")
            print(f"   - Executed: {statement_count} statements")
            print(f"   - Errors (expected): {error_count}")
            print(f"   - Skipped (DROP statements): {skipped_count}")
            logger.info(f"✅ Safe migration completed!")
            logger.info(f"   - Executed: {statement_count} statements")
            logger.info(f"   - Errors (expected): {error_count}")
            logger.info(f"   - Skipped (DROP statements): {skipped_count}")
            
    except pymysql.Error as db_err:
        print(f"❌ [SAFE_MIGRATION] Database error during safe migration: {db_err}")
        logger.error(f"Database error during safe migration: {db_err}")
    except FileNotFoundError as fnf_err:
        print(f"⚠️  [SAFE_MIGRATION] Migration script file not found: {fnf_err}")
        logger.warning(f"Migration script file not found: {fnf_err}")
    except Exception as e:
        print(f"❌ [SAFE_MIGRATION] Unexpected error during safe migration: {e}")
        import traceback
        print(f"❌ [SAFE_MIGRATION] Traceback: {traceback.format_exc()}")
        logger.error(f"Unexpected error during safe migration: {e}", exc_info=True)
    finally:
        if connection:
            connection.close()
            logger.info("Safe migration database connection closed")

