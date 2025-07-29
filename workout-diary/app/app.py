import secrets
from flask import Flask
from flask_jwt_extended import JWTManager
import os
from models import db, User  # Import db directly from models
from initialize_data_base import initialize_database
import constants as constants
from flask_login import LoginManager

def create_app():
    app = Flask(__name__, template_folder='../templates', static_folder='../static')

    # Configure the app
    app.config['SQLALCHEMY_DATABASE_URI'] = constants.DATABASE_URI
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = secrets.token_urlsafe(32)  # Generate a strong secret key

    # Initialize extensions
    db.init_app(app)

    # Initialize LoginManager
    login_manager = LoginManager()
    login_manager.init_app(app)
    
    login_manager.login_view = 'main.login_page'  # Replace with the endpoint name of your login route
    login_manager.login_message = 'Please log in to access this page.'  # Optional: Custom message

    # Register blueprints
    from routes import main_bp, auth_bp
    from rep_logger import workout_bp
    from routes_account import account_bp;
    from routes_legal import legal_bp; 
    from routes_metrics import metrics_bp;

    # Register blueprints
    app.register_blueprint(main_bp, url_prefix='/')  # Root for main routes
    app.register_blueprint(auth_bp, url_prefix='/auth')  # Prefix for auth routes
    app.register_blueprint(workout_bp, url_prefix='/workout')  # Prefix for workout routes
    app.register_blueprint(account_bp, url_prefix='/account') # Prefux for account routes
    app.register_blueprint(legal_bp, url_prefix='/legal') # Prefux for account routes
    app.register_blueprint(metrics_bp, url_prefix='/metrics') # Prefux for metrics routes



    app.secret_key = 'your_secret_key'  # Replace with your secret key

    # Return the app
    return app

# Define the user_loader function inside the create_app function to avoid scope issues
def init_login_manager(app):
    login_manager = LoginManager()
    login_manager.init_app(app)
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))
           
    return login_manager

if __name__ == "__main__":
    initialize_database()
    app = create_app()
    login_manager = init_login_manager(app)  # Initialize login manager after creating the app

#---- for local network testing... update to current port : ipconfig
    app.run(host='192.168.1.144', port=5000)
    
    #app.run(debug=True)
