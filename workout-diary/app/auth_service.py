from werkzeug.security import check_password_hash
from .models import User

class AuthService:
    def __init__(self, user_retrieval_function):
        self.get_user_by_username = user_retrieval_function

    def authenticate(self, username, password):
        print("Retrieving user by username:", username)
        user = self.get_user_by_username(username)
        if user:
            print("User found:", user.username)
            if check_password_hash(user.password_hash, password):
                print("Password correct")
                return user
            else:
                print("Password incorrect")
        else:
            print("No user found with username:", username)
        return None

