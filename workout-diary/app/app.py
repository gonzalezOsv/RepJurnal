import os
import secrets
from datetime import timedelta
from flask import Flask, jsonify, request, session, current_app
from flask_jwt_extended import JWTManager
from flask_login import LoginManager
from flask_wtf.csrf import CSRFProtect, CSRFError, generate_csrf, validate_csrf
from sqlalchemy import text

from .models import db, User
from .initialize_data_base import initialize_database
from . import constants as constants_main
from .logging_config import setup_logging, log_request_info

csrf = CSRFProtect()


_db_init_checked = False


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

    global _db_init_checked
    should_auto_init = (
        env in ['development', 'testing'] or os.getenv('AUTO_INIT_DB', 'false').lower() == 'true'
    )
    if should_auto_init and os.getenv('DB_INIT_DONE', 'false').lower() != 'true' and not _db_init_checked:
        try:
            initialize_database()
        except Exception as init_err:
            print(f"⚠️  Database initialization on app startup failed: {init_err}")
        else:
            os.environ['DB_INIT_DONE'] = 'true'
        finally:
            _db_init_checked = True
    
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
    app.config['WTF_CSRF_TIME_LIMIT'] = 3600
    app.config['WTF_CSRF_SSL_STRICT'] = False  # Allow local development over HTTP
    
    # Remember Me cookie security
    app.config['REMEMBER_COOKIE_SECURE'] = (env == 'production')
    app.config['REMEMBER_COOKIE_HTTPONLY'] = True
    app.config['REMEMBER_COOKIE_DURATION'] = timedelta(days=7)
    app.config['REMEMBER_COOKIE_SAMESITE'] = 'Lax'
    
    # ========================================
    # INITIALIZE EXTENSIONS
    # ========================================
    db.init_app(app)
    
    # Ensure all tables exist (creates missing tables like Blocks)
    # This is safe to run - it only creates tables that don't exist
    try:
        with app.app_context():
            db.create_all()
            # Explicitly ensure Blocks table and critical User columns exist (critical for login)
            from sqlalchemy import inspect, text
            inspector = inspect(db.engine)
            
            # Check and create Blocks table
            if 'Blocks' not in inspector.get_table_names():
                print("⚠️  Blocks table missing, creating directly...")
                with db.engine.connect() as conn:
                    conn.execute(text("""
                        CREATE TABLE IF NOT EXISTS Blocks (
                            block_id INT AUTO_INCREMENT PRIMARY KEY,
                            user_id INT NOT NULL,
                            blocked_user_id INT NOT NULL,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
                            FOREIGN KEY (blocked_user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
                            UNIQUE KEY unique_user_block (user_id, blocked_user_id),
                            INDEX idx_user (user_id),
                            INDEX idx_blocked_user (blocked_user_id)
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                    """))
                    conn.commit()
                print("✅ Blocks table created")
            
            # Check and add critical User columns if missing
            if 'Users' in inspector.get_table_names():
                user_columns = [col['name'] for col in inspector.get_columns('Users')]
                critical_columns = {
                    'profile_visibility': "ENUM('public', 'friends_only', 'private') DEFAULT 'public'",
                    'show_stats_to_friends': 'BOOLEAN DEFAULT TRUE',
                    'show_workouts_to_friends': 'BOOLEAN DEFAULT TRUE',
                    'show_routines_to_public': 'BOOLEAN DEFAULT TRUE',
                    'bio': 'TEXT',
                    'profile_picture_url': 'VARCHAR(255)'
                }
                
                for col_name, col_def in critical_columns.items():
                    if col_name not in user_columns:
                        print(f"⚠️  User column '{col_name}' missing, adding...")
                        try:
                            with db.engine.connect() as conn:
                                conn.execute(text(f"ALTER TABLE Users ADD COLUMN {col_name} {col_def}"))
                                conn.commit()
                            print(f"✅ User column '{col_name}' added")
                        except Exception as col_err:
                            print(f"⚠️  Could not add column '{col_name}': {col_err}")
            
            # Ensure critical tables exist (for data loading)
            critical_tables = {
                'FriendRequests': """
                    CREATE TABLE IF NOT EXISTS FriendRequests (
                        request_id INT AUTO_INCREMENT PRIMARY KEY,
                        sender_id INT NOT NULL,
                        receiver_id INT NOT NULL,
                        status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
                        message TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        FOREIGN KEY (sender_id) REFERENCES Users(user_id) ON DELETE CASCADE,
                        FOREIGN KEY (receiver_id) REFERENCES Users(user_id) ON DELETE CASCADE,
                        UNIQUE KEY unique_friend_request (sender_id, receiver_id),
                        INDEX idx_sender (sender_id),
                        INDEX idx_receiver (receiver_id),
                        INDEX idx_status (status)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """,
                'Friends': """
                    CREATE TABLE IF NOT EXISTS Friends (
                        friendship_id INT AUTO_INCREMENT PRIMARY KEY,
                        user_id INT NOT NULL,
                        friend_id INT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
                        FOREIGN KEY (friend_id) REFERENCES Users(user_id) ON DELETE CASCADE,
                        UNIQUE KEY unique_friendship (user_id, friend_id),
                        INDEX idx_user (user_id),
                        INDEX idx_friend (friend_id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """,
                'TrackedExercises': """
                    CREATE TABLE IF NOT EXISTS TrackedExercises (
                        tracked_exercise_id INT AUTO_INCREMENT PRIMARY KEY,
                        user_id INT NOT NULL,
                        exercise_name VARCHAR(100) NOT NULL,
                        display_order INT DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
                        UNIQUE KEY unique_user_exercise (user_id, exercise_name),
                        INDEX idx_user (user_id, display_order)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """
            }
            
            existing_tables = inspector.get_table_names()
            for table_name, table_sql in critical_tables.items():
                if table_name not in existing_tables:
                    print(f"⚠️  Table '{table_name}' missing, creating directly...")
                    try:
                        with db.engine.connect() as conn:
                            conn.execute(text(table_sql))
                            conn.commit()
                        print(f"✅ Table '{table_name}' created")
                    except Exception as table_err:
                        print(f"⚠️  Could not create table '{table_name}': {table_err}")
    except Exception as create_err:
        print(f"⚠️  Warning: Could not ensure all tables exist: {create_err}")
        import traceback
        print(f"⚠️  Error details: {traceback.format_exc()}")
    
    # Run safe migration to add missing columns and tables (no data deletion)
    # This is safe because the migration script checks if columns/tables exist before adding
    if os.getenv('RUN_SAFE_MIGRATION', 'true').lower() == 'true':
        try:
            print("🔄 Starting safe migration...")
            from .safe_migration import run_safe_migration
            run_safe_migration()
            print("✅ Safe migration completed")
        except Exception as migration_err:
            print(f"⚠️  Warning: Safe migration failed: {migration_err}")
            import traceback
            print(f"⚠️  Migration error details: {traceback.format_exc()}")
    
    csrf.init_app(app)
    
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
    
    @app.before_request
    def enforce_csrf_on_state_changes():
        """
        Enforce CSRF protection on state-changing requests that arrive via
        JSON/fetch calls. Traditional form submissions are handled by
        Flask-WTF's built-in validation.
        """
        # Skip CSRF check in testing mode or if CSRF is disabled
        if app.config.get('TESTING') or not app.config.get('WTF_CSRF_ENABLED', True):
            return None
            
        if request.method in ('GET', 'HEAD', 'OPTIONS', 'TRACE'):
            return None

        form_token = request.form.get('csrf_token')
        if form_token:
            try:
                validate_csrf(form_token)
                return None
            except CSRFError as exc:
                current_app.logger.warning(
                    "CSRF validation failed (form token)",
                    extra={'endpoint': request.endpoint, 'method': request.method, 'ip': request.remote_addr},
                )
                return jsonify({'error': getattr(exc, 'description', 'CSRF token missing or invalid')}), 403

        token = (
            request.headers.get('X-CSRF-Token')
            or request.headers.get('X-CSRFToken')
            or request.headers.get('X-XSRF-Token')
        )

        if not token and request.is_json:
            json_payload = request.get_json(silent=True) or {}
            token = json_payload.pop('csrf_token', None)

        if token:
            try:
                validate_csrf(token)
                return None
            except CSRFError as exc:
                current_app.logger.warning(
                    "CSRF validation failed (header/json token)",
                    extra={
                        'endpoint': request.endpoint,
                        'method': request.method,
                        'ip': request.remote_addr,
                    },
                )
                return jsonify({'error': getattr(exc, 'description', 'CSRF token missing or invalid')}), 403

        current_app.logger.warning(
            "CSRF validation failed (missing token)",
            extra={
                'endpoint': request.endpoint,
                'method': request.method,
                'ip': request.remote_addr,
            },
        )
        return jsonify({'error': 'CSRF token missing or invalid'}), 403

    @app.after_request
    def set_csrf_cookie(response):
        """
        Store the CSRF token in a readable cookie so SPA clients can forward it
        in the `X-CSRF-Token` header. The token remains synchronized with the
        session.
        """
        try:
            token = generate_csrf()
            response.set_cookie(
                'XSRF-TOKEN',
                token,
                secure=(env == 'production'),
                httponly=False,
                samesite='Strict',
            )
        except Exception:
            current_app.logger.debug("Unable to set CSRF cookie on response", exc_info=True)
        return response

    @app.route('/api/csrf-token', methods=['GET'])
    def issue_csrf_token():
        """
        Provide a CSRF token for SPA clients that wish to fetch it explicitly.
        """
        token = generate_csrf()
        response = jsonify({'csrfToken': token})
        response.set_cookie(
            'XSRF-TOKEN',
            token,
            secure=(env == 'production'),
            httponly=False,
            samesite='Strict',
        )
        return response

    @app.context_processor
    def inject_csrf_token():
        return {'csrf_token': lambda: generate_csrf()}
    # ========================================
    # ERROR HANDLERS
    # ========================================
    @app.errorhandler(CSRFError)
    def handle_csrf_error(error):
        message = getattr(error, 'description', 'CSRF token missing or invalid')
        if request.path.startswith('/api/'):
            return jsonify({'error': message}), 403
        from flask import render_template
        return render_template('403.html', message=message), 403

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
    # HEALTH CHECK ENDPOINT (for monitoring/load balancers)
    # ========================================
    @app.route('/health', methods=['GET'])
    @app.route('/ping', methods=['GET'])
    def health_check():
        """
        Health check endpoint for monitoring and load balancers.
        Returns 200 if app and database are healthy, 503 otherwise.
        """
        try:
            # Check database connectivity
            db.session.execute(text('SELECT 1'))
            db.session.commit()
            
            return jsonify({
                'status': 'healthy',
                'database': 'connected',
                'service': 'fitness-tracker'
            }), 200
        except Exception as e:
            current_app.logger.error(f"Health check failed: {e}", exc_info=True)
            return jsonify({
                'status': 'unhealthy',
                'database': 'disconnected',
                'service': 'fitness-tracker',
                'error': str(e) if env == 'development' else 'Service unavailable'
            }), 503
    
    # ========================================
    # REGISTER BLUEPRINTS
    # ========================================
    from .routes import main_bp, auth_bp
    from .rep_logger import workout_bp
    from .routes_account import account_bp
    from .routes_legal import legal_bp
    from .routes_metrics import metrics_bp
    from .routes_routines import routines_bp
    from .routes_friends import friends_bp
    from .routes_analytics import analytics_bp

    app.register_blueprint(main_bp, url_prefix='/')
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(workout_bp, url_prefix='/workout')
    app.register_blueprint(account_bp, url_prefix='/account')
    app.register_blueprint(legal_bp, url_prefix='/legal')
    app.register_blueprint(metrics_bp, url_prefix='/metrics')
    app.register_blueprint(routines_bp, url_prefix='/')
    app.register_blueprint(friends_bp, url_prefix='/friends')
    app.register_blueprint(analytics_bp)  # Uses blueprint's own url_prefix='/api/analytics'
     
    # ========================================
    # SECURITY HEADERS
    # ========================================
    @app.after_request
    def set_security_headers(response):
        """Add security headers to all responses"""
        # Content Security Policy
        # NOTE: 'unsafe-inline' is required for Tailwind CDN and inline styles/scripts
        # For production, consider bundling dependencies locally to remove 'unsafe-inline'
        # 'unsafe-eval' removed for better security (was only needed if using dynamic eval)
        response.headers['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://code.jquery.com; "
            "script-src-elem 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://code.jquery.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com https://cdnjs.cloudflare.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: https:; "
            "connect-src 'self' https://cdn.jsdelivr.net; "
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
