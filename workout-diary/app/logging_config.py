"""
Logging configuration for the Fitness Tracker application.

This module sets up comprehensive logging with:
- File-based logging with rotation
- Console logging for development
- Separate security audit log
- Different log levels per environment
"""

import logging
import os
from logging.handlers import RotatingFileHandler
from datetime import datetime


def setup_logging(app):
    """
    Configure comprehensive logging for the application.
    
    Args:
        app: Flask application instance
    
    Returns:
        tuple: (app_logger, security_logger)
    """
    # Get environment
    env = os.getenv('FLASK_ENV', 'development')
    
    # Create logs directory if it doesn't exist
    logs_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'logs')
    if not os.path.exists(logs_dir):
        os.makedirs(logs_dir)
    
    # ========================================
    # CONFIGURE LOG LEVELS
    # ========================================
    if env == 'production':
        log_level = logging.WARNING
        console_level = logging.ERROR
    elif env == 'testing':
        log_level = logging.ERROR
        console_level = logging.CRITICAL
    else:  # development
        log_level = logging.DEBUG
        console_level = logging.DEBUG
    
    # ========================================
    # CLEAR EXISTING HANDLERS
    # ========================================
    app.logger.handlers.clear()
    app.logger.setLevel(log_level)
    
    # ========================================
    # CONSOLE HANDLER (Development)
    # ========================================
    if env == 'development':
        console_handler = logging.StreamHandler()
        console_handler.setLevel(console_level)
        console_formatter = logging.Formatter(
            '[%(asctime)s] %(levelname)s in %(module)s.%(funcName)s: %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        console_handler.setFormatter(console_formatter)
        app.logger.addHandler(console_handler)
    
    # ========================================
    # FILE HANDLER (All Environments)
    # ========================================
    # Main application log
    app_log_file = os.path.join(logs_dir, 'fitness_tracker.log')
    file_handler = RotatingFileHandler(
        app_log_file,
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=10
    )
    file_handler.setLevel(log_level)
    file_formatter = logging.Formatter(
        '[%(asctime)s] %(levelname)s [%(name)s.%(funcName)s:%(lineno)d] %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    file_handler.setFormatter(file_formatter)
    app.logger.addHandler(file_handler)
    
    # ========================================
    # ERROR LOG (Production)
    # ========================================
    if env == 'production':
        error_log_file = os.path.join(logs_dir, 'errors.log')
        error_handler = RotatingFileHandler(
            error_log_file,
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=20
        )
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(file_formatter)
        app.logger.addHandler(error_handler)
    
    # ========================================
    # SECURITY AUDIT LOG (Always Enabled)
    # ========================================
    security_logger = logging.getLogger('security_audit')
    security_logger.setLevel(logging.INFO)
    security_logger.handlers.clear()
    
    security_log_file = os.path.join(logs_dir, 'security_audit.log')
    security_handler = RotatingFileHandler(
        security_log_file,
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=50  # Keep more security logs
    )
    security_formatter = logging.Formatter(
        '[%(asctime)s] SECURITY %(levelname)s: %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    security_handler.setFormatter(security_formatter)
    security_logger.addHandler(security_handler)
    
    # Also log security events to console in development
    if env == 'development':
        security_console = logging.StreamHandler()
        security_console.setLevel(logging.INFO)
        security_console.setFormatter(security_formatter)
        security_logger.addHandler(security_console)
    
    # ========================================
    # STARTUP MESSAGE
    # ========================================
    app.logger.info(f"=" * 60)
    app.logger.info(f"Fitness Tracker Application Starting")
    app.logger.info(f"Environment: {env}")
    app.logger.info(f"Log Level: {logging.getLevelName(log_level)}")
    app.logger.info(f"Logs Directory: {logs_dir}")
    app.logger.info(f"=" * 60)
    
    return app.logger, security_logger


def log_request_info(app):
    """
    Add request logging middleware.
    Logs all incoming requests with timing information.
    """
    @app.before_request
    def before_request():
        from flask import request, g
        from time import time
        
        g.start_time = time()
        
        # Log request details
        app.logger.debug(
            f"Request: {request.method} {request.path} "
            f"from {request.remote_addr}"
        )
    
    @app.after_request
    def after_request(response):
        from flask import request, g
        from time import time
        
        if hasattr(g, 'start_time'):
            elapsed = time() - g.start_time
            
            # Log response with timing
            app.logger.info(
                f"{request.method} {request.path} "
                f"completed in {elapsed:.3f}s "
                f"with status {response.status_code}"
            )
        
        return response


def log_security_event(logger, event_type, message, user_id=None, ip_address=None, severity='WARNING', **kwargs):
    """
    Log a security event with standardized format.
    
    Args:
        logger: Security logger instance
        event_type: Type of security event (login_failed, unauthorized_access, etc.)
        message: Detailed message
        user_id: User ID involved (if applicable)
        ip_address: IP address of the request
        severity: Log level (INFO, WARNING, ERROR, CRITICAL)
        **kwargs: Additional context to log
    """
    # Build context
    context_parts = [
        f"Event: {event_type}",
        f"Message: {message}"
    ]
    
    if user_id:
        context_parts.append(f"User: {user_id}")
    
    if ip_address:
        context_parts.append(f"IP: {ip_address}")
    
    # Add any additional context
    for key, value in kwargs.items():
        context_parts.append(f"{key}: {value}")
    
    # Log with appropriate level
    log_message = " | ".join(context_parts)
    
    if severity == 'INFO':
        logger.info(log_message)
    elif severity == 'WARNING':
        logger.warning(log_message)
    elif severity == 'ERROR':
        logger.error(log_message)
    elif severity == 'CRITICAL':
        logger.critical(log_message)
    else:
        logger.warning(log_message)


# ========================================
# CONVENIENCE FUNCTIONS
# ========================================

def get_logger(name):
    """
    Get a logger for a specific module.
    
    Args:
        name: Name of the module
    
    Returns:
        logging.Logger: Logger instance
    """
    return logging.getLogger(name)


def log_exception(logger, exception, context=""):
    """
    Log an exception with full stack trace.
    
    Args:
        logger: Logger instance
        exception: Exception object
        context: Additional context about where the exception occurred
    """
    logger.error(
        f"Exception occurred: {context}",
        exc_info=True,
        extra={
            'exception_type': type(exception).__name__,
            'exception_message': str(exception)
        }
    )

