import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from planning_poker.models import Room, Participant
from planning_poker.fields import STATUS_CHOICES
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from urllib.parse import parse_qs

logger = logging.getLogger(__name__)
User = get_user_model()


class RoomConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_code = self.scope["url_route"]["kwargs"]["room_id"]
        self.room_group_name = f"room_{self.room_code}"

        # Authenticate user from JWT token in query string
        self.user = await self.authenticate_user_from_token()
        if not self.user:
            logger.info(f"Guest user connecting to room {self.room_code}")
            self.user = type(
                "GuestUser",
                (),
                {
                    "id": None,
                    "username": "Guest",
                    "is_authenticated": False,
                    "is_anonymous": True,
                },
            )()
        else:
            self.scope["user"] = self.user

        logger.info(
            f"User {getattr(self.user, 'username', 'Guest')} connecting to room {self.room_code}"
        )

        try:
            self.room = await self.get_room_by_id_or_code(self.room_code)
            if not self.room:
                await self.close(code=4404)
                return

            if self.user and getattr(self.user, "is_authenticated", False):
                await self.get_or_create_participant(self.user, self.room)
                logger.info(
                    f"Participant created/found: {self.user.username} in room {self.room.code}"
                )

            await self.channel_layer.group_add(self.room_group_name, self.channel_name)
            await self.accept()
            await self.send_room_state()

            if self.user and getattr(self.user, "is_authenticated", False):
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "user_connected",
                        "user_id": self.user.id,
                        "username": self.user.username,
                    },
                )
        except Exception as e:
            logger.error(f"Error connecting to room {self.room_code}: {e}")
            await self.close(code=4500)

    async def disconnect(self, close_code):
        if (
            hasattr(self, "room_group_name")
            and self.user
            and getattr(self.user, "is_authenticated", False)
        ):
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "user_disconnected",
                    "user_id": self.user.id,
                    "username": self.user.username,
                },
            )
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(
                self.room_group_name, self.channel_name
            )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get("type")

            if message_type == "submit_vote":
                await self.handle_submit_vote(data)
            elif message_type == "reveal_cards":
                await self.handle_reveal_cards(data)
            elif message_type == "reset_votes":
                await self.handle_reset_votes(data)
            elif message_type == "skip_participant":
                await self.handle_skip_participant(data)
            elif message_type == "start_round":
                await self.handle_start_round(data)
            elif message_type == "chat_message":
                await self.handle_chat_message(data)
            elif message_type == "join_room":
                await self.handle_join_room(data)
            else:
                await self.send_error("Unknown message type")
        except json.JSONDecodeError:
            await self.send_error("Invalid JSON")
        except Exception as e:
            logger.error(f"Error handling message: {e}")
            await self.send_error("Internal server error")

    async def handle_submit_vote(self, data):
        card_value = data.get("card_value")
        if not card_value:
            await self.send_error("Card value is required")
            return
        if not self.user or not getattr(self.user, "is_authenticated", False):
            await self.send_error("Authentication required to vote")
            return
        participant = await self.get_or_create_participant(self.user, self.room)
        await self.update_participant_vote(participant, card_value)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "vote_submitted",
                "user_id": self.user.id,
                "username": self.user.username,
            },
        )

    async def handle_reveal_cards(self, data):
        if not await self.can_control_game(self.room, self.user):
            await self.send_error("Only admins or room hosts can reveal cards")
            return
        participants_data = await self.get_participants_with_votes(self.room)
        stats = await self.calculate_voting_stats(participants_data)
        await self.update_room_status(self.room, STATUS_CHOICES.COMPLETED)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "cards_revealed",
                "participants": participants_data,
                "statistics": stats,
            },
        )

    async def handle_reset_votes(self, data):
        if not await self.can_control_game(self.room, self.user):
            await self.send_error("Only admins or room hosts can reset votes")
            return
        await self.reset_all_votes(self.room)
        await self.update_room_status(self.room, STATUS_CHOICES.ACTIVE)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "votes_reset",
            },
        )

    async def handle_skip_participant(self, data):
        participant_id = data.get("participant_id")
        if not participant_id:
            await self.send_error("Participant ID is required")
            return
        if not await self.can_control_game(self.room, self.user):
            await self.send_error("Only admins or room hosts can skip participants")
            return
        await self.skip_participant_db(participant_id, self.room)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "participant_skipped",
                "participant_id": participant_id,
            },
        )

    async def handle_start_round(self, data):
        if not await self.can_control_game(self.room, self.user):
            await self.send_error("Only admins or room hosts can start rounds")
            return
        await self.reset_all_votes(self.room)
        await self.update_room_status(self.room, STATUS_CHOICES.ACTIVE)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "round_started",
                "story_title": data.get("story_title", ""),
            },
        )

    async def handle_chat_message(self, data):
        message = data.get("message", "").strip()
        if not message:
            await self.send_error("Message cannot be empty")
            return
        username = "Guest"
        user_id = None
        if self.user and self.user.is_authenticated:
            username = self.user.username
            user_id = self.user.id
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_message_broadcast",
                "user_id": user_id,
                "username": username,
                "message": message,
                "timestamp": self.get_current_timestamp(),
            },
        )

    async def handle_join_room(self, data):
        await self.send_room_state()

    async def send_room_state(self):
        participants = await self.get_participants_with_votes(self.room)
        is_host = (
            self.room.host == self.user
            if self.user and getattr(self.user, "is_authenticated", False)
            else False
        )
        user_role = (
            await self.get_user_role_string(self.user)
            if self.user and getattr(self.user, "is_authenticated", False)
            else "participant"
        )
        can_control = (
            await self.can_control_game(self.room, self.user)
            if self.user and getattr(self.user, "is_authenticated", False)
            else False
        )
        await self.send(
            text_data=json.dumps(
                {
                    "type": "room_state",
                    "room": {
                        "id": self.room.id,
                        "code": self.room.code,
                        "status": self.room.status,
                        "host_username": self.room.host.username,
                    },
                    "participants": participants,
                    "is_host": is_host,
                    "user_role": user_role,
                    "can_control": can_control,
                    "current_user": {
                        "id": self.user.id if self.user else None,
                        "username": self.user.username if self.user else "Guest",
                    },
                }
            )
        )

    # WebSocket event handlers
    async def user_connected(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "user_connected",
                    "user_id": event["user_id"],
                    "username": event["username"],
                }
            )
        )

    async def user_disconnected(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "user_disconnected",
                    "user_id": event["user_id"],
                    "username": event["username"],
                }
            )
        )

    async def vote_submitted(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "vote_submitted",
                    "user_id": event["user_id"],
                    "username": event["username"],
                }
            )
        )

    async def cards_revealed(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "cards_revealed",
                    "participants": event["participants"],
                    "statistics": event["statistics"],
                }
            )
        )

    async def votes_reset(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "votes_reset",
                }
            )
        )

    async def participant_skipped(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "participant_skipped",
                    "participant_id": event["participant_id"],
                }
            )
        )

    async def round_started(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "round_started",
                    "story_title": event["story_title"],
                }
            )
        )

    async def chat_message_broadcast(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "chat_message",
                    "user_id": event["user_id"],
                    "username": event["username"],
                    "message": event["message"],
                    "timestamp": event["timestamp"],
                }
            )
        )

    # Helper methods
    async def send_error(self, message):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "error",
                    "message": message,
                }
            )
        )

    def get_current_timestamp(self):
        from django.utils import timezone

        return timezone.now().isoformat()

    # Database methods
    @database_sync_to_async
    def authenticate_user_from_token(self):
        try:
            query_string = self.scope.get("query_string", b"").decode()
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
    def get_room_by_id_or_code(self, room_identifier):
        try:
            return Room.objects.select_related("host").get(code=room_identifier)
        except Room.DoesNotExist:
            try:
                return Room.objects.select_related("host").get(id=room_identifier)
            except (Room.DoesNotExist, ValueError):
                return None

    @database_sync_to_async
    def get_or_create_participant(self, user, room):
        participant, created = Participant.objects.get_or_create(
            user=user,
            room=room,
            defaults={
                "card_selection": None,
            },
        )
        return participant

    @database_sync_to_async
    def get_participants_with_votes(self, room):
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
    def update_participant_vote(self, participant, card_value):
        participant.card_selection = card_value
        participant.save()

    @database_sync_to_async
    def reset_all_votes(self, room):
        try:
            Participant.objects.filter(room=room).update(card_selection=None)
        except Exception as e:
            logger.error(f"Error resetting votes: {e}")

    @database_sync_to_async
    def update_room_status(self, room, status):
        try:
            room.status = status
            room.save()
        except Exception as e:
            logger.error(f"Error updating room status: {e}")

    @database_sync_to_async
    def calculate_voting_stats(self, participants_data):
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
            "total_votes": len(
                [p for p in participants_data if p.get("card_selection")]
            ),
        }

    @database_sync_to_async
    def skip_participant_db(self, participant_id, room):
        try:
            Participant.objects.filter(id=participant_id, room=room).update(
                card_selection="SKIPPED"
            )
        except Exception as e:
            logger.error(f"Error skipping participant {participant_id}: {e}")

    @database_sync_to_async
    def get_user_role_string(self, user):
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
    def can_control_game(self, room, user):
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

    @database_sync_to_async
    def reset_all_votes(self, room):
        """Reset all votes for participants in the room"""
        try:
            Participant.objects.filter(room=room).update(card_selection=None)
        except Exception as e:
            logger.error(f"Error resetting votes: {e}")

    @database_sync_to_async
    def update_room_status(self, room, status):
        """Update room status"""
        try:
            room.status = status
            room.save()
        except Exception as e:
            logger.error(f"Error updating room status: {e}")

    @database_sync_to_async
    def calculate_voting_stats(self, participants_data):
        """Calculate voting statistics"""
        numeric_votes = []

        for participant in participants_data:
            card_value = participant.get("card_selection")
            if card_value and card_value != "SKIPPED":
                try:
                    # Handle different card types (numbers, ?, coffee, etc.)
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
            "total_votes": len(
                [p for p in participants_data if p.get("card_selection")]
            ),
        }

    @database_sync_to_async
    def get_user_role_string(self, user):
        """Get user role as string"""
        try:
            # Refresh the user from database to get latest role information
            user_with_role = User.objects.select_related("role").get(id=user.id)

            # Check if user has a role relationship
            if hasattr(user_with_role, "role") and user_with_role.role:
                return user_with_role.role.role

            # Check if user has is_superuser or is_staff flags
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
    def can_control_game(self, room, user):
        """Check if user can control game flow"""
        if not user or not getattr(user, "is_authenticated", False):
            return False

        try:
            # Check if user is room host first
            if room.host == user:
                return True

            # Get fresh user data with role information
            user_with_role = User.objects.select_related("role").get(id=user.id)

            # Check role-based permissions
            if hasattr(user_with_role, "role") and user_with_role.role:
                return user_with_role.role.role == "admin"

            # Check Django built-in admin flags as fallback
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
            # Fallback to host check only
            return room.host == user

    @database_sync_to_async
    def skip_participant_db(self, participant_id, room):
        """Set participant as skipped in database"""
        try:
            Participant.objects.filter(id=participant_id, room=room).update(
                card_selection="SKIPPED"
            )
        except Exception as e:
            logger.error(f"Error skipping participant {participant_id}: {e}")

    async def reveal_cards(self, event):
        """Reveal all cards - only admin or host can do this"""
        user = self.scope["user"]
        room = await self.get_room()

        if not await self.can_control_game(room, user):
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "error",
                        "message": "Only admins or room hosts can reveal cards",
                    }
                )
            )
            return

        # Get all participants and their votes
        participants_data = await self.get_participants_with_votes(self.room)

        # Calculate statistics
        stats = await self.calculate_voting_stats(participants_data)

        # Update room status
        await self.update_room_status(self.room, STATUS_CHOICES.COMPLETED)

        # Broadcast revealed cards
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "cards_revealed",
                "participants": participants_data,
                "statistics": stats,
            },
        )

    async def reset_votes(self, event):
        """Reset all votes - only admin or host can do this"""
        user = self.scope["user"]
        room = await self.get_room()

        if not await self.can_control_game(room, user):
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "error",
                        "message": "Only admins or room hosts can reset votes",
                    }
                )
            )
            return

        # Reset all participant votes
        await self.reset_all_votes(self.room)

        # Update room status
        await self.update_room_status(self.room, STATUS_CHOICES.ACTIVE)

        # Broadcast reset
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "votes_reset",
            },
        )

    @database_sync_to_async
    def skip_participant_db(self, participant_id, room):
        """Set participant as skipped in database"""
        try:
            Participant.objects.filter(id=participant_id, room=room).update(
                card_selection="SKIPPED"
            )
        except Exception as e:
            logger.error(f"Error skipping participant {participant_id}: {e}")

    async def start_round(self, event):
        """Start a new round - only admin or host can do this"""
        user = self.scope["user"]
        room = await self.get_room()

        if not await self.can_control_game(room, user):
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "error",
                        "message": "Only admins or room hosts can start rounds",
                    }
                )
            )
            return

        # Reset votes and update room status
        await self.reset_all_votes(self.room)
        await self.update_room_status(self.room, STATUS_CHOICES.ACTIVE)

        # Broadcast new round
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "round_started",
                "story_title": event.get("story_title", ""),
            },
        )

    @database_sync_to_async
    def get_room(self):
        """Get the current room from database"""
        return self.room

    async def skip_participant(self, event):
        """Skip a participant - only admin or host can do this"""
        user = self.scope["user"]
        room = await self.get_room()

        if not await self.can_control_game(room, user):
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "error",
                        "message": "Only admins or room hosts can skip participants",
                    }
                )
            )
            return

        participant_id = event.get("participant_id")

        if not participant_id:
            await self.send_error("Participant ID is required")
            return

        # Set participant as skipped
        await self.skip_participant(participant_id, self.room)

        # Broadcast skip
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "participant_skipped",
                "participant_id": participant_id,
            },
        )

        participant_id = event.get("participant_id")

        if not participant_id:
            await self.send_error("Participant ID is required")
            return

        # Set participant as skipped
        await self.skip_participant(participant_id, self.room)

        # Broadcast skip
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "participant_skipped",
                "participant_id": participant_id,
            },
        )
        # Broadcast skip
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "participant_skipped",
                "participant_id": participant_id,
            },
        )
