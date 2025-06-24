from django.contrib.auth.models import User
from django.db import models
from .fields import STATUS_CHOICES, POINT_SYSTEMS
from .helpers import generate_random_project_name


class UserRole(models.Model):
    ADMIN = "admin"
    PARTICIPANT = "participant"

    ROLE_CHOICES = [
        (ADMIN, "Admin"),
        (PARTICIPANT, "Participant"),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="role")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=PARTICIPANT)

    def __str__(self):
        return f"{self.user.username} - {self.get_role_display()}"

    def save(self, *args, **kwargs):
        # Auto-assign admin role for superusers/staff
        if self.user.is_superuser or self.user.is_staff:
            self.role = self.ADMIN
        super().save(*args, **kwargs)


class Room(models.Model):
    id = models.AutoField(primary_key=True)
    host = models.ForeignKey(User, on_delete=models.CASCADE)
    code = models.CharField(max_length=10, unique=True)
    project_name = models.CharField(
        max_length=100,
        help_text="Name of the project or feature being estimated",
        default=generate_random_project_name(),
    )
    point_system = models.CharField(
        max_length=20,
        choices=POINT_SYSTEMS.choices,
        default=POINT_SYSTEMS.FIBONACCI,
        help_text="Point system used for estimation",
    )
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES.choices, default=STATUS_CHOICES.PENDING
    )
    auto_reveal_cards = models.BooleanField(
        default=False,
        help_text="Automatically reveal cards after all participants have selected",
    )
    allow_skip = models.BooleanField(
        default=True,
        help_text="Allow participants to skip their selection",
    )
    enable_timer = models.BooleanField(
        default=False,
        help_text="Enable timer for each round of estimation",
    )
    timer_duration = models.PositiveIntegerField(
        default=60,
        help_text="Duration of the timer in seconds",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Room {self.code} - {self.project_name} - {self.status}"

    def is_admin(self, user):
        """Check if user is an admin"""
        try:
            return user.role.role == UserRole.ADMIN
        except (AttributeError, UserRole.DoesNotExist):
            return False

    def can_control_game(self, user):
        """Check if user can control game flow (admin or host)"""
        return self.is_admin(user) or self.host == user


class Participant(models.Model):
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    room = models.ForeignKey(Room, on_delete=models.CASCADE)
    card_selection = models.CharField(max_length=50, null=True, blank=True)

    def __str__(self):
        return f"Participant {self.user.username} in Room {self.room.code}"


class SessionLog(models.Model):
    id = models.AutoField(primary_key=True)
    room = models.ForeignKey(Room, on_delete=models.CASCADE)
    story_point_average = models.FloatField()
    participant_selections = models.JSONField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"SessionLog for Room {self.room.code} at {self.timestamp}"


# SessionLog already stores story_point_average, participant_selections, timestamp, and room.
