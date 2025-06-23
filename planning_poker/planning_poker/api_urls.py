from django.urls import path, include
from rest_framework.routers import DefaultRouter

from planning_poker.api_views import RoomViewSet, get_room_by_code

# Create a router and register our viewsets with it.
router = DefaultRouter()
router.register(r"rooms", RoomViewSet, basename="room")

# The API URLs are now determined automatically by the router.
urlpatterns = [
    path("", include(router.urls)),
    path("rooms/code/<str:room_code>/", get_room_by_code, name="room_by_code"),
    path("auth/", include("accounts.api_urls")),
]

# No changes needed, router exposes /api/rooms/{id}/session-logs/
