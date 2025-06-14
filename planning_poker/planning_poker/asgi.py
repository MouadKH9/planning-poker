import os

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from planning_poker.routing import websocket_urlpatterns


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "planning_poker.settings")

django_asgi_application = get_asgi_application()
application = ProtocolTypeRouter(
    {
        "http": django_asgi_application,
        "websocket": AuthMiddlewareStack(URLRouter(websocket_urlpatterns)),
    }
)
