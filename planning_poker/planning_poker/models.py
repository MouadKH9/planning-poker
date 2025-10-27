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
    last_room = models.ForeignKey(
        "Room",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="last_admin_room",
    )

    def __str__(self):
        return f"{self.user.username} - {self.get_role_display()}"

    def save(self, *args, **kwargs):
        # Auto-assign admin role for superusers/staff
        if self.user.is_superuser or self.user.is_staff:
            self.role = self.ADMIN
        super().save(*args, **kwargs)


class AnonymousSession(models.Model):
    session_id = models.CharField(max_length=64, unique=True, db_index=True)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="anonymous_session")
    created_at = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Anonymous Session {self.session_id[:8]}... - {self.user.username}"
    
    @classmethod
    def cleanup_old_sessions(cls, days=7):
        """Remove anonymous sessions older than specified days"""
        from django.utils import timezone
        from datetime import timedelta
        threshold = timezone.now() - timedelta(days=days)
        old_sessions = cls.objects.filter(last_seen__lt=threshold)
        for session in old_sessions:
            user = session.user
            session.delete()
            user.delete()


class Room(models.Model):
    id = models.AutoField(primary_key=True)
    host = models.ForeignKey(User, on_delete=models.CASCADE)
    code = models.CharField(max_length=10, unique=True, blank=False, null=False)
    project_name = models.CharField(
        max_length=100,
        help_text="Name of the project or feature being estimated",
        blank=True,  # Allow blank so we can set default in save method
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
    enable_timer = models.BooleanField(default=False)
    timer_duration = models.IntegerField(default=300)  # in seconds, default 5 minutes
    timer_start_time = models.DateTimeField(null=True, blank=True)
    timer_end_time = models.DateTimeField(null=True, blank=True)
    is_timer_active = models.BooleanField(default=False)
    last_activity = models.DateTimeField(auto_now=True)
    auto_closed = models.BooleanField(default=False)
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

    def clean(self):
        """Validate model fields"""
        from django.core.exceptions import ValidationError

        if not self.code or not self.code.strip():
            raise ValidationError({"code": "Room code cannot be empty"})
        super().clean()

    def save(self, *args, **kwargs):
        """Override save to ensure validation and set default project name"""
        # Set default project name if not provided
        if not self.project_name:
            from .helpers import generate_random_project_name

            self.project_name = generate_random_project_name()

        self.full_clean()
        super().save(*args, **kwargs)


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
