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
    participants = ParticipantSerializer(
        many=True, read_only=True, source="participant_set"
    )

    class Meta:
        model = Room
        fields = [
            "id",
            "code",
            "project_name",
            "point_system",
            "status",
            "host_username",
            "participants",
        ]
        read_only_fields = ["id", "code", "status", "host_username"]


class SessionLogSerializer(serializers.ModelSerializer):
    room_code = serializers.CharField(source="room.code", read_only=True)
    room_host = serializers.CharField(source="room.host.username", read_only=True)
    project_name = serializers.CharField(source="room.project_name", read_only=True)
    point_system = serializers.CharField(source="room.point_system", read_only=True)

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
