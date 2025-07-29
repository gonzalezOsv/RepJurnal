import re

def format_phone_number(phone):
    """
    Formats a phone number to the format '123-123-1234'.
    
    :param phone: The phone number as a string (raw input).
    :return: A formatted phone number string or None if invalid or empty.
    """

    if not phone or not phone.strip():
        # Return None if the phone number is empty or only contains whitespace
        return None
    
    # Remove all non-digit characters
    digits = re.sub(r'\D', '', phone)
    
    # Check if the number has 10 digits
    if len(digits) == 10:
        # Format as '123-123-1234'
        return f"{digits[:3]}-{digits[3:6]}-{digits[6:]}"
    else:
        # Return None if the phone number is invalid
        return None
