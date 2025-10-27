import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from planning_poker.models import Room, Participant, SessionLog, UserRole, AnonymousSession
from planning_poker.fields import STATUS_CHOICES, POINT_SYSTEMS, POINT_SYSTEM_CARDS
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from urllib.parse import parse_qs
from django.utils import timezone
from datetime import timedelta
import asyncio
import random
import uuid

logger = logging.getLogger(__name__)
User = get_user_model()


class RoomConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.room = None
        self.user = None
        self.is_anonymous_user = False
        self.anonymous_session_id = None
        self.room_group_name = None
        self.is_connected = False

    async def connect(self):
        self.room_code = self.scope["url_route"]["kwargs"]["room_id"]
        self.room_group_name = f"room_{self.room_code}"

        # Authenticate user from JWT token in query string
        self.user = await self.authenticate_user_from_token()
        if not self.user:
            # Try to get or create anonymous user based on session ID
            logger.info(f"No authenticated user, checking for anonymous session")
            self.user, self.anonymous_session_id = await self.get_or_create_anonymous_user()
            self.is_anonymous_user = True
        else:
            self.scope["user"] = self.user
            self.is_anonymous_user = False

        logger.info(
            f"User {getattr(self.user, 'username', 'Guest')} connecting to room {self.room_code}"
        )

        try:
            self.room = await self.get_room_by_id_or_code(self.room_code)
            if not self.room:
                await self.close(code=4404)
                return

            # Check if room is auto-closed due to inactivity
            if await self.is_room_inactive(self.room):
                await self.auto_close_room(self.room)
                await self.close(code=4408)  # Custom code for inactive room
                return

            # Update last activity
            await self.update_room_activity(self.room)

            # Store admin's last room if they are admin
            if not self.is_anonymous_user and self.user:
                await self.update_admin_last_room(self.user, self.room)

            # Create participant for both authenticated and anonymous users
            participant = await self.get_or_create_participant(self.user, self.room)
            logger.info(
                f"Participant created/found: {self.user.username} in room {self.room.code}"
            )

            await self.channel_layer.group_add(self.room_group_name, self.channel_name)
            await self.accept()
            self.is_connected = True
            
            # Send initial room state to the connecting user
            await self.send_room_state()

            # Broadcast updated room state to all users
            await self.broadcast_room_state()

            # Send notification for toast message
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "user_connected_notification",
                    "username": self.user.username,
                    "is_anonymous": self.is_anonymous_user,
                },
            )
        except Exception as e:
            logger.error(f"Error connecting to room {self.room_code}: {e}")
            await self.close(code=4500)

    async def disconnect(self, close_code):
        self.is_connected = False

        if hasattr(self, "room_group_name") and self.user and self.room_group_name:
            # Only send disconnect message if we were properly connected
            if hasattr(self, "room") and self.room:
                try:
                    # Store username before cleanup
                    username = self.user.username
                    is_anonymous = getattr(self, "is_anonymous_user", False)

                    # Clean up temporary user and participant when they disconnect
                    if is_anonymous:
                        await self.cleanup_anonymous_user(self.user)

                    # Broadcast updated room state to remaining users
                    await self.broadcast_room_state()

                    # Send notification for toast message
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            "type": "user_disconnected_notification",
                            "username": username,
                            "is_anonymous": is_anonymous,
                        },
                    )
                except Exception as e:
                    logger.warning(f"Error sending disconnect notification: {e}")

            # Remove from channel group
            try:
                await self.channel_layer.group_discard(
                    self.room_group_name, self.channel_name
                )
            except Exception as e:
                logger.warning(f"Error leaving channel group: {e}")

    async def receive(self, text_data):

        try:
            data = json.loads(text_data)
            message_type = data.get("type")

            # Update room activity on any message
            if hasattr(self, "room"):
                await self.update_room_activity(self.room)

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
            elif message_type == "start_timer":
                await self.handle_start_timer(data)
            elif message_type == "stop_timer":
                await self.handle_stop_timer(data)
            elif message_type == "pause_timer":
                await self.handle_pause_timer(data)
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

        # Allow both authenticated and anonymous users to vote
        if not self.user:
            await self.send_error("User session not found")
            return

        # Validate card value against room's point system
        valid_cards = await self.get_room_card_values(self.room)
        if card_value not in valid_cards:
            await self.send_error("Invalid card value for this room's point system")
            return

        participant = await self.get_or_create_participant(self.user, self.room)
        await self.update_participant_vote(participant, card_value)

        # Broadcast updated room state
        await self.broadcast_room_state()

        # Check for auto-reveal if enabled and all participants have voted
        if await self.should_auto_reveal(self.room):
            await self.auto_reveal_cards()

    async def handle_reveal_cards(self, data):
        if not await self.can_control_game(self.room, self.user):
            await self.send_error("Only admins or room hosts can reveal cards")
            return
        participants_data = await self.get_participants_with_votes(self.room)
        stats = await self.calculate_voting_stats(participants_data)

        # Create session log when cards are revealed
        await self.create_session_log(self.room, stats, participants_data)

        await self.update_room_status(self.room, STATUS_CHOICES.COMPLETED)
        
        # Broadcast updated room state
        await self.broadcast_room_state()

    async def handle_reset_votes(self, data):
        if not await self.can_control_game(self.room, self.user):
            await self.send_error("Only admins or room hosts can reset votes")
            return
        await self.reset_all_votes(self.room)
        await self.update_room_status(self.room, STATUS_CHOICES.ACTIVE)
        
        # Broadcast updated room state
        await self.broadcast_room_state()

    async def handle_skip_participant(self, data):
        participant_id = data.get("participant_id")
        if not participant_id:
            await self.send_error("Participant ID is required")
            return
        if not await self.can_control_game(self.room, self.user):
            await self.send_error("Only admins or room hosts can skip participants")
            return
        await self.skip_participant_db(participant_id, self.room)
        
        # Broadcast updated room state
        await self.broadcast_room_state()

    async def handle_start_round(self, data):
        if not await self.can_control_game(self.room, self.user):
            await self.send_error("Only admins or room hosts can start rounds")
            return
        await self.reset_all_votes(self.room)
        await self.update_room_status(self.room, STATUS_CHOICES.ACTIVE)
        
        # Broadcast updated room state
        await self.broadcast_room_state()

    async def handle_start_timer(self, data):
        if not await self.can_control_game(self.room, self.user):
            await self.send_error("Only admins or room hosts can start timer")
            return

        if not self.room.enable_timer:
            await self.send_error("Timer is not enabled for this room")
            return

        timer_duration = data.get("duration", self.room.timer_duration)
        await self.start_room_timer(self.room, timer_duration)

        # Broadcast updated room state
        await self.broadcast_room_state()

    async def handle_stop_timer(self, data):
        if not await self.can_control_game(self.room, self.user):
            await self.send_error("Only admins or room hosts can stop timer")
            return

        await self.stop_room_timer(self.room)

        # Broadcast updated room state
        await self.broadcast_room_state()

    async def handle_pause_timer(self, data):
        if not await self.can_control_game(self.room, self.user):
            await self.send_error("Only admins or room hosts can pause timer")
            return

        await self.pause_room_timer(self.room)

        # Broadcast updated room state
        await self.broadcast_room_state()

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
        card_values = await self.get_room_card_values(self.room)

        # Get timer state
        timer_state = await self.get_timer_state(self.room)

        # Determine user permissions
        is_host = (
            self.room.host == self.user
            if self.user and not getattr(self, "is_anonymous_user", False)
            else False
        )
        user_role = (
            await self.get_user_role_string(self.user)
            if self.user and not getattr(self, "is_anonymous_user", False)
            else "participant"
        )
        can_control = (
            await self.can_control_game(self.room, self.user)
            if self.user and not getattr(self, "is_anonymous_user", False)
            else False
        )

        await self.send(
            text_data=json.dumps(
                {
                    "type": "room_state",
                    "room": {
                        "id": self.room.id,
                        "code": self.room.code,
                        "project_name": self.room.project_name,
                        "point_system": self.room.point_system,
                        "status": self.room.status,
                        "host_username": self.room.host.username,
                        "enable_timer": self.room.enable_timer,
                        "timer_duration": self.room.timer_duration,
                    },
                    "participants": participants,
                    "card_values": card_values,
                    "timer_state": timer_state,
                    "is_host": is_host,
                    "user_role": user_role,
                    "can_control": can_control,
                    "is_anonymous": getattr(self, "is_anonymous_user", False),
                    "anonymous_session_id": getattr(self, "anonymous_session_id", None),
                    "current_user": {
                        "id": self.user.id if self.user else None,
                        "username": self.user.username if self.user else "Guest",
                        "is_anonymous": getattr(self, "is_anonymous_user", False),
                    },
                }
            )
        )

    # WebSocket event handlers
    async def room_state_update(self, event):
        """Send room state update to this specific client"""
        if not self.is_connected:
            return
        try:
            # Determine user-specific permissions
            is_host = (
                self.room.host == self.user
                if self.user and not getattr(self, "is_anonymous_user", False)
                else False
            )
            user_role = (
                await self.get_user_role_string(self.user)
                if self.user and not getattr(self, "is_anonymous_user", False)
                else "participant"
            )
            can_control = (
                await self.can_control_game(self.room, self.user)
                if self.user and not getattr(self, "is_anonymous_user", False)
                else False
            )

            await self.send(
                text_data=json.dumps(
                    {
                        "type": "room_state",
                        "room": event["room"],
                        "participants": event["participants"],
                        "card_values": event["card_values"],
                        "timer_state": event["timer_state"],
                        "is_host": is_host,
                        "user_role": user_role,
                        "can_control": can_control,
                        "is_anonymous": getattr(self, "is_anonymous_user", False),
                        "anonymous_session_id": getattr(self, "anonymous_session_id", None),
                        "current_user": {
                            "id": self.user.id if self.user else None,
                            "username": self.user.username if self.user else "Guest",
                            "is_anonymous": getattr(self, "is_anonymous_user", False),
                        },
                    }
                )
            )
        except Exception as e:
            logger.warning(f"Error sending room_state_update: {e}")

    async def user_connected_notification(self, event):
        """Send notification when a user connects (for toast messages only)"""
        if not self.is_connected:
            return
        try:
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "user_connected",
                        "username": event["username"],
                        "is_anonymous": event.get("is_anonymous", False),
                    }
                )
            )
        except Exception as e:
            logger.warning(f"Error sending user_connected notification: {e}")

    async def user_disconnected_notification(self, event):
        """Send notification when a user disconnects (for toast messages only)"""
        if not self.is_connected:
            return
        try:
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "user_disconnected",
                        "username": event["username"],
                        "is_anonymous": event.get("is_anonymous", False),
                    }
                )
            )
        except Exception as e:
            logger.warning(f"Error sending user_disconnected notification: {e}")

    async def vote_submitted(self, event):
        if not self.is_connected:
            return
        try:
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "vote_submitted",
                        "user_id": event["user_id"],
                        "username": event["username"],
                        "is_anonymous": event.get("is_anonymous", False),
                    }
                )
            )
        except Exception as e:
            logger.warning(f"Error sending vote_submitted message: {e}")

    async def cards_revealed(self, event):
        if not self.is_connected:
            return
        try:
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "cards_revealed",
                        "participants": event["participants"],
                        "statistics": event["statistics"],
                    }
                )
            )
        except Exception as e:
            logger.warning(f"Error sending cards_revealed message: {e}")

    async def votes_reset(self, event):
        if not self.is_connected:
            return
        try:
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "votes_reset",
                    }
                )
            )
        except Exception as e:
            logger.warning(f"Error sending votes_reset message: {e}")

    async def participant_skipped(self, event):
        if not self.is_connected:
            return
        try:
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "participant_skipped",
                        "participant_id": event["participant_id"],
                    }
                )
            )
        except Exception as e:
            logger.warning(f"Error sending participant_skipped message: {e}")

    async def round_started(self, event):
        if not self.is_connected:
            return
        try:
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "round_started",
                        "story_title": event["story_title"],
                    }
                )
            )
        except Exception as e:
            logger.warning(f"Error sending round_started message: {e}")

    async def chat_message_broadcast(self, event):
        if not self.is_connected:
            return
        try:
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
        except Exception as e:
            logger.warning(f"Error sending chat_message message: {e}")

    async def cards_auto_revealed(self, event):
        if not self.is_connected:
            return
        try:
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "cards_revealed",
                        "participants": event["participants"],
                        "statistics": event["statistics"],
                        "auto_revealed": True,  # Flag to indicate this was auto-revealed
                    }
                )
            )
        except Exception as e:
            logger.warning(f"Error sending cards_auto_revealed message: {e}")

    # Timer event handlers
    async def timer_started(self, event):
        if not self.is_connected:
            return
        try:
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "timer_started",
                        "duration": event["duration"],
                        "start_time": event["start_time"],
                    }
                )
            )
        except Exception as e:
            logger.warning(f"Error sending timer_started message: {e}")

    async def timer_stopped(self, event):
        if not self.is_connected:
            return
        try:
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "timer_stopped",
                    }
                )
            )
        except Exception as e:
            logger.warning(f"Error sending timer_stopped message: {e}")

    async def timer_paused(self, event):
        if not self.is_connected:
            return
        try:
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "timer_paused",
                    }
                )
            )
        except Exception as e:
            logger.warning(f"Error sending timer_paused message: {e}")

    async def timer_expired(self, event):
        if not self.is_connected:
            return
        try:
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "timer_expired",
                    }
                )
            )
        except Exception as e:
            logger.warning(f"Error sending timer_expired message: {e}")

    async def room_auto_closed(self, event):
        if not self.is_connected:
            return
        try:
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "room_auto_closed",
                        "reason": event.get("reason", "Room closed due to inactivity"),
                    }
                )
            )
        except Exception as e:
            logger.warning(f"Error sending room_auto_closed message: {e}")

    # Helper methods
    async def send_error(self, message):
        if not self.is_connected:
            return
        try:
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "error",
                        "message": message,
                    }
                )
            )
        except Exception as e:
            logger.warning(f"Error sending error message: {e}")

    def get_current_timestamp(self):
        from django.utils import timezone

        return timezone.now().isoformat()

    async def broadcast_room_state(self):
        """Broadcast complete room state to all connected users"""
        try:
            participants = await self.get_participants_with_votes(self.room)
            card_values = await self.get_room_card_values(self.room)
            timer_state = await self.get_timer_state(self.room)

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "room_state_update",
                    "room": {
                        "id": self.room.id,
                        "code": self.room.code,
                        "project_name": self.room.project_name,
                        "point_system": self.room.point_system,
                        "status": self.room.status,
                        "host_username": self.room.host.username,
                        "enable_timer": self.room.enable_timer,
                        "timer_duration": self.room.timer_duration,
                    },
                    "participants": participants,
                    "card_values": card_values,
                    "timer_state": timer_state,
                },
            )
            logger.info(f"Broadcasted room state to group {self.room_group_name}")
        except Exception as e:
            logger.error(f"Error broadcasting room state: {e}")

    async def auto_reveal_cards(self):
        """Automatically reveal cards when all participants have voted"""
        try:
            logger.info(f"Auto-revealing cards for room {self.room.code}")

            participants_data = await self.get_participants_with_votes(self.room)
            stats = await self.calculate_voting_stats(participants_data)

            # Create session log when cards are revealed
            await self.create_session_log(self.room, stats, participants_data)

            await self.update_room_status(self.room, STATUS_CHOICES.COMPLETED)

            # Broadcast updated room state
            await self.broadcast_room_state()

        except Exception as e:
            logger.error(f"Error during auto-reveal: {e}")

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
                    "user__is_active",  # Add this to identify anonymous users
                    "card_selection",
                    "user__role__role",
                )
            )
            for p in participants:
                p["username"] = p.pop("user__username")
                p["vote"] = None
                p["user_role"] = p.pop("user__role__role") or "participant"
                p["has_voted"] = bool(p["card_selection"])
                p["is_anonymous"] = not p.pop(
                    "user__is_active", True
                )  # Inactive users are anonymous
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
        """Check if user can control game flow"""
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
    def skip_participant_db(self, participant_id, room):
        """Set participant as skipped in database"""
        try:
            Participant.objects.filter(id=participant_id, room=room).update(
                card_selection="SKIPPED"
            )
        except Exception as e:
            logger.error(f"Error skipping participant {participant_id}: {e}")

    @database_sync_to_async
    def create_session_log(self, room, stats, participants_data):
        """Create a session log entry when cards are revealed"""
        try:
            # Build participant selections dictionary
            participant_selections = {}
            for participant in participants_data:
                if participant.get("card_selection"):
                    participant_selections[participant["username"]] = participant[
                        "card_selection"
                    ]

            # Create the session log
            session_log = SessionLog.objects.create(
                room=room,
                story_point_average=stats["average"],
                participant_selections=participant_selections,
            )

            logger.info(f"Created session log {session_log.id} for room {room.code}")
            return session_log

        except Exception as e:
            logger.error(f"Error creating session log: {e}")
            return None

    @database_sync_to_async
    def get_room_card_values(self, room):
        """Get the card values for the room's point system"""
        return POINT_SYSTEM_CARDS.get(
            room.point_system, POINT_SYSTEM_CARDS[POINT_SYSTEMS.FIBONACCI]
        )

    @database_sync_to_async
    def should_auto_reveal(self, room):
        """Check if auto-reveal should happen"""
        try:
            # Check if auto-reveal is enabled for this room
            if not room.auto_reveal_cards:
                return False

            # Get all participants and check if everyone has voted
            participants = Participant.objects.filter(room=room)
            total_participants = participants.count()

            # No participants means no auto-reveal
            if total_participants == 0:
                return False

            # Count participants who have voted (have a card selection that's not None)
            voted_participants = participants.filter(
                card_selection__isnull=False
            ).count()

            # Auto-reveal if everyone has voted
            return voted_participants == total_participants

        except Exception as e:
            logger.error(f"Error checking auto-reveal conditions: {e}")
            return False

    @database_sync_to_async
    def get_participant_data(self, participant):
        """Get complete participant data for broadcasting"""
        try:
            # Refresh from database to get related data
            participant = Participant.objects.select_related("user", "user__role").get(
                id=participant.id
            )

            return {
                "id": participant.id,
                "user_id": participant.user.id,
                "username": participant.user.username,
                "card_selection": participant.card_selection,
                "has_voted": bool(participant.card_selection),
                "vote": None,  # Hidden until revealed
                "user_role": (
                    participant.user.role.role
                    if hasattr(participant.user, "role") and participant.user.role
                    else "participant"
                ),
                "is_anonymous": not participant.user.is_active,
            }
        except Exception as e:
            logger.error(f"Error getting participant data: {e}")
            return None

    @database_sync_to_async
    def get_participant_by_user(self, user, room):
        """Get participant by user and room"""
        try:
            return Participant.objects.get(user=user, room=room)
        except Participant.DoesNotExist:
            return None

    @database_sync_to_async
    def cleanup_anonymous_user(self, user):
        """Clean up temporary user and their data when they disconnect"""
        try:
            if user and hasattr(user, "id") and user.id:
                # Check if user has an anonymous session
                try:
                    session = AnonymousSession.objects.get(user=user)
                    # Don't delete the user if they have a session - they might reconnect
                    # Just remove their participant record from this room
                    Participant.objects.filter(user=user, room=self.room).delete()
                    logger.info(
                        f"Removed participant for session user: {user.username}, but kept session"
                    )
                    return
                except AnonymousSession.DoesNotExist:
                    # No session, proceed with full cleanup
                    pass

                # Remove participant record
                Participant.objects.filter(user=user).delete()

                # Remove temporary user (only if they're marked as inactive and have no session)
                if hasattr(user, "is_active") and not user.is_active:
                    User.objects.filter(id=user.id, is_active=False).delete()
                    logger.info(f"Cleaned up temporary user: {user.username}")

        except Exception as e:
            logger.error(f"Error cleaning up anonymous user: {e}")

    @database_sync_to_async
    def create_temporary_user(self):
        """Create a temporary user for anonymous participation"""
        import uuid
        from django.contrib.auth.models import User

        try:
            # Cool anonymous username generators
            cool_adjectives = [
                "Shadow",
                "Neon",
                "Cyber",
                "Quantum",
                "Digital",
                "Mystic",
                "Stealth",
                "Phantom",
                "Chrome",
                "Plasma",
                "Lunar",
                "Solar",
                "Cosmic",
                "Electric",
                "Atomic",
                "Stellar",
                "Vector",
                "Matrix",
                "Neural",
                "Blade",
                "Storm",
                "Flash",
                "Turbo",
                "Ultra",
                "Phoenix",
                "Dragon",
                "Wolf",
                "Eagle",
            ]

            cool_nouns = [
                "Warrior",
                "Hunter",
                "Ninja",
                "Samurai",
                "Guardian",
                "Ranger",
                "Scout",
                "Assassin",
                "Pilot",
                "Hacker",
                "Coder",
                "Engineer",
                "Architect",
                "Designer",
                "Builder",
                "Maker",
                "Knight",
                "Mage",
                "Wizard",
                "Sorcerer",
                "Sage",
                "Oracle",
                "Prophet",
                "Mystic",
                "Ghost",
                "Spirit",
                "Phantom",
                "Shadow",
                "Reaper",
                "Sentinel",
                "Warden",
                "Keeper",
                "Storm",
                "Blaze",
                "Frost",
                "Thunder",
                "Lightning",
                "Vortex",
                "Cyclone",
                "Tsunami",
                "Star",
                "Comet",
                "Meteor",
                "Nova",
                "Galaxy",
                "Nebula",
                "Pulsar",
                "Quasar",
            ]

            # Generate a cool username
            adjective = random.choice(cool_adjectives)
            noun = random.choice(cool_nouns)
            number = random.randint(100, 999)
            username = f"{adjective}{noun}{number}"

            # Ensure uniqueness by checking if username exists
            while User.objects.filter(username=username).exists():
                adjective = random.choice(cool_adjectives)
                noun = random.choice(cool_nouns)
                number = random.randint(100, 999)
                username = f"{adjective}{noun}{number}"

            # Create a temporary user (no password, marked as inactive)
            temp_user = User.objects.create(
                username=username,
                email=f"{username}@temp.local",
                is_active=False,  # Mark as inactive so they can't login normally
                first_name="Anonymous",
                last_name="User",
            )

            logger.info(f"Created temporary user: {temp_user.username}")
            return temp_user

        except Exception as e:
            logger.error(f"Error creating temporary user: {e}")
            # Fallback to in-memory user object with cool name
            adjective = random.choice(["Shadow", "Cyber", "Neon", "Ghost"])
            noun = random.choice(["Warrior", "Hunter", "Ninja", "Coder"])
            number = random.randint(100, 999)
            fallback_username = f"{adjective}{noun}{number}"

            return type(
                "TempUser",
                (),
                {
                    "id": None,
                    "username": fallback_username,
                    "is_authenticated": False,
                    "is_anonymous": True,
                },
            )()

    @database_sync_to_async
    def get_or_create_anonymous_user(self):
        """Get or create anonymous user based on session ID"""
        try:
            # Extract session ID from query parameters
            query_string = self.scope.get("query_string", b"").decode()
            query_params = parse_qs(query_string)
            session_id = query_params.get("anonymous_session_id", [None])[0]

            if session_id:
                # Try to find existing session
                try:
                    session = AnonymousSession.objects.select_related("user").get(
                        session_id=session_id
                    )
                    # Update last_seen timestamp
                    session.last_seen = timezone.now()
                    session.save()
                    logger.info(
                        f"Found existing anonymous session for user: {session.user.username}"
                    )
                    return session.user, session_id
                except AnonymousSession.DoesNotExist:
                    logger.info(f"Session ID provided but not found: {session_id}")
                    # Session ID provided but doesn't exist, create new user with new session
                    pass

            # Generate new session ID if not provided or not found
            new_session_id = str(uuid.uuid4())

            # Create new temporary user
            user = self._create_temp_user()

            # Create anonymous session
            AnonymousSession.objects.create(session_id=new_session_id, user=user)

            logger.info(
                f"Created new anonymous session {new_session_id} for user: {user.username}"
            )
            return user, new_session_id

        except Exception as e:
            logger.error(f"Error in get_or_create_anonymous_user: {e}")
            # Fallback: create user without session
            user = self._create_temp_user()
            return user, str(uuid.uuid4())

    def _create_temp_user(self):
        """Helper to create a temporary user with cool username"""
        from django.contrib.auth.models import User

        # Cool anonymous username generators
        cool_adjectives = [
            "Shadow",
            "Neon",
            "Cyber",
            "Quantum",
            "Digital",
            "Mystic",
            "Stealth",
            "Phantom",
            "Chrome",
            "Plasma",
            "Lunar",
            "Solar",
            "Cosmic",
            "Electric",
            "Atomic",
            "Stellar",
            "Vector",
            "Matrix",
            "Neural",
            "Blade",
            "Storm",
            "Flash",
            "Turbo",
            "Ultra",
            "Phoenix",
            "Dragon",
            "Wolf",
            "Eagle",
        ]

        cool_nouns = [
            "Warrior",
            "Hunter",
            "Ninja",
            "Samurai",
            "Guardian",
            "Ranger",
            "Scout",
            "Assassin",
            "Pilot",
            "Hacker",
            "Coder",
            "Engineer",
            "Architect",
            "Designer",
            "Builder",
            "Maker",
            "Knight",
            "Mage",
            "Wizard",
            "Sorcerer",
            "Sage",
            "Oracle",
            "Prophet",
            "Mystic",
            "Ghost",
            "Spirit",
            "Phantom",
            "Shadow",
            "Reaper",
            "Sentinel",
            "Warden",
            "Keeper",
            "Storm",
            "Blaze",
            "Frost",
            "Thunder",
            "Lightning",
            "Vortex",
            "Cyclone",
            "Tsunami",
            "Star",
            "Comet",
            "Meteor",
            "Nova",
            "Galaxy",
            "Nebula",
            "Pulsar",
            "Quasar",
        ]

        # Generate a cool username
        adjective = random.choice(cool_adjectives)
        noun = random.choice(cool_nouns)
        number = random.randint(100, 999)
        username = f"{adjective}{noun}{number}"

        # Ensure uniqueness by checking if username exists
        while User.objects.filter(username=username).exists():
            adjective = random.choice(cool_adjectives)
            noun = random.choice(cool_nouns)
            number = random.randint(100, 999)
            username = f"{adjective}{noun}{number}"

        # Create a temporary user (no password, marked as inactive)
        temp_user = User.objects.create(
            username=username,
            email=f"{username}@temp.local",
            is_active=False,  # Mark as inactive so they can't login normally
            first_name="Anonymous",
            last_name="User",
        )

        return temp_user

    @database_sync_to_async
    def update_room_activity(self, room):
        try:
            if room and hasattr(room, "id") and room.id:
                Room.objects.filter(id=room.id).update(last_activity=timezone.now())
        except Exception as e:
            logger.error(f"Error updating room activity: {e}")

    @database_sync_to_async
    def is_room_inactive(self, room):
        try:
            if not room or not hasattr(room, "last_activity") or not room.last_activity:
                return False
            inactive_threshold = timezone.now() - timedelta(minutes=30)
            return room.last_activity < inactive_threshold
        except Exception as e:
            logger.error(f"Error checking room inactivity: {e}")
            return False

    @database_sync_to_async
    def auto_close_room(self, room):
        try:
            if room and hasattr(room, "id") and room.id:
                Room.objects.filter(id=room.id).update(
                    status=STATUS_CHOICES.COMPLETED, auto_closed=True
                )
        except Exception as e:
            logger.error(f"Error auto-closing room: {e}")

    @database_sync_to_async
    def update_admin_last_room(self, user, room):
        try:
            if user and room and hasattr(user, "id") and user.id:
                user_role, created = UserRole.objects.get_or_create(user=user)
                if user_role.role == "admin":
                    user_role.last_room = room
                    user_role.save()
        except Exception as e:
            logger.error(f"Error updating admin last room: {e}")

    @database_sync_to_async
    def start_room_timer(self, room, duration):
        try:
            if room and hasattr(room, "id") and room.id and duration > 0:
                now = timezone.now()
                Room.objects.filter(id=room.id).update(
                    is_timer_active=True,
                    timer_start_time=now,
                    timer_end_time=now + timedelta(seconds=duration),
                    timer_duration=duration,
                )
                # Refresh the room object to get updated values
                room.refresh_from_db()
        except Exception as e:
            logger.error(f"Error starting room timer: {e}")

    @database_sync_to_async
    def stop_room_timer(self, room):
        try:
            if room and hasattr(room, "id") and room.id:
                Room.objects.filter(id=room.id).update(
                    is_timer_active=False, timer_start_time=None, timer_end_time=None
                )
                # Refresh the room object to get updated values
                room.refresh_from_db()
        except Exception as e:
            logger.error(f"Error stopping room timer: {e}")

    @database_sync_to_async
    def pause_room_timer(self, room):
        try:
            if room and hasattr(room, "id") and room.id:
                Room.objects.filter(id=room.id).update(is_timer_active=False)
                # Refresh the room object to get updated values
                room.refresh_from_db()
        except Exception as e:
            logger.error(f"Error pausing room timer: {e}")

    @database_sync_to_async
    def get_timer_state(self, room):
        try:
            if not room or not hasattr(room, "enable_timer") or not room.enable_timer:
                return None

            # Refresh room data from database to get latest timer state
            fresh_room = Room.objects.get(id=room.id)

            return {
                "is_active": fresh_room.is_timer_active,
                "start_time": (
                    fresh_room.timer_start_time.isoformat()
                    if fresh_room.timer_start_time
                    else None
                ),
                "end_time": (
                    fresh_room.timer_end_time.isoformat()
                    if fresh_room.timer_end_time
                    else None
                ),
                "duration": fresh_room.timer_duration,
            }
        except Exception as e:
            logger.error(f"Error getting timer state: {e}")
            return None

    # Add this method to the RoomConsumer class

    @database_sync_to_async
    def close_room_by_admin(self, room):
        """Close room when admin declines to rejoin"""
        try:
            if room and hasattr(room, "id") and room.id:
                # Update room status
                Room.objects.filter(id=room.id).update(
                    status=STATUS_CHOICES.COMPLETED, auto_closed=True
                )

                # Create session log if there were votes
                participants = Participant.objects.filter(room=room)
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
                                pass
                            selections[participant.user.username] = (
                                participant.card_selection
                            )

                    average = total / count if count > 0 else 0

                    SessionLog.objects.create(
                        room=room,
                        story_point_average=average,
                        participant_selections=selections,
                    )

                return True
        except Exception as e:
            logger.error(f"Error closing room by admin: {e}")
            return False
