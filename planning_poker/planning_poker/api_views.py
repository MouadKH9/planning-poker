from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from planning_poker.models import Room, Participant, SessionLog
from planning_poker.fields import STATUS_CHOICES
from planning_poker.serializers import RoomSerializer, SessionLogSerializer
from planning_poker.utils import generate_unique_room_code


class RoomViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Room model with additional actions for planning poker functionality.
    """

    queryset = Room.objects.all()
    serializer_class = RoomSerializer

    def create(self, request, *args, **kwargs):
        """Create a new room (POST /api/rooms/)"""
        host = request.user  # This would require authentication

        # Generate a unique room code
        code = generate_unique_room_code()

        room = Room.objects.create(host=host, code=code, status=STATUS_CHOICES.PENDING)

        serializer = self.get_serializer(room)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def retrieve(self, request, pk=None, *args, **kwargs):
        """Fetch room details (GET /api/rooms/{id}/)"""
        room = get_object_or_404(Room, id=pk)
        participants = Participant.objects.filter(room=room)

        return Response(
            {
                "id": room.id,
                "code": room.code,
                "status": room.status,
                "host": room.host.username,
                "participants": [
                    {
                        "id": p.id,
                        "username": p.user.username,
                        "has_selected": p.card_selection is not None,
                    }
                    for p in participants
                ],
            }
        )

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        """Start a new round (POST /api/rooms/{id}/start/)"""
        room = get_object_or_404(Room, id=pk)

        # Check if the user is the host (in a real app)
        # if request.user != room.host:
        #     return Response({'error': 'Only the host can start a round'}, status=status.HTTP_403_FORBIDDEN)

        # Reset all card selections
        Participant.objects.filter(room=room).update(card_selection=None)

        # Update room status
        room.status = STATUS_CHOICES.ACTIVE
        room.save()

        serializer = self.get_serializer(room)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def reveal(self, request, pk=None):
        """Reveal cards (POST /api/rooms/{id}/reveal/)"""
        room = get_object_or_404(Room, id=pk)

        # Check if the user is the host (in a real app)
        # if request.user != room.host:
        #     return Response({'error': 'Only the host can reveal cards'}, status=status.HTTP_403_FORBIDDEN)

        participants = Participant.objects.filter(room=room)
        selections = {}
        total = 0
        count = 0

        for participant in participants:
            if participant.card_selection:
                try:
                    card_value = float(participant.card_selection)
                    total += card_value
                    count += 1
                except ValueError:
                    # Handle non-numeric cards like "Pass", "?", etc.
                    pass

                selections[participant.user.username] = participant.card_selection

        # Calculate average if there are numeric selections
        average = total / count if count > 0 else 0

        # Create session log
        session_log = SessionLog.objects.create(
            room=room, story_point_average=average, participant_selections=selections
        )

        # Update room status
        room.status = STATUS_CHOICES.COMPLETED
        room.save()

        # Return both room and session log data
        room_serializer = self.get_serializer(room)
        session_log_serializer = SessionLogSerializer(session_log)

        return Response(
            {"room": room_serializer.data, "session_log": session_log_serializer.data}
        )

    @action(detail=True, methods=["post"])
    def skip(self, request, pk=None):
        """Skip a participant (POST /api/rooms/{id}/skip/)"""
        participant_id = request.data.get("participant_id")

        if not participant_id:
            return Response(
                {"error": "Participant ID is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        room = get_object_or_404(Room, id=pk)
        participant = get_object_or_404(Participant, id=participant_id, room=room)

        # Check if the user is the host (in a real app)
        # if request.user != room.host:
        #     return Response({'error': 'Only the host can skip participants'}, status=status.HTTP_403_FORBIDDEN)

        # Set a special value for skipped participants
        participant.card_selection = "SKIPPED"
        participant.save()

        # Return updated room data
        serializer = self.get_serializer(room)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def logs(self, request, pk=None):
        """Fetch session logs (GET /api/rooms/{id}/logs/)"""
        room = get_object_or_404(Room, id=pk)
        logs = SessionLog.objects.filter(room=room).order_by("-timestamp")

        # Check if the user is the host or a participant (in a real app)
        # if request.user != room.host and not Participant.objects.filter(room=room, user=request.user).exists():
        #     return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

        # Serialize the logs
        serializer = SessionLogSerializer(logs, many=True)

        return Response(
            {"room_id": room.id, "room_code": room.code, "logs": serializer.data}
        )
