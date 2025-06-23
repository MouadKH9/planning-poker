from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from planning_poker.models import UserRole


class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    is_admin = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "username", "email", "role", "is_admin")

    def get_role(self, obj):
        """Get user role with proper fallbacks"""
        try:
            if hasattr(obj, "role") and obj.role:
                return obj.role.role
            elif obj.is_superuser or obj.is_staff:
                return "admin"
            else:
                return "participant"
        except:
            return "participant"

    def get_is_admin(self, obj):
        """Check if user is admin"""
        try:
            if hasattr(obj, "role") and obj.role:
                return obj.role.role == "admin"
            return obj.is_superuser or obj.is_staff
        except:
            return False


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ("username", "password", "password2", "email")

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError(
                {"password": "Password fields didn't match."}
            )
        return attrs

    def create(self, validated_data):
        validated_data.pop("password2", None)
        user = User.objects.create_user(**validated_data)

        # Create UserRole for new user
        UserRole.objects.get_or_create(
            user=user,
            defaults={"role": UserRole.PARTICIPANT},
        )

        return user
