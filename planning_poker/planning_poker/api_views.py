import csv
from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from planning_poker.serializers import RoomSerializer, SessionLogSerializer
from planning_poker.utils import generate_unique_room_code

from planning_poker.models import Room, Participant, SessionLog
from planning_poker.fields import STATUS_CHOICES, POINT_SYSTEMS
import logging

logger = logging.getLogger(__name__)


class RoomViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Room model with additional actions for planning poker functionality.
    """

    queryset = Room.objects.all()
    serializer_class = RoomSerializer

    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        if self.action == "create":
            self.permission_classes = [IsAuthenticated]
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        """Create a new room (POST /api/rooms/)"""
        try:
            host = request.user
            project_name = request.data.get("project_name")
            point_system = request.data.get("point_system", POINT_SYSTEMS.FIBONACCI)
            auto_reveal_cards = request.data.get("auto_reveal_cards", False)
            allow_skip = request.data.get("allow_skip", True)
            enable_timer = request.data.get("enable_timer", False)
            timer_duration = request.data.get("timer_duration", 60)

            if not project_name:
                return Response(
                    {"error": "Project name is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Validate point system
            valid_point_systems = [choice[0] for choice in POINT_SYSTEMS.choices]
            if point_system not in valid_point_systems:
                return Response(
                    {
                        "error": f"Invalid point system. Valid options: {valid_point_systems}"
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Generate a unique room code with retry logic
            max_attempts = 10
            for attempt in range(max_attempts):
                code = generate_unique_room_code()

                if not Room.objects.filter(code=code).exists():
                    break

                if attempt == max_attempts - 1:
                    return Response(
                        {
                            "error": "Unable to generate unique room code. Please try again."
                        },
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )

            room = Room.objects.create(
                host=host,
                code=code,
                project_name=project_name,
                point_system=point_system,
                auto_reveal_cards=auto_reveal_cards,
                allow_skip=allow_skip,
                enable_timer=enable_timer,
                timer_duration=timer_duration,
                status=STATUS_CHOICES.PENDING,
            )

            serializer = self.get_serializer(room)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Error creating room: {e}")
            return Response(
                {"error": "Failed to create room. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def retrieve(self, request, pk=None, *args, **kwargs):
        """Fetch room details (GET /api/rooms/{id}/)"""
        # Try to get by code first, then by ID
        room = None
        try:
            # Try by code first (most common case for room access)
            room = Room.objects.get(code=pk)
        except Room.DoesNotExist:
            try:
                # Try by ID if it's numeric
                if pk.isdigit():
                    room = Room.objects.get(id=int(pk))
            except Room.DoesNotExist:
                pass

        if not room:
            return Response(
                {"error": "Room not found"}, status=status.HTTP_404_NOT_FOUND
            )

        participants = Participant.objects.filter(room=room)

        return Response(
            {
                "id": room.id,
                "code": room.code,
                "project_name": room.project_name,
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

    @action(
        detail=True,
        methods=["get"],
        url_path="session-logs",
        permission_classes=[IsAuthenticated],
    )
    def session_logs(self, request, pk=None):
        """
        Expose all session logs (votes/results) for a room to the room creator (host).
        GET /api/rooms/{id}/session-logs/
        """
        room = get_object_or_404(Room, id=pk)
        if room.host != request.user:
            return Response(
                {"error": "Only the room creator can view session logs."},
                status=status.HTTP_403_FORBIDDEN,
            )
        logs = SessionLog.objects.filter(room=room).order_by("-timestamp")
        serializer = SessionLogSerializer(logs, many=True)
        return Response(serializer.data)

    @action(
        detail=True,
        methods=["get"],
        url_path="session-logs/export",
        permission_classes=[IsAuthenticated],
    )
    def export_session_logs(self, request, pk=None):
        """
        Export session logs as CSV for a specific room.
        GET /api/rooms/{id}/session-logs/export/
        """
        room = get_object_or_404(Room, id=pk)
        if room.host != request.user:
            return Response(
                {"error": "Only the room creator can export session logs."},
                status=status.HTTP_403_FORBIDDEN,
            )

        logs = SessionLog.objects.filter(room=room).order_by("-timestamp")

        # Create CSV response
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = (
            f'attachment; filename="session_logs_{room.code}.csv"'
        )

        writer = csv.writer(response)
        writer.writerow(
            [
                "Session ID",
                "Room Code",
                "Project Name",
                "Host",
                "Timestamp",
                "Story Point Average",
                "Total Participants",
                "Participant Selections",
                "Total Votes",
            ]
        )

        for log in logs:
            participant_count = len(log.participant_selections)
            total_votes = sum(
                1
                for selection in log.participant_selections.values()
                if selection and selection != "SKIPPED"
            )

            # Format participant selections as readable string
            selections_str = "; ".join(
                [f"{user}: {vote}" for user, vote in log.participant_selections.items()]
            )

            writer.writerow(
                [
                    log.id,
                    room.code,
                    room.project_name,
                    room.host.username,
                    log.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                    log.story_point_average,
                    participant_count,
                    selections_str,
                    total_votes,
                ]
            )

        return response


@api_view(["GET"])
def get_room_by_code(request, room_code):
    """Get room by code (GET /api/rooms/code/{code}/)"""
    try:
        room = Room.objects.get(code=room_code)
        participants = Participant.objects.filter(room=room)

        return Response(
            {
                "id": room.id,
                "code": room.code,
                "project_name": room.project_name,
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
    except Room.DoesNotExist:
        return Response({"error": "Room not found"}, status=status.HTTP_404_NOT_FOUND)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_all_user_session_logs(request):
    """
    Get all session logs for all rooms created by the current user (host).
    GET /api/session-logs/all/
    """
    user = request.user
    # Get all rooms where the user is the host
    rooms = Room.objects.filter(host=user)
    # Get all session logs for those rooms with room information
    logs = (
        SessionLog.objects.filter(room__in=rooms)
        .select_related("room", "room__host")
        .order_by("-timestamp")
    )
    serializer = SessionLogSerializer(logs, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def export_all_session_logs(request):
    """
    Export all session logs for all rooms created by the current user as CSV.
    GET /api/session-logs/export/
    """
    user = request.user
    rooms = Room.objects.filter(host=user)
    logs = (
        SessionLog.objects.filter(room__in=rooms)
        .select_related("room", "room__host")
        .order_by("-timestamp")
    )

    # Create CSV response
    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = (
        f'attachment; filename="all_session_logs_{user.username}.csv"'
    )

    writer = csv.writer(response)
    writer.writerow(
        [
            "Session ID",
            "Room Code",
            "Project Name",
            "Host",
            "Timestamp",
            "Story Point Average",
            "Total Participants",
            "Participant Selections",
            "Total Votes",
            "Session Duration (estimated)",
            "Consensus Reached",
        ]
    )

    for log in logs:
        participant_count = len(log.participant_selections)
        total_votes = sum(
            1
            for selection in log.participant_selections.values()
            if selection and selection != "SKIPPED"
        )

        # Format participant selections as readable string
        selections_str = "; ".join(
            [f"{user}: {vote}" for user, vote in log.participant_selections.items()]
        )

        # Calculate consensus (all votes are the same)
        numeric_votes = []
        for selection in log.participant_selections.values():
            if selection and selection != "SKIPPED":
                try:
                    if selection.replace(".", "").isdigit():
                        numeric_votes.append(float(selection))
                except (ValueError, AttributeError):
                    continue

        consensus = len(set(numeric_votes)) == 1 if numeric_votes else False

        # Estimate session duration (mock - you might want to track this properly)
        estimated_duration = participant_count * 5  # 5 minutes per participant estimate

        writer.writerow(
            [
                log.id,
                log.room.code,
                log.room.project_name,
                log.room.host.username,
                log.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                log.story_point_average,
                participant_count,
                selections_str,
                total_votes,
                estimated_duration,
                "Yes" if consensus else "No",
            ]
        )

    return response
