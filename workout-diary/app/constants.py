# Constants for your application
# 
# ⚠️ SECURITY WARNING: Do NOT store secrets here!
# All secrets must be stored in environment variables (.env file)
# 
# This file should only contain NON-SENSITIVE constants

# Application constants
DEFAULT_USER_ROLE = 'user'
MAX_LOGIN_ATTEMPTS = 5
SESSION_TIMEOUT_HOURS = 2
MAX_UPLOAD_SIZE_MB = 10

# Pagination
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100

# Workout limits
MAX_SETS_PER_EXERCISE = 100
MAX_REPS_PER_SET = 1000
MAX_WEIGHT_LBS = 10000

# NOTE: Database URI, JWT secrets, and API keys should be loaded from environment variables
# See .env.example for required environment variables

