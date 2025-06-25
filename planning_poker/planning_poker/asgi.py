import os
import django
from django.core.asgi import get_asgi_application

# Set the Django settings module
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "planning_poker.settings")

# Setup Django before importing anything else
django.setup()

# Now import Django Channels components
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from planning_poker.routing import websocket_urlpatterns

# Get the Django ASGI application
django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": AuthMiddlewareStack(URLRouter(websocket_urlpatterns)),
    }
)
