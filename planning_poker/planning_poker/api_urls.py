from django.urls import path, include
from rest_framework.routers import DefaultRouter

from planning_poker.api_views import RoomViewSet

# Create a router and register our viewsets with it.
router = DefaultRouter()
router.register(r'rooms', RoomViewSet, basename='room')

# The API URLs are now determined automatically by the router.
urlpatterns = [
    path('', include(router.urls)),
] 