import os
from app.app import app, db, initialize_database, start_app

def main():
    # Check if the environment is development or production
    environment = os.getenv('FLASK_ENV', 'development')

    # Initialize database only in development/testing environments
    if environment in ['development', 'testing']:
        print(f"Initializing database for {environment} environment...")
        initialize_database()
    else:
        print(f"Running in {environment} environment. Skipping database initialization.")

    # Start the Flask application
    app.run(host='0.0.0.0', port=5000, debug=(environment == 'development'))

    

if __name__ == "__main__":
    main()
    start_app()