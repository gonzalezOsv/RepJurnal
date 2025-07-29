import pymysql

def initialize_database():
    """Initialize the database for testing by running the SQL script."""
    try:
        print("initialize_database... start")
        connection = pymysql.connect(
            host='localhost',
            user='flaskuser',
            password='flaskpassword',
            database='fitness_tracker'
        )
        print("initialize_database... connected")
        script_path = os.path.join('scripts', 'init_db.sql')
        with connection.cursor() as cursor:
            with open(script_path, 'r') as f:
                sql_script = f.read()
            for statement in sql_script.split(';'):
                if statement.strip():
                    cursor.execute(statement)
            connection.commit()
        print("Database initialized successfully.")
    except Exception as e:
        print(f"Error initializing database: {e}")
    finally:
        connection.close()