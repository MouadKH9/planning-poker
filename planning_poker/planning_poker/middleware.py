from django.contrib.auth.models import User
from django.contrib.auth import login


class AutoAuthMiddleware:
    """
    Middleware to automatically authenticate users for development.
    Remove this in production!
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Auto-login as admin user for development
        if not request.user.is_authenticated:
            try:
                admin_user = User.objects.get(username="admin")
                login(request, admin_user)
            except User.DoesNotExist:
                pass

        response = self.get_response(request)
        return response
