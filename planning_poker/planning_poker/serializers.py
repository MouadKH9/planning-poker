from rest_framework import serializers
from planning_poker.models import Room, Participant, SessionLog, UserRole
from django.contrib.auth.models import User


class ParticipantSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    has_selected = serializers.SerializerMethodField()

    class Meta:
        model = Participant
        fields = ["id", "username", "has_selected"]
        read_only_fields = ["id", "username", "has_selected"]

    def get_has_selected(self, obj):
        return obj.card_selection is not None


class RoomSerializer(serializers.ModelSerializer):
    host_username = serializers.CharField(source="host.username", read_only=True)
    participant_count = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = [
            "id",
            "code",
            "project_name",
            "point_system",
            "status",
            "host",
            "host_username",
            "participant_count",
            "created_at",
            "enable_timer",
            "timer_duration",
            "is_timer_active",
            "timer_start_time",
            "timer_end_time",
            "last_activity",
            "auto_closed",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "host_username",
            "participant_count",
            "last_activity",
            "auto_closed",
        ]

    def validate_code(self, value):
        """Validate that code is not empty or blank"""
        if not value or not value.strip():
            raise serializers.ValidationError("Room code cannot be empty or blank")
        return value.strip()

    def get_participant_count(self, obj):
        return obj.participant_set.count()


class SessionLogSerializer(serializers.ModelSerializer):
    room_code = serializers.CharField(source="room.code", read_only=True)
    room_host = serializers.CharField(source="room.host.username", read_only=True)
    project_name = serializers.CharField(source="room.project_name", read_only=True)
    point_system = serializers.CharField(source="room.point_system", read_only=True)
    created_at = serializers.DateTimeField(source="room.created_at", read_only=True)
    updated_at = serializers.DateTimeField(source="room.updated_at", read_only=True)
    last_activity = serializers.DateTimeField(
        source="room.last_activity", read_only=True
    )

    class Meta:
        model = SessionLog
        fields = [
            "id",
            "timestamp",
            "story_point_average",
            "participant_selections",
            "project_name",
            "point_system",
            "room",
            "room_code",
            "room_host",
            "created_at",
            "updated_at",
            "last_activity",
        ]
        read_only_fields = [
            "id",
            "timestamp",
            "story_point_average",
            "project_name",
            "point_system",
            "participant_selections",
            "room",
            "room_code",
            "room_host",
            "created_at",
            "updated_at",
            "last_activity",
        ]


class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    is_admin = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "email", "role", "is_admin"]

    def get_role(self, obj):
        try:
            return obj.role.role
        except (AttributeError, UserRole.DoesNotExist):
            return UserRole.PARTICIPANT

    def get_is_admin(self, obj):
        try:
            return obj.role.role == UserRole.ADMIN
        except (AttributeError, UserRole.DoesNotExist):
            return False
