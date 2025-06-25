from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Room
from .fields import STATUS_CHOICES
import logging

logger = logging.getLogger(__name__)


@shared_task
def check_inactive_rooms():
    """Check for inactive rooms and close them"""
    try:
        inactive_threshold = timezone.now() - timedelta(minutes=30)
        inactive_rooms = Room.objects.filter(
            last_activity__lt=inactive_threshold,
            auto_closed=False,
            status__in=[STATUS_CHOICES.ACTIVE, STATUS_CHOICES.WAITING],
        )

        channel_layer = get_channel_layer()

        for room in inactive_rooms:
            logger.info(f"Auto-closing inactive room: {room.code}")

            try:
                # Update room status
                room.status = STATUS_CHOICES.COMPLETED
                room.auto_closed = True
                room.save()

                # Notify connected clients
                if channel_layer:
                    async_to_sync(channel_layer.group_send)(
                        f"room_{room.code}",
                        {
                            "type": "room_auto_closed",
                            "reason": "Room closed due to inactivity (30 minutes)",
                        },
                    )
            except Exception as e:
                logger.error(f"Error closing room {room.code}: {e}")

    except Exception as e:
        logger.error(f"Error in check_inactive_rooms task: {e}")


@shared_task
def check_expired_timers():
    """Check for expired room timers and notify clients"""
    try:
        now = timezone.now()
        expired_timer_rooms = Room.objects.filter(
            is_timer_active=True, timer_end_time__lt=now, enable_timer=True
        )

        channel_layer = get_channel_layer()

        for room in expired_timer_rooms:
            logger.info(f"Timer expired for room: {room.code}")

            try:
                # Stop the timer
                room.is_timer_active = False
                room.save()

                # Notify connected clients
                if channel_layer:
                    async_to_sync(channel_layer.group_send)(
                        f"room_{room.code}",
                        {
                            "type": "timer_expired",
                        },
                    )
            except Exception as e:
                logger.error(f"Error handling expired timer for room {room.code}: {e}")

    except Exception as e:
        logger.error(f"Error in check_expired_timers task: {e}")
