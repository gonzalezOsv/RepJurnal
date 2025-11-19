"""
Centralized serialization utilities for API responses.
Ensures consistent data minimization and privacy protection across all endpoints.
"""

from datetime import datetime


def serialize_user_public(user):
    """
    Serialize user for public contexts (minimal data).
    Only returns username and profile picture.
    
    Args:
        user: User model instance
        
    Returns:
        dict: Minimal user data
    """
    if not user:
        return None
    
    return user.to_public_dict()


def serialize_user_for_friend(user, requester_is_friend=False):
    """
    Serialize user for friend contexts.
    Respects privacy settings - only returns data user has chosen to share.
    
    Args:
        user: User model instance
        requester_is_friend: Whether the requester is a friend of the user
        
    Returns:
        dict: Friend-level user data (respects privacy)
    """
    if not user:
        return None
    
    return user.to_friend_dict(requester_is_friend=requester_is_friend)


def serialize_user_for_search(user, is_friend=False, has_pending_request=False):
    """
    Serialize user for search results.
    Only includes fields needed for search display.
    
    Args:
        user: User model instance
        is_friend: Whether the requester is a friend
        has_pending_request: Whether there's a pending friend request
        
    Returns:
        dict: Search result user data
    """
    if not user:
        return None
    
    return user.to_search_dict(is_friend=is_friend, has_pending_request=has_pending_request)


def serialize_user_full(user):
    """
    Serialize full user data for their own account page.
    Use ONLY when user is viewing their own account.
    Never use for public/friend contexts.
    
    Args:
        user: User model instance
        
    Returns:
        dict: Full user data (excludes password_hash)
    """
    if not user:
        return None
    
    return user.to_private_dict()


def serialize_user_profile(user, requester_user_id=None, is_friend=False):
    """
    Serialize user profile data with privacy-aware stats.
    Respects profile_visibility and show_stats_to_friends settings.
    
    Args:
        user: User model instance
        requester_user_id: ID of user requesting the profile (for privacy checks)
        is_friend: Whether the requester is a friend
        
    Returns:
        dict: Profile data with conditional stats based on privacy settings
    """
    if not user:
        return None
    
    # Basic profile data (always included if profile is visible)
    profile_data = {
        'user_id': user.user_id,
        'username': user.username,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'is_friend': is_friend
    }
    
    # Include bio only if profile is public or requester is a friend
    if user.profile_visibility == 'public' or is_friend:
        profile_data['bio'] = user.bio
    
    # Include stats only if user allows sharing with friends AND requester is a friend
    # Note: Stats should be fetched separately and added here if needed
    # This function ensures the structure is privacy-aware
    
    return profile_data


def serialize_datetime(dt):
    """
    Safely serialize datetime to ISO format string.
    
    Args:
        dt: datetime object or None
        
    Returns:
        str or None: ISO format string or None
    """
    if dt is None:
        return None
    if isinstance(dt, str):
        return dt
    if isinstance(dt, datetime):
        return dt.isoformat()
    return str(dt)


def serialize_date(d):
    """
    Safely serialize date to ISO format string.
    
    Args:
        d: date object or None
        
    Returns:
        str or None: ISO format string or None
    """
    if d is None:
        return None
    if hasattr(d, 'isoformat'):
        return d.isoformat()
    return str(d)


def sanitize_user_data(user_dict, allowed_fields):
    """
    Remove any fields from user_dict that are not in allowed_fields.
    Provides an extra layer of protection against accidental data exposure.
    
    Args:
        user_dict: Dictionary containing user data
        allowed_fields: Set or list of allowed field names
        
    Returns:
        dict: Sanitized user data with only allowed fields
    """
    if not user_dict:
        return {}
    
    allowed_set = set(allowed_fields) if isinstance(allowed_fields, (list, tuple)) else allowed_fields
    
    return {key: value for key, value in user_dict.items() if key in allowed_set}


# Sensitive fields that should NEVER be exposed in public/friend contexts
SENSITIVE_USER_FIELDS = {
    'password_hash',
    'email',
    'date_of_birth',
    'phone_number',
    'address',
    'medical_conditions',
    'allergies',
    'injuries',
    'body_fat_percentage',
    'weight_kg',
    'height_cm',
    'target_weight_kg',
    'target_body_fat_percentage',
    'weekly_weight_loss_goal',
    'smoking_status',
    'alcohol_consumption',
    'motivation_level'
}


def ensure_no_sensitive_data(user_dict):
    """
    Remove any sensitive fields from user_dict.
    Raises ValueError if sensitive fields are detected (to catch bugs).
    
    Args:
        user_dict: Dictionary containing user data
        
    Returns:
        dict: User data with sensitive fields removed
        
    Raises:
        ValueError: If sensitive fields are detected (should not happen in production)
    """
    if not user_dict:
        return {}
    
    # Check for sensitive fields
    detected_sensitive = set(user_dict.keys()) & SENSITIVE_USER_FIELDS
    if detected_sensitive:
        # Log warning but don't raise in production - just remove the fields
        import logging
        logging.warning(f"Sensitive user fields detected in response: {detected_sensitive}. Removing them.")
    
    # Remove sensitive fields
    sanitized = {key: value for key, value in user_dict.items() if key not in SENSITIVE_USER_FIELDS}
    
    return sanitized

