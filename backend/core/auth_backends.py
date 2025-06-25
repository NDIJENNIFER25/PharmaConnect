from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model

User = get_user_model()

class EmailBackend(ModelBackend):
    """
    Custom authentication backend that allows users to login using their email address.
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        try:
            # Get the user_type from kwargs if provided, otherwise default to None
            user_type = kwargs.get('user_type', None)
            
            # Get users with the given email
            users = User.objects.filter(email=username)
            
            # Filter by user_type if provided
            if user_type:
                users = users.filter(user_type=user_type)
                
            # If no users found, return None
            if not users.exists():
                return None
                
            # If multiple users found with same email and user_type, log a warning but return the first one
            if users.count() > 1:
                print(f"Warning: Multiple users found with email {username} and user_type {user_type}")
            
            # Return the first matching user
            user = users.first()
                
            if user and user.check_password(password):
                return user
        except User.DoesNotExist:
            return None
        return None

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
