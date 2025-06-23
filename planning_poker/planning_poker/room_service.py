import logging
from channels.db import database_sync_to_async
from planning_poker.models import Room, Participant
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from urllib.parse import parse_qs

logger = logging.getLogger(__name__)
User = get_user_model()


@database_sync_to_async
def authenticate_user_from_token(scope):
    try:
        query_string = scope.get("query_string", b"").decode()
        query_params = parse_qs(query_string)
        token = query_params.get("token", [None])[0]
        if not token:
            logger.info("No token provided in WebSocket connection")
            return None
        access_token = AccessToken(token)
        user_id = access_token["user_id"]
        user = User.objects.select_related("role").get(id=user_id)
        logger.info(f"Authenticated user: {user.username}")
        return user
    except (InvalidToken, TokenError) as e:
        logger.warning(f"Invalid token provided: {e}")
        return None
    except User.DoesNotExist:
        logger.warning(f"User with ID {user_id} not found")
        return None
    except Exception as e:
        logger.error(f"Error authenticating user: {e}")
        return None


@database_sync_to_async
def get_room_by_id_or_code(room_identifier):
    try:
        return Room.objects.select_related("host").get(code=room_identifier)
    except Room.DoesNotExist:
        try:
            return Room.objects.select_related("host").get(id=room_identifier)
        except (Room.DoesNotExist, ValueError):
            return None


@database_sync_to_async
def get_or_create_participant(user, room):
    participant, created = Participant.objects.get_or_create(
        user=user,
        room=room,
        defaults={"card_selection": None},
    )
    return participant


@database_sync_to_async
def get_participants_with_votes(room):
    try:
        participants = list(
            Participant.objects.filter(room=room)
            .select_related("user", "user__role")
            .values(
                "id",
                "user_id",
                "user__username",
                "card_selection",
                "user__role__role",
            )
        )
        for p in participants:
            p["username"] = p.pop("user__username")
            p["vote"] = None
            p["user_role"] = p.pop("user__role__role") or "participant"
            p["has_voted"] = bool(p["card_selection"])
        return participants
    except Exception as e:
        logger.error(f"Error getting participants: {e}")
        return []


@database_sync_to_async
def update_participant_vote(participant, card_value):
    participant.card_selection = card_value
    participant.save()


@database_sync_to_async
def reset_all_votes(room):
    try:
        Participant.objects.filter(room=room).update(card_selection=None)
    except Exception as e:
        logger.error(f"Error resetting votes: {e}")


@database_sync_to_async
def update_room_status(room, status):
    try:
        room.status = status
        room.save()
    except Exception as e:
        logger.error(f"Error updating room status: {e}")


@database_sync_to_async
def calculate_voting_stats(participants_data):
    numeric_votes = []
    for participant in participants_data:
        card_value = participant.get("card_selection")
        if card_value and card_value != "SKIPPED":
            try:
                if card_value.replace(".", "").isdigit():
                    numeric_votes.append(float(card_value))
            except (ValueError, AttributeError):
                continue
    if not numeric_votes:
        return {
            "average": 0,
            "min": 0,
            "max": 0,
            "consensus": False,
            "total_votes": len(
                [p for p in participants_data if p.get("card_selection")]
            ),
        }
    average = sum(numeric_votes) / len(numeric_votes)
    min_vote = min(numeric_votes)
    max_vote = max(numeric_votes)
    consensus = len(set(numeric_votes)) == 1
    return {
        "average": round(average, 2),
        "min": min_vote,
        "max": max_vote,
        "consensus": consensus,
        "total_votes": len([p for p in participants_data if p.get("card_selection")]),
    }


@database_sync_to_async
def skip_participant_db(participant_id, room):
    try:
        Participant.objects.filter(id=participant_id, room=room).update(
            card_selection="SKIPPED"
        )
    except Exception as e:
        logger.error(f"Error skipping participant {participant_id}: {e}")


@database_sync_to_async
def get_user_role_string(user):
    try:
        user_with_role = User.objects.select_related("role").get(id=user.id)
        if hasattr(user_with_role, "role") and user_with_role.role:
            return user_with_role.role.role
        if getattr(user_with_role, "is_superuser", False) or getattr(
            user_with_role, "is_staff", False
        ):
            return "admin"
        return "participant"
    except User.DoesNotExist:
        logger.warning(f"User {user.id} not found when getting role")
        return "participant"
    except Exception as e:
        logger.warning(f"Error getting user role: {e}")
        return "participant"


@database_sync_to_async
def can_control_game(room, user):
    if not user or not getattr(user, "is_authenticated", False):
        return False
    try:
        if room.host == user:
            return True
        user_with_role = User.objects.select_related("role").get(id=user.id)
        if hasattr(user_with_role, "role") and user_with_role.role:
            return user_with_role.role.role == "admin"
        if getattr(user_with_role, "is_superuser", False) or getattr(
            user_with_role, "is_staff", False
        ):
            return True
        return False
    except User.DoesNotExist:
        logger.warning(f"User {user.id} not found when checking game control")
        return False
    except Exception as e:
        logger.warning(f"Error checking game control permissions: {e}")
        return room.host == user
