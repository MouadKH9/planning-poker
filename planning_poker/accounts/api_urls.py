from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .api_views import (
    CustomTokenObtainPairView,
    RegisterView,
    UserProfileView,
    LogoutView,
)

urlpatterns = [
    path("login/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("register/", RegisterView.as_view(), name="register"),
    path("profile/", UserProfileView.as_view(), name="profile"),
    path("logout/", LogoutView.as_view(), name="logout"),
]
