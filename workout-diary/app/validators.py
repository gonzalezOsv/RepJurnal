"""
Input validation functions for the Fitness Tracker application.
Validates and sanitizes user input to prevent security vulnerabilities.
"""

import re
from typing import Tuple


def validate_password_strength(password: str) -> Tuple[bool, str]:
    """
    Validate password meets security requirements.
    
    Requirements:
    - At least 8 characters
    - At least one lowercase letter
    - At least one uppercase letter
    - At least one number
    - At least one special character
    - Not a common password
    
    Returns:
        (bool, str): (is_valid, error_message)
    """
    if not password:
        return False, "Password is required"
    
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if len(password) > 128:
        return False, "Password must not exceed 128 characters"
    
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"
    
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    
    if not re.search(r"\d", password):
        return False, "Password must contain at least one number"
    
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>_\-+=\[\]\\\/~`]", password):
        return False, "Password must contain at least one special character (!@#$%^&* etc.)"
    
    # Check for common passwords
    common_passwords = [
        'password', '12345678', 'qwerty', 'abc123', 'password123', 
        'admin', 'letmein', 'welcome', 'monkey', '1234567890',
        'password1', 'qwerty123', 'admin123', 'test1234'
    ]
    if password.lower() in common_passwords:
        return False, "Password is too common. Please choose a stronger password"
    
    return True, ""


def validate_email(email: str) -> Tuple[bool, str]:
    """
    Validate email format using regex.
    
    Returns:
        (bool, str): (is_valid, error_message)
    """
    if not email:
        return False, "Email is required"
    
    # RFC 5322 compliant email regex (simplified)
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    
    if not re.match(email_regex, email):
        return False, "Invalid email format"
    
    if len(email) > 254:  # RFC 5321
        return False, "Email address is too long"
    
    # Check for suspicious patterns
    if '..' in email or email.startswith('.') or email.endswith('.'):
        return False, "Invalid email format"
    
    return True, ""


def validate_username(username: str) -> Tuple[bool, str]:
    """
    Validate username format.
    
    Requirements:
    - 3-20 characters
    - Only letters, numbers, hyphens, and underscores
    - Cannot start or end with hyphen/underscore
    
    Returns:
        (bool, str): (is_valid, error_message)
    """
    if not username:
        return False, "Username is required"
    
    if len(username) < 3:
        return False, "Username must be at least 3 characters"
    
    if len(username) > 20:
        return False, "Username must not exceed 20 characters"
    
    if not re.match(r'^[a-zA-Z0-9][a-zA-Z0-9_-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$', username):
        return False, "Username can only contain letters, numbers, hyphens, and underscores, and cannot start or end with hyphen/underscore"
    
    return True, ""


def validate_weight(weight: float, allow_zero: bool = False) -> Tuple[bool, str]:
    """
    Validate exercise weight value.
    
    Args:
        weight: Weight value to validate
        allow_zero: Whether to allow 0 (for bodyweight exercises)
    
    Returns:
        (bool, str): (is_valid, error_message)
    """
    try:
        weight = float(weight)
    except (ValueError, TypeError):
        return False, "Weight must be a valid number"
    
    if not allow_zero and weight <= 0:
        return False, "Weight must be greater than 0"
    
    if allow_zero and weight < 0:
        return False, "Weight cannot be negative"
    
    if weight > 10000:  # Reasonable maximum weight in lbs
        return False, "Weight value is too large (maximum 10,000 lbs)"
    
    return True, ""


def validate_reps(reps: int) -> Tuple[bool, str]:
    """
    Validate exercise reps value.
    
    Returns:
        (bool, str): (is_valid, error_message)
    """
    try:
        reps = int(reps)
    except (ValueError, TypeError):
        return False, "Reps must be a whole number"
    
    if reps < 1:
        return False, "Reps must be at least 1"
    
    if reps > 1000:  # Reasonable maximum
        return False, "Reps value is too large (maximum 1,000)"
    
    return True, ""


def validate_sets(sets: int) -> Tuple[bool, str]:
    """
    Validate exercise sets value.
    
    Returns:
        (bool, str): (is_valid, error_message)
    """
    try:
        sets = int(sets)
    except (ValueError, TypeError):
        return False, "Sets must be a whole number"
    
    if sets < 1:
        return False, "Sets must be at least 1"
    
    if sets > 100:  # Reasonable maximum
        return False, "Sets value is too large (maximum 100)"
    
    return True, ""


def validate_name(name: str, field_name: str = "Name", min_length: int = 2, max_length: int = 50) -> Tuple[bool, str]:
    """
    Validate name fields (first name, last name, etc.).
    
    Args:
        name: Name to validate
        field_name: Name of the field (for error messages)
        min_length: Minimum length
        max_length: Maximum length
    
    Returns:
        (bool, str): (is_valid, error_message)
    """
    if not name:
        return False, f"{field_name} is required"
    
    # Strip whitespace
    name = name.strip()
    
    if len(name) < min_length:
        return False, f"{field_name} must be at least {min_length} characters"
    
    if len(name) > max_length:
        return False, f"{field_name} must not exceed {max_length} characters"
    
    # Allow letters, spaces, hyphens, apostrophes (for names like O'Brien, Mary-Jane)
    if not re.match(r"^[a-zA-Z\s\-']+$", name):
        return False, f"{field_name} can only contain letters, spaces, hyphens, and apostrophes"
    
    return True, ""


def validate_date_string(date_str: str) -> Tuple[bool, str]:
    """
    Validate date string format (YYYY-MM-DD).
    
    Returns:
        (bool, str): (is_valid, error_message)
    """
    if not date_str:
        return False, "Date is required"
    
    # Check format
    if not re.match(r'^\d{4}-\d{2}-\d{2}$', date_str):
        return False, "Date must be in YYYY-MM-DD format"
    
    # Validate actual date
    try:
        from datetime import datetime
        datetime.strptime(date_str, '%Y-%m-%d')
    except ValueError:
        return False, "Invalid date"
    
    return True, ""


def sanitize_input(text: str, max_length: int = 255, allow_special_chars: bool = False) -> str:
    """
    Sanitize user input by stripping whitespace and limiting length.
    
    Args:
        text: Input text to sanitize
        max_length: Maximum allowed length
        allow_special_chars: Whether to allow special characters
    
    Returns:
        str: Sanitized text
    """
    if not text:
        return ""
    
    # Strip leading/trailing whitespace
    text = text.strip()
    
    # Limit length
    if len(text) > max_length:
        text = text[:max_length]
    
    # If special chars not allowed, keep only alphanumeric and basic punctuation
    if not allow_special_chars:
        # Keep letters, numbers, spaces, and basic punctuation
        text = re.sub(r'[^a-zA-Z0-9\s\.,!?\-_@]', '', text)
    
    return text


def validate_phone_number(phone: str) -> Tuple[bool, str]:
    """
    Validate phone number format (various formats accepted).
    
    Returns:
        (bool, str): (is_valid, error_message)
    """
    if not phone:
        return True, ""  # Phone is optional
    
    # Remove common separators
    phone_clean = re.sub(r'[\s\-\(\)\.]', '', phone)
    
    # Check if it's all digits (and optionally a leading +)
    if not re.match(r'^\+?\d{7,15}$', phone_clean):
        return False, "Invalid phone number format"
    
    return True, ""


def validate_height(height_cm: float) -> Tuple[bool, str]:
    """
    Validate height in centimeters.
    
    Returns:
        (bool, str): (is_valid, error_message)
    """
    if height_cm is None:
        return True, ""  # Height is optional
    
    try:
        height_cm = float(height_cm)
    except (ValueError, TypeError):
        return False, "Height must be a valid number"
    
    if height_cm < 50:  # ~1'8"
        return False, "Height is too small (minimum 50 cm)"
    
    if height_cm > 300:  # ~9'10"
        return False, "Height is too large (maximum 300 cm)"
    
    return True, ""


def validate_body_weight(weight_kg: float) -> Tuple[bool, str]:
    """
    Validate body weight in kilograms.
    
    Returns:
        (bool, str): (is_valid, error_message)
    """
    if weight_kg is None:
        return True, ""  # Weight is optional
    
    try:
        weight_kg = float(weight_kg)
    except (ValueError, TypeError):
        return False, "Weight must be a valid number"
    
    if weight_kg < 20:  # ~44 lbs
        return False, "Weight is too small (minimum 20 kg)"
    
    if weight_kg > 500:  # ~1100 lbs
        return False, "Weight is too large (maximum 500 kg)"
    
    return True, ""


# Validation helpers for common use cases
def validate_registration_data(username: str, email: str, password: str, first_name: str, last_name: str) -> Tuple[bool, dict]:
    """
    Validate all registration form data.
    
    Returns:
        (bool, dict): (is_valid, error_dict)
    """
    errors = {}
    
    # Validate username
    is_valid, error = validate_username(username)
    if not is_valid:
        errors['username'] = error
    
    # Validate email
    is_valid, error = validate_email(email)
    if not is_valid:
        errors['email'] = error
    
    # Validate password
    is_valid, error = validate_password_strength(password)
    if not is_valid:
        errors['password'] = error
    
    # Validate first name
    is_valid, error = validate_name(first_name, "First name")
    if not is_valid:
        errors['first_name'] = error
    
    # Validate last name
    is_valid, error = validate_name(last_name, "Last name")
    if not is_valid:
        errors['last_name'] = error
    
    return (len(errors) == 0, errors)


def validate_exercise_log(weight: float, reps: int, sets: int, allow_bodyweight: bool = True) -> Tuple[bool, dict]:
    """
    Validate exercise logging data.
    
    Args:
        weight: Exercise weight
        reps: Number of reps
        sets: Number of sets
        allow_bodyweight: Whether to allow 0 weight for bodyweight exercises
    
    Returns:
        (bool, dict): (is_valid, error_dict)
    """
    errors = {}
    
    # Validate weight
    is_valid, error = validate_weight(weight, allow_zero=allow_bodyweight)
    if not is_valid:
        errors['weight'] = error
    
    # Validate reps
    is_valid, error = validate_reps(reps)
    if not is_valid:
        errors['reps'] = error
    
    # Validate sets
    is_valid, error = validate_sets(sets)
    if not is_valid:
        errors['sets'] = error
    
    return (len(errors) == 0, errors)

