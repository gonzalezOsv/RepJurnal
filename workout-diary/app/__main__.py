import os
import signal
import sys
from .app import create_app
from .initialize_data_base import initialize_database

# Global app instance for graceful shutdown
_app = None

def signal_handler(signum, frame):
    """Handle SIGTERM/SIGINT for graceful shutdown"""
    print(f"\n⚠️  Received signal {signum}. Initiating graceful shutdown...")
    if _app:
        with _app.app_context():
            from .models import db
            try:
                db.session.close()
                print("✅ Database connections closed")
            except Exception as e:
                print(f"⚠️  Error closing database: {e}")
    sys.exit(0)

def main():
    # Check if the environment is development or production
    environment = os.getenv('FLASK_ENV', 'development')

    # Check if database should be initialized
    auto_init = os.getenv('AUTO_INIT_DB', 'false').lower() == 'true'
    
    # Initialize database in development/testing OR if AUTO_INIT_DB=true
    if environment in ['development', 'testing']:
        print(f"Initializing database for {environment} environment...")
        initialize_database() # Call your database initialization function
        os.environ['DB_INIT_DONE'] = 'true'
    elif auto_init:
        print("AUTO_INIT_DB is enabled. Initializing database for production...")
        initialize_database()
        os.environ['DB_INIT_DONE'] = 'true'
    else:
        print(f"Running in {environment} environment. Skipping database initialization.")

    # Create the Flask application instance
    global _app
    _app = create_app()
    
    # Register signal handlers for graceful shutdown (production)
    if environment == 'production':
        signal.signal(signal.SIGTERM, signal_handler)
        signal.signal(signal.SIGINT, signal_handler)
        print("✅ Graceful shutdown handlers registered")
    
    # Ensure SQLAlchemy tables exist (creates them if they don't)
    if environment in ['development', 'testing'] or auto_init:
        print("Ensuring SQLAlchemy models are synced with database...")
        with _app.app_context():
            from .models import db
            try:
                db.create_all()
                print("✅ SQLAlchemy tables verified/created")
            except Exception as e:
                print(f"⚠️  Warning: Could not create SQLAlchemy tables: {e}")

    # Get port from environment (Railway provides PORT variable)
    port = int(os.getenv('PORT', 5000))
    
    # Start the Flask application
    print(f"Starting Flask application in {environment} environment on port {port}...")
    
    # NEVER run with debug=True in production - check environment variable instead
    debug_mode = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
    
    if environment == 'development' and debug_mode:
        # For development only - debug mode with auto-reload
        _app.run(host='0.0.0.0', port=port, debug=True)
    else:
        # Production or non-debug mode - use Flask's server for development, 
        # but in production you should use Gunicorn via Dockerfile CMD
        # Check if Gunicorn is available (production)
        try:
            import gunicorn.app.wsgiapp as wsgi
            # If Gunicorn is available, don't run Flask's dev server
            # Gunicorn should be called directly from Dockerfile CMD
            print("⚠️  Gunicorn detected. Use 'gunicorn' command for production.")
            print("   Example: gunicorn -w 4 -b 0.0.0.0:5000 'app:create_app()'")
            _app.run(host='0.0.0.0', port=port, debug=False)
        except ImportError:
            # Gunicorn not installed - use Flask server (development only)
            _app.run(host='0.0.0.0', port=port, debug=False)

if __name__ == "__main__":
    main()