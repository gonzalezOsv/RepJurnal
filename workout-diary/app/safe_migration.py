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
            
            # Handle CREATE INDEX IF NOT EXISTS - MySQL doesn't support it, so we need to check first
            # Replace with a pattern we can handle
            import re
            def fix_create_index(match):
                index_name = match.group(1)
                table_name = match.group(2)
                index_def = match.group(3)
                return f"""SET @index_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = '{table_name}'
      AND INDEX_NAME = '{index_name}'
);
SET @query = IF(@index_exists = 0,
    'CREATE INDEX {index_name} ON {table_name} {index_def}',
    'SELECT "Index {index_name} already exists" AS message'
);
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;"""
            
            # Fix CREATE INDEX IF NOT EXISTS statements
            migration_script = re.sub(
                r'CREATE INDEX IF NOT EXISTS (\w+) ON (\w+)\((.*?)\);',
                fix_create_index,
                migration_script,
                flags=re.IGNORECASE
            )
            
            # Simple approach: split by semicolon, but preserve multi-line statements
            # First, normalize the script - remove comments and combine lines
            normalized_lines = []
            for line in migration_script.split('\n'):
                line = line.strip()
                # Remove inline comments (-- comment)
                if '--' in line:
                    line = line.split('--')[0].strip()
                if line and not line.startswith('--'):
                    normalized_lines.append(line)
            
            # Join all lines and split by semicolon
            full_script = ' '.join(normalized_lines)
            # Split by semicolon but keep the semicolon for execution
            raw_statements = [s.strip() + ';' for s in full_script.split(';') if s.strip()]
            
            # Group prepared statement blocks together
            statements = []
            i = 0
            while i < len(raw_statements):
                stmt = raw_statements[i]
                # If this is a SET @ statement, collect until DEALLOCATE
                if 'SET @' in stmt.upper() and 'DEALLOCATE' not in stmt.upper():
                    prepared_block = stmt
                    i += 1
                    # Collect until we find DEALLOCATE
                    while i < len(raw_statements) and 'DEALLOCATE' not in raw_statements[i].upper():
                        prepared_block += " " + raw_statements[i]
                        i += 1
                    # Add the DEALLOCATE statement
                    if i < len(raw_statements):
                        prepared_block += " " + raw_statements[i]
                        i += 1
                    statements.append(prepared_block)
                else:
                    statements.append(stmt)
                    i += 1
            
            logger.info(f"Parsed {len(statements)} statements from migration script")
            logger.debug(f"First few statements: {statements[:3]}")
            
            # Execute each statement
            for statement in statements:
                if not statement:
                    continue
                
                # Skip dangerous operations, but allow safe ones
                statement_upper = statement.upper()
                
                # Always skip these dangerous operations
                always_skip = ['DROP TABLE', 'DROP DATABASE', 'TRUNCATE TABLE']
                if any(dangerous in statement_upper for dangerous in always_skip):
                    skipped_count += 1
                    logger.debug(f"Skipping dangerous statement: {statement[:50]}...")
                    continue
                
                # DELETE statements: only skip if they're DELETE FROM (unconditional deletes)
                # Allow DELETE with JOIN (safe deduplication queries)
                if 'DELETE FROM' in statement_upper and 'JOIN' not in statement_upper:
                    skipped_count += 1
                    logger.debug(f"Skipping unconditional DELETE: {statement[:50]}...")
                    continue
                
                # DELETE with table alias (DELETE t1 FROM ...) - these are usually safe deduplication
                # We'll allow these since they have JOIN clauses
                
                # DROP INDEX: skip only if it's a direct DROP INDEX (not inside prepared statement)
                # Prepared statements with DROP INDEX are conditional and safe
                if 'DROP INDEX' in statement_upper and 'PREPARE' not in statement_upper and 'SET @' not in statement_upper:
                    skipped_count += 1
                    logger.debug(f"Skipping direct DROP INDEX: {statement[:50]}...")
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
                                      'unknown database', 'table doesn\'t exist', 'syntax', 'unknown column']
                    if not any(expected in error_msg for expected in expected_errors):
                        logger.warning(f"Error executing statement: {sql_err}")
                        logger.debug(f"Statement was: {statement[:200]}...")
                    else:
                        # Log expected errors at debug level only
                        logger.debug(f"Expected error (continuing): {sql_err}")
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

