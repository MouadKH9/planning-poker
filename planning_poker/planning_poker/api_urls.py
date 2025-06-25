from django.urls import path, include
from rest_framework.routers import DefaultRouter

from planning_poker.api_views import (
    RoomViewSet,
    get_room_by_code,
    get_all_user_session_logs,
    export_all_session_logs,
)

# Create a router and register our viewsets with it.
router = DefaultRouter()
router.register(r"rooms", RoomViewSet, basename="room")

# The API URLs are now determined automatically by the router.
urlpatterns = [
    path("", include(router.urls)),
    path("rooms/code/<str:room_code>/", get_room_by_code, name="room_by_code"),
    path(
        "rooms/admin_last_room/",
        RoomViewSet.as_view({"get": "last_room"}),
        name="last_room",
    ),
    path("session-logs/all/", get_all_user_session_logs, name="all_session_logs"),
    path(
        "session-logs/export/", export_all_session_logs, name="export_all_session_logs"
    ),
    path("auth/", include("accounts.api_urls")),
]

# Router automatically exposes:
# /api/rooms/{id}/session-logs/export/ for individual room export
