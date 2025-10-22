from werkzeug.security import check_password_hash
from flask import current_app, request
from .models import User


class AuthService:
    def __init__(self, user_retrieval_function):
        self.get_user_by_username = user_retrieval_function

    def authenticate(self, username, password):
        """
        Authenticate a user with username and password.
        Logs all authentication attempts for security auditing.
        
        Args:
            username: Username to authenticate
            password: Password to verify
        
        Returns:
            User object if authentication successful, None otherwise
        """
        # Get IP address for logging
        ip_address = request.remote_addr if request else 'Unknown'
        
        current_app.logger.debug(f"Authentication attempt for username: {username[:3]}***")
        
        user = self.get_user_by_username(username)
        
        if user:
            current_app.logger.debug(f"User found: ID {user.user_id}")
            
            if check_password_hash(user.password_hash, password):
                # Successful authentication
                current_app.logger.info(f"Successful authentication for user ID: {user.user_id}")
                
                # Log to security audit
                current_app.security_logger.info(
                    f"Event: successful_login | User: {user.user_id} | IP: {ip_address}"
                )
                
                return user
            else:
                # Failed password
                current_app.logger.warning(f"Failed login attempt - incorrect password for user ID: {user.user_id}")
                
                # Log to security audit
                current_app.security_logger.warning(
                    f"Event: failed_login_wrong_password | Username: {username[:3]}*** | IP: {ip_address}"
                )
        else:
            # User not found
            current_app.logger.warning(f"Failed login attempt - user not found: {username[:3]}***")
            
            # Log to security audit (could be enumeration attempt)
            current_app.security_logger.warning(
                f"Event: failed_login_user_not_found | Username: {username[:3]}*** | IP: {ip_address}"
            )
        
        return None

