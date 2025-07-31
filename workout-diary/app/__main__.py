import os
from .app import create_app, init_login_manager 
from .initialize_data_base import initialize_database

def main():
    # Check if the environment is development or production
    environment = os.getenv('FLASK_ENV', 'development')

    # Initialize database only in development/testing environments
    if environment in ['development', 'testing']:
        print(f"Initializing database for {environment} environment...")
        initialize_database() # Call your database initialization function
    else:
        print(f"Running in {environment} environment. Skipping database initialization.")

    # Create the Flask application instance
    app = create_app()

    # Initialize LoginManager
    init_login_manager(app)

    # Start the Flask application
    print(f"Starting Flask application in {environment} environment...")
    
    if environment == 'development':
        # For development, you likely want debug mode and possibly a specific host for local network testing
        app.run(host='0.0.0.0', debug=True)
    else:
        # For production or other environments, debug should be False.
        # Use '0.0.0.0' to make it accessible from outside the container/localhost,
        # but in a production setup, you'd typically use a WSGI server like Gunicorn or uWSGI.
        app.run(host='0.0.0.0', debug=False)

if __name__ == "__main__":
    main()