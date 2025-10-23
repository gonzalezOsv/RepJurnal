import os
import secrets
from datetime import timedelta
from flask import Flask
from flask_jwt_extended import JWTManager
from flask_login import LoginManager

from .models import db, User
from .initialize_data_base import initialize_database
from . import constants as constants_main
from .logging_config import setup_logging, log_request_info


def create_app():
    """
    Application factory pattern for creating Flask app instances.
    Implements security best practices and environment-based configuration.
    """
    app = Flask(__name__, template_folder='../templates', static_folder='../static')

    # ========================================
    # ENVIRONMENT DETECTION
    # ========================================
    env = os.getenv('FLASK_ENV', 'development')
    app.config['ENV'] = env
    
    # ========================================
    # SECURITY CONFIGURATION - CRITICAL
    # ========================================
    # Get secrets from environment variables
    secret_key = os.getenv('SECRET_KEY')
    jwt_secret_key = os.getenv('JWT_SECRET_KEY')
    
    # Try multiple database URL formats (Railway provides MYSQL_URL, DATABASE_URL, etc.)
    db_uri = os.getenv('SQLALCHEMY_DATABASE_URI') or os.getenv('MYSQL_URL') or os.getenv('DATABASE_URL')
    
    # Convert mysql:// to mysql+pymysql:// for SQLAlchemy
    if db_uri and db_uri.startswith('mysql://'):
        db_uri = db_uri.replace('mysql://', 'mysql+pymysql://', 1)
        print(f"📊 Converted MySQL URL to use pymysql driver")
    
    # Build database URI from components if not provided directly
    if not db_uri:
        # Try Railway's variable names (with and without underscores)
        db_host = os.getenv('DB_HOST') or os.getenv('MYSQLHOST') or os.getenv('MYSQL_HOST')
        db_port = os.getenv('DB_PORT') or os.getenv('MYSQLPORT') or os.getenv('MYSQL_PORT', '3306')
        db_name = os.getenv('DB_NAME') or os.getenv('MYSQL_DATABASE')
        db_user = os.getenv('DB_USER') or os.getenv('MYSQLUSER') or os.getenv('MYSQL_USER')
        db_password = os.getenv('DB_PASSWORD') or os.getenv('MYSQLPASSWORD') or os.getenv('MYSQL_PASSWORD')
        
        if all([db_host, db_name, db_user, db_password]):
            db_uri = f'mysql+pymysql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}'
            print(f"📊 Built database URI from components: mysql+pymysql://{db_user}:***@{db_host}:{db_port}/{db_name}")
        else:
            print(f"⚠️  Database URI components missing:")
            print(f"   DB_HOST: {'✓' if db_host else '✗'}")
            print(f"   DB_PORT: {db_port}")
            print(f"   DB_NAME: {'✓' if db_name else '✗'}")
            print(f"   DB_USER: {'✓' if db_user else '✗'}")
            print(f"   DB_PASSWORD: {'✓' if db_password else '✗'}")
    else:
        # Mask the password in URI for logging
        if '://' in db_uri and '@' in db_uri:
            try:
                parts = db_uri.split('://')
                protocol = parts[0]
                rest = parts[1].split('@')
                user_pass = rest[0]
                host_db = '@'.join(rest[1:])
                if ':' in user_pass:
                    user = user_pass.split(':')[0]
                    print(f"📊 Using database URI: {protocol}://{user}:***@{host_db}")
                else:
                    print(f"📊 Using database URI: {protocol}://***@{host_db}")
            except:
                print(f"📊 Using database URI (format: {db_uri.split('://')[0]}://...)")
    
    # PRODUCTION: Enforce strong secrets (fail fast if missing or weak)
    if env == 'production':
        if not secret_key or len(secret_key) < 32:
            raise ValueError(
                "❌ SECURITY ERROR: SECRET_KEY must be set and at least 32 characters in production! "
                "Generate with: python3 -c \"import secrets; print(secrets.token_hex(32))\""
            )
        if not jwt_secret_key or len(jwt_secret_key) < 32:
            raise ValueError(
                "❌ SECURITY ERROR: JWT_SECRET_KEY must be set and at least 32 characters in production! "
                "Generate with: python3 -c \"import secrets; print(secrets.token_hex(32))\""
            )
        # Check for obviously weak credentials (but allow Railway/cloud provider auto-generated ones)
        if not db_uri:
            raise ValueError(
                "❌ SECURITY ERROR: SQLALCHEMY_DATABASE_URI must be set in production!"
            )
        
        # Only fail if using known weak/example passwords (not if 'test' appears in hostname)
        weak_passwords = ['flaskpassword', 'my-secret-pw', 'password123', 'admin', 'root123']
        # Extract password from URI for checking (format: mysql://user:password@host/db)
        if '://' in db_uri and '@' in db_uri:
            try:
                # Extract password portion
                password_part = db_uri.split('://')[1].split('@')[0]
                if ':' in password_part:
                    password = password_part.split(':')[1]
                    if any(weak in password.lower() for weak in weak_passwords):
                        raise ValueError(
                            "❌ SECURITY ERROR: Database password appears to be weak! "
                            "Use strong auto-generated passwords from your hosting provider."
                        )
            except IndexError:
                pass  # Can't parse URI, allow it (might be encrypted or non-standard format)
        # Ensure we're not using default/example secrets
        if any(default in secret_key.lower() for default in ['change', 'example', 'dev_', 'your_']):
            raise ValueError("❌ SECURITY ERROR: SECRET_KEY appears to be a default/example value!")
        if any(default in jwt_secret_key.lower() for default in ['change', 'example', 'dev_', 'your_']):
            raise ValueError("❌ SECURITY ERROR: JWT_SECRET_KEY appears to be a default/example value!")
    
    # DEVELOPMENT: Warn if using defaults, but allow with fallbacks
    if env == 'development':
        if not secret_key:
            print("⚠️  WARNING: SECRET_KEY not set! Using INSECURE default for development.")
            print("   Generate a secure key: python3 -c \"import secrets; print(secrets.token_hex(32))\"")
            secret_key = secrets.token_hex(32)  # Generate a random one for this session
        if not jwt_secret_key:
            print("⚠️  WARNING: JWT_SECRET_KEY not set! Using INSECURE default for development.")
            print("   Generate a secure key: python3 -c \"import secrets; print(secrets.token_hex(32))\"")
            jwt_secret_key = secrets.token_hex(32)  # Generate a random one for this session
        if not db_uri:
            print("⚠️  WARNING: SQLALCHEMY_DATABASE_URI not set! Using default.")
            db_uri = 'mysql+pymysql://flaskuser:flaskpassword@db/fitness_tracker'
    
    # Set configuration
    app.config['SECRET_KEY'] = secret_key
    app.config['JWT_SECRET_KEY'] = jwt_secret_key
    app.config['SQLALCHEMY_DATABASE_URI'] = db_uri
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }
    
    # ========================================
    # SESSION SECURITY
    # ========================================
    app.config['SESSION_COOKIE_SECURE'] = (env == 'production')  # HTTPS only in production
    app.config['SESSION_COOKIE_HTTPONLY'] = True  # Prevent JavaScript access
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'  # CSRF protection
    app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=constants_main.SESSION_TIMEOUT_HOURS)
    app.config['SESSION_COOKIE_NAME'] = 'fitness_session'  # Custom cookie name
    
    # Remember Me cookie security
    app.config['REMEMBER_COOKIE_SECURE'] = (env == 'production')
    app.config['REMEMBER_COOKIE_HTTPONLY'] = True
    app.config['REMEMBER_COOKIE_DURATION'] = timedelta(days=7)
    app.config['REMEMBER_COOKIE_SAMESITE'] = 'Lax'
    
    # ========================================
    # INITIALIZE EXTENSIONS
    # ========================================
    db.init_app(app)
    
    # Setup logging (must be done early)
    app_logger, security_logger = setup_logging(app)
    app.security_logger = security_logger  # Make security logger available
    
    # Add request logging middleware
    log_request_info(app)
    
    # Initialize LoginManager
    login_manager = LoginManager()
    login_manager.init_app(app)
    
    login_manager.login_view = 'main.home'
    login_manager.login_message = 'Please log in to access this page.'
    login_manager.login_message_category = 'warning'
    
    # User loader callback
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))
    
    # Custom unauthorized handler
    @login_manager.unauthorized_handler
    def unauthorized():
        from flask import flash, redirect, url_for
        flash('Please log in to access this page.', 'warning')
        return redirect(url_for('main.home'))
    
    # ========================================
    # ERROR HANDLERS
    # ========================================
    @app.errorhandler(404)
    def not_found_error(error):
        from flask import jsonify, request
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Resource not found'}), 404
        from flask import render_template
        return render_template('404.html'), 404
    
    @app.errorhandler(403)
    def forbidden_error(error):
        from flask import jsonify, request
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Access denied'}), 403
        from flask import render_template
        return render_template('403.html'), 403
    
    @app.errorhandler(500)
    def internal_error(error):
        from flask import jsonify, request
        db.session.rollback()
        # Don't expose error details in production
        if env == 'production':
            if request.path.startswith('/api/'):
                return jsonify({'error': 'An internal error occurred'}), 500
            from flask import render_template
            return render_template('500.html'), 500
        else:
            # In development, show the error
            if request.path.startswith('/api/'):
                return jsonify({'error': str(error)}), 500
            raise error
    
    # ========================================
    # REGISTER BLUEPRINTS
    # ========================================
    from .routes import main_bp, auth_bp
    from .rep_logger import workout_bp
    from .routes_account import account_bp
    from .routes_legal import legal_bp
    from .routes_metrics import metrics_bp
    
    app.register_blueprint(main_bp, url_prefix='/')
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(workout_bp, url_prefix='/workout')
    app.register_blueprint(account_bp, url_prefix='/account')
    app.register_blueprint(legal_bp, url_prefix='/legal')
    app.register_blueprint(metrics_bp, url_prefix='/metrics')
    
    # ========================================
    # SECURITY HEADERS
    # ========================================
    @app.after_request
    def set_security_headers(response):
        """Add security headers to all responses"""
        # Content Security Policy
        response.headers['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://code.jquery.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: https:; "
            "connect-src 'self'; "
            "frame-ancestors 'none';"
        )
        # Prevent clickjacking
        response.headers['X-Frame-Options'] = 'DENY'
        # Prevent MIME type sniffing
        response.headers['X-Content-Type-Options'] = 'nosniff'
        # XSS Protection (legacy browsers)
        response.headers['X-XSS-Protection'] = '1; mode=block'
        # Referrer Policy
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        # Permissions Policy
        response.headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
        # HSTS (only in production with HTTPS)
        if env == 'production' and app.config.get('SESSION_COOKIE_SECURE'):
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        
        return response
    
    # ========================================
    # APPLICATION STARTUP
    # ========================================
    app.logger.info(f"Flask app initialized in {env} mode")
    if env == 'development':
        app.logger.warning("Development mode - security warnings enabled")
    elif env == 'production':
        app.logger.info("Production mode - strict security enforced")
    
    return app
