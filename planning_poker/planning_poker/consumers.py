import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from planning_poker.models import Room, Participant
from planning_poker.fields import STATUS_CHOICES

logger = logging.getLogger(__name__)


class RoomConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_code = self.scope["url_route"]["kwargs"]["room_id"]
        self.room_group_name = f"room_{self.room_code}"
        self.user = self.scope.get("user")

        # Get room info
        try:
            # Try to get room by ID first, then by code
            self.room = await self.get_room_by_id_or_code(self.room_code)
            if not self.room:
                await self.close(code=4404)
                return

            # Join room group
            await self.channel_layer.group_add(self.room_group_name, self.channel_name)

            await self.accept()

            # Send current room state to the newly connected user
            await self.send_room_state()

            # Notify others that a user connected (only if authenticated)
            if self.user and self.user.is_authenticated:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "user_connected",
                        "user_id": self.user.id,
                        "username": self.user.username,
                    },
                )
            else:
                # For unauthenticated users, we'll use a guest identifier
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "user_connected",
                        "user_id": None,
                        "username": "Guest",
                    },
                )

        except Exception as e:
            logger.error(f"Error connecting to room {self.room_code}: {e}")
            await self.close(code=4500)

    async def disconnect(self, close_code):
        # Notify others that user disconnected
        if hasattr(self, "room_group_name"):
            if self.user and self.user.is_authenticated:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "user_disconnected",
                        "user_id": self.user.id,
                        "username": self.user.username,
                    },
                )
            else:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "user_disconnected",
                        "user_id": None,
                        "username": "Guest",
                    },
                )

            # Leave room group
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
        """Handle user vote submission"""
        card_value = data.get("card_value")

        if not card_value:
            await self.send_error("Card value is required")
            return

        # For now, allow unauthenticated users to vote (you can change this later)
        if not self.user or not self.user.is_authenticated:
            # For demo purposes, we'll just broadcast the vote without saving it
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "vote_submitted",
                    "user_id": None,
                    "username": "Guest",
                    "has_voted": True,
                },
            )
            return

        # Update participant's vote
        participant = await self.get_or_create_participant(self.user, self.room)
        await self.update_participant_vote(participant, card_value)

        # Broadcast vote submission (without revealing the actual value)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "vote_submitted",
                "user_id": self.user.id,
                "username": self.user.username,
                "has_voted": True,
            },
        )

    async def handle_reveal_cards(self, data):
        """Handle reveal cards request"""
        # For demo purposes, allow anyone to reveal cards
        # In production, you'd want to check if the user is the host

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

    async def handle_reset_votes(self, data):
        """Handle reset votes request"""
        # For demo purposes, allow anyone to reset votes

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

    async def handle_skip_participant(self, data):
        """Handle skip participant request"""
        participant_id = data.get("participant_id")

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

    async def handle_start_round(self, data):
        """Handle start new round request"""
        # Reset votes and update room status
        await self.reset_all_votes(self.room)
        await self.update_room_status(self.room, STATUS_CHOICES.ACTIVE)

        # Broadcast new round
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "round_started",
                "story_title": data.get("story_title", ""),
            },
        )

    async def handle_chat_message(self, data):
        """Handle chat message"""
        message = data.get("message", "").strip()

        if not message:
            await self.send_error("Message cannot be empty")
            return

        username = "Guest"
        user_id = None

        if self.user and self.user.is_authenticated:
            username = self.user.username
            user_id = self.user.id

        # Broadcast chat message
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
        """Handle join room request for guest users"""
        # Send room state
        await self.send_room_state()

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
                    "has_voted": event["has_voted"],
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

    async def send_room_state(self):
        """Send current room state to the user"""
        participants = await self.get_participants_with_votes(self.room)

        is_host = False
        if self.user and self.user.is_authenticated:
            is_host = await self.is_room_host(self.user, self.room)

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
                }
            )
        )

    def get_current_timestamp(self):
        from django.utils import timezone

        return timezone.now().isoformat()

    # Database operations (async wrappers)
    @database_sync_to_async
    def get_room_by_id_or_code(self, room_identifier):
        """Try to get room by ID first, then by code"""
        try:
            # Try to get by ID first (if the identifier is numeric)
            if room_identifier.isdigit():
                return Room.objects.get(id=int(room_identifier))
            else:
                # Try to get by code
                return Room.objects.get(code=room_identifier)
        except Room.DoesNotExist:
            # Try the other way around
            try:
                if room_identifier.isdigit():
                    return Room.objects.get(code=room_identifier)
                else:
                    return Room.objects.get(id=int(room_identifier))
            except (Room.DoesNotExist, ValueError):
                return None

    @database_sync_to_async
    def get_or_create_participant(self, user, room):
        participant, created = Participant.objects.get_or_create(
            user=user, room=room, defaults={"card_selection": None}
        )
        return participant

    @database_sync_to_async
    def update_participant_vote(self, participant, card_value):
        participant.card_selection = card_value
        participant.save()

    @database_sync_to_async
    def get_participants_with_votes(self, room):
        participants = Participant.objects.filter(room=room).select_related("user")
        return [
            {
                "id": p.id,
                "user_id": p.user.id,
                "username": p.user.username,
                "card_selection": p.card_selection,
                "has_voted": p.card_selection is not None,
            }
            for p in participants
        ]

    @database_sync_to_async
    def is_room_host(self, user, room):
        return user.is_authenticated and room.host == user

    @database_sync_to_async
    def reset_all_votes(self, room):
        Participant.objects.filter(room=room).update(card_selection=None)

    @database_sync_to_async
    def update_room_status(self, room, status):
        room.status = status
        room.save()

    @database_sync_to_async
    def skip_participant(self, participant_id, room):
        try:
            participant = Participant.objects.get(id=participant_id, room=room)
            participant.card_selection = "SKIPPED"
            participant.save()
        except Participant.DoesNotExist:
            pass

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
