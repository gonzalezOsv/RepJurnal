"""
Rate Limiting Middleware
Prevents abuse and brute force attacks by limiting request rates per user/IP.
"""

from functools import wraps
from flask import jsonify, request, current_app
from flask_login import current_user
from datetime import datetime, timedelta
from collections import defaultdict
import threading

class RateLimiter:
    """
    Simple in-memory rate limiter.
    For production, consider using Redis or Flask-Limiter.
    """
    
    def __init__(self):
        self.requests = defaultdict(list)  # {key: [timestamp1, timestamp2, ...]}
        self.lock = threading.Lock()
    
    def is_allowed(self, key, max_requests, time_window_seconds):
        """
        Check if request is allowed based on rate limit.
        
        Args:
            key: Unique identifier (user_id or IP)
            max_requests: Maximum number of requests allowed
            time_window_seconds: Time window in seconds
        
        Returns:
            tuple: (is_allowed: bool, retry_after: int)
        """
        with self.lock:
            now = datetime.now()
            cutoff = now - timedelta(seconds=time_window_seconds)
            
            # Remove old timestamps
            self.requests[key] = [ts for ts in self.requests[key] if ts > cutoff]
            
            # Check if under limit
            if len(self.requests[key]) < max_requests:
                self.requests[key].append(now)
                return True, 0
            else:
                # Calculate retry-after time
                oldest_request = min(self.requests[key])
                retry_after = int((oldest_request + timedelta(seconds=time_window_seconds) - now).total_seconds())
                return False, max(retry_after, 1)
    
    def cleanup_old_entries(self, max_age_seconds=3600):
        """
        Periodically cleanup old entries to prevent memory bloat.
        Call this in a background thread or scheduled task.
        """
        with self.lock:
            cutoff = datetime.now() - timedelta(seconds=max_age_seconds)
            for key in list(self.requests.keys()):
                self.requests[key] = [ts for ts in self.requests[key] if ts > cutoff]
                if not self.requests[key]:
                    del self.requests[key]


# Global rate limiter instance
rate_limiter = RateLimiter()


def rate_limit(max_requests=100, time_window_seconds=60, key_func=None):
    """
    Rate limiting decorator for Flask routes.
    
    Args:
        max_requests: Maximum number of requests allowed
        time_window_seconds: Time window in seconds
        key_func: Function to generate rate limit key (defaults to user_id or IP)
    
    Usage:
        @rate_limit(max_requests=10, time_window_seconds=60)
        @login_required
        def my_route():
            pass
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Generate rate limit key
            if key_func:
                key = key_func()
            elif current_user.is_authenticated:
                key = f"user_{current_user.user_id}"
            else:
                # Use IP address for unauthenticated requests
                key = f"ip_{request.remote_addr}"
            
            # Check rate limit
            is_allowed, retry_after = rate_limiter.is_allowed(key, max_requests, time_window_seconds)
            
            if not is_allowed:
                current_app.logger.warning(
                    f"Rate limit exceeded for {key} on {request.endpoint}"
                )
                response = jsonify({
                    'error': 'Too many requests. Please slow down.',
                    'retry_after': retry_after
                })
                response.status_code = 429
                response.headers['Retry-After'] = str(retry_after)
                return response
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator


def rate_limit_strict(max_requests=5, time_window_seconds=60):
    """
    Strict rate limiting for sensitive operations (create, update, delete).
    
    Usage:
        @rate_limit_strict(max_requests=5, time_window_seconds=60)
        @login_required
        def sensitive_operation():
            pass
    """
    return rate_limit(max_requests, time_window_seconds)


def rate_limit_lenient(max_requests=200, time_window_seconds=60):
    """
    Lenient rate limiting for read operations (GET requests).
    
    Usage:
        @rate_limit_lenient()
        @login_required
        def get_data():
            pass
    """
    return rate_limit(max_requests, time_window_seconds)




