import csv
from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from planning_poker.serializers import RoomSerializer, SessionLogSerializer
from planning_poker.utils import generate_unique_room_code
from planning_poker.models import Room, Participant, SessionLog, UserRole
from planning_poker.fields import STATUS_CHOICES, POINT_SYSTEMS
from django.utils import timezone
from datetime import timedelta
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
            return [IsAuthenticated()]
        elif self.action == "retrieve":
            return []  # Allow anonymous access
        else:
            return [IsAuthenticated()]
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        """Create a new room (POST /api/rooms/)"""
        try:
            data = request.data.copy()
            data["host"] = request.user.id

            # Generate unique code with better error handling
            try:
                code = generate_unique_room_code()
                if not code or not code.strip():
                    raise ValueError("Generated code is empty")
                data["code"] = code.strip()
                logger.info(f"Generated room code: {code}")
            except ValueError as e:
                logger.error(f"Code generation failed: {e}")
                return Response(
                    {"error": "Unable to generate unique room code. Please try again."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            # Set default project name if not provided
            if not data.get("project_name"):
                from planning_poker.helpers import generate_random_project_name

                data["project_name"] = generate_random_project_name()

            # Validate the data before creating
            serializer = self.get_serializer(data=data)
            if not serializer.is_valid():
                logger.error(f"Serializer validation failed: {serializer.errors}")
                return Response(
                    {"error": "Invalid room data", "details": serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            room = serializer.save()
            logger.info(f"Successfully created room: {room.code}")

            # Update admin's last room if they are admin
            try:
                user_role = UserRole.objects.get(user=request.user)
                if user_role.role == "admin":
                    user_role.last_room = room
                    user_role.save()
            except UserRole.DoesNotExist:
                pass

            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"Error creating room: {e}")
            return Response(
                {"error": f"Failed to create room: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def retrieve(self, request, pk=None, *args, **kwargs):
        """Fetch room details (GET /api/rooms/{id}/)"""
        # Try to get by code first, then by ID
        room = None
        try:
            room = Room.objects.get(code=pk)
        except Room.DoesNotExist:
            try:
                room = Room.objects.get(id=pk)
            except (Room.DoesNotExist, ValueError):
                pass

        if not room:
            return Response(
                {"error": "Room not found"}, status=status.HTTP_404_NOT_FOUND
            )

        # Check if room is inactive and auto-close it
        inactive_threshold = timezone.now() - timedelta(minutes=30)
        if room.last_activity < inactive_threshold and not room.auto_closed:
            room.status = STATUS_CHOICES.COMPLETED
            room.auto_closed = True
            room.save()
            return Response(
                {"error": "Room has been closed due to inactivity"},
                status=status.HTTP_410_GONE,
            )

        participants = Participant.objects.filter(room=room)
        serializer = self.get_serializer(room)
        return Response(serializer.data)

    @action(
        detail=False, methods=["get", "delete"], permission_classes=[IsAuthenticated]
    )
    def admin_last_room(self, request):
        """Get or clear admin's last active room"""
        if request.method == "GET":
            try:
                user_role = UserRole.objects.get(user=request.user)
                if user_role.role != "admin" or not user_role.last_room:
                    return Response(
                        {"message": "No last room found"},
                        status=status.HTTP_204_NO_CONTENT,
                    )

                room = user_role.last_room

                # Check if room is still active and not auto-closed
                inactive_threshold = timezone.now() - timedelta(minutes=30)
                if (
                    room.auto_closed
                    or room.status == STATUS_CHOICES.COMPLETED
                    or room.last_activity < inactive_threshold
                ):
                    # Clear the last room reference if it's no longer valid
                    user_role.last_room = None
                    user_role.save()

                    return Response(
                        {"message": "Last room is no longer active"},
                        status=status.HTTP_204_NO_CONTENT,
                    )

                serializer = self.get_serializer(room)
                return Response(serializer.data)

            except UserRole.DoesNotExist:
                return Response(
                    {"message": "User role not found"}, status=status.HTTP_404_NOT_FOUND
                )
            except Exception as e:
                logger.error(f"Error getting admin last room: {e}")
                return Response(
                    {"error": "Internal server error"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        elif request.method == "DELETE":
            try:
                user_role = UserRole.objects.get(user=request.user)
                if user_role.role != "admin":
                    return Response(
                        {"error": "Only admins can clear their last room"},
                        status=status.HTTP_403_FORBIDDEN,
                    )

                # Get the last room before clearing the reference
                last_room = user_role.last_room

                # Clear the last room reference
                user_role.last_room = None
                user_role.save()

                # Close the room if it exists and is still active
                if last_room and last_room.status != STATUS_CHOICES.COMPLETED:
                    # Mark room as completed and auto-closed
                    last_room.status = STATUS_CHOICES.COMPLETED
                    last_room.auto_closed = True
                    last_room.save()

                    # Create a session log for the closed room if there were any votes
                    participants = Participant.objects.filter(room=last_room)
                    if participants.filter(card_selection__isnull=False).exists():
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
                                selections[participant.user.username] = (
                                    participant.card_selection
                                )

                        # Calculate average if there are numeric selections
                        average = total / count if count > 0 else 0

                        # Create session log for the closed session
                        SessionLog.objects.create(
                            room=last_room,
                            story_point_average=average,
                            participant_selections=selections,
                        )

                    logger.info(f"Admin closed room {last_room.code} without rejoining")

                    return Response(
                        {
                            "message": "Room closed and last room reference cleared successfully",
                            "room_code": last_room.code,
                            "room_status": "closed",
                        },
                        status=status.HTTP_200_OK,
                    )
                else:
                    return Response(
                        {"message": "Last room reference cleared successfully"},
                        status=status.HTTP_200_OK,
                    )

            except UserRole.DoesNotExist:
                return Response(
                    {"message": "User role not found"}, status=status.HTTP_404_NOT_FOUND
                )
            except Exception as e:
                logger.error(f"Error clearing admin last room: {e}")
                return Response(
                    {"error": "Internal server error"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
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
    """Get room by code (GET /api/rooms/code/{code}/) - No auth required for room lookup"""
    try:
        room = Room.objects.get(code=room_code)
        # Return basic room info without sensitive participant details for unauthenticated users
        if not request.user.is_authenticated:
            return Response(
                {
                    "id": room.id,
                    "code": room.code,
                    "project_name": room.project_name,
                    "status": room.status,
                    "host": room.host.username,
                    "participant_count": Participant.objects.filter(room=room).count(),
                }
            )

        # For authenticated users, return full details
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
