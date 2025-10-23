import os
from .app import create_app
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

    # Get port from environment (Railway provides PORT variable)
    port = int(os.getenv('PORT', 5000))
    
    # Start the Flask application
    print(f"Starting Flask application in {environment} environment on port {port}...")
    
    if environment == 'development':
        # For development, you likely want debug mode and possibly a specific host for local network testing
        app.run(host='0.0.0.0', port=port, debug=True)
    else:
        # For production or other environments, debug should be False.
        # Use '0.0.0.0' to make it accessible from outside the container/localhost,
        # but in a production setup, you'd typically use a WSGI server like Gunicorn or uWSGI.
        app.run(host='0.0.0.0', port=port, debug=False)

if __name__ == "__main__":
    main()