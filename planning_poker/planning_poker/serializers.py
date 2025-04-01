from rest_framework import serializers
from planning_poker.models import Room, Participant, SessionLog


class ParticipantSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    has_selected = serializers.SerializerMethodField()

    class Meta:
        model = Participant
        fields = ['id', 'username', 'has_selected']
        read_only_fields = ['id', 'username', 'has_selected']

    def get_has_selected(self, obj):
        return obj.card_selection is not None


class RoomSerializer(serializers.ModelSerializer):
    host_username = serializers.CharField(source='host.username', read_only=True)
    participants = ParticipantSerializer(many=True, read_only=True, source='participant_set')

    class Meta:
        model = Room
        fields = ['id', 'code', 'status', 'host_username', 'participants']
        read_only_fields = ['id', 'code', 'status', 'host_username']


class SessionLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SessionLog
        fields = ['id', 'timestamp', 'story_point_average', 'participant_selections']
        read_only_fields = ['id', 'timestamp', 'story_point_average', 'participant_selections'] 