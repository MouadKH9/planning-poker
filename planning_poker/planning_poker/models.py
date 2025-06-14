from django.contrib.auth.models import User
from django.db import models
from planning_poker.fields import STATUS_CHOICES


class Room(models.Model):
    id = models.AutoField(primary_key=True)
    host = models.ForeignKey(User, on_delete=models.CASCADE)
    code = models.CharField(max_length=10, unique=True)
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES.choices, default=STATUS_CHOICES.PENDING
    )

    def __str__(self):
        return f"Room {self.code} - {self.status}"


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
