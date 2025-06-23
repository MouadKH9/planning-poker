from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from planning_poker.models import Room, Participant, SessionLog, UserRole


class ParticipantInline(admin.TabularInline):
    model = Participant
    extra = 0
    fields = ["user", "card_selection"]
    readonly_fields = ["card_selection"]


class SessionLogInline(admin.TabularInline):
    model = SessionLog
    extra = 0
    readonly_fields = ["story_point_average", "participant_selections", "timestamp"]
    can_delete = False


class UserRoleInline(admin.StackedInline):
    model = UserRole
    can_delete = False
    verbose_name_plural = "User Role"
    extra = 0


class UserAdmin(BaseUserAdmin):
    inlines = (UserRoleInline,)


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ["id", "code", "host", "status", "participant_count", "has_logs"]
    list_filter = ["status"]
    search_fields = ["code", "host__username"]
    readonly_fields = ["code"]
    inlines = [ParticipantInline, SessionLogInline]

    def participant_count(self, obj):
        return obj.participant_set.count()

    participant_count.short_description = "Participants"

    def has_logs(self, obj):
        return obj.sessionlog_set.exists()

    has_logs.boolean = True
    has_logs.short_description = "Has Logs"


@admin.register(Participant)
class ParticipantAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "room", "card_selection", "has_voted"]
    list_filter = ["room"]
    search_fields = ["user__username", "room__code"]

    def has_voted(self, obj):
        return obj.card_selection is not None

    has_voted.boolean = True
    has_voted.short_description = "Has Voted"


@admin.register(SessionLog)
class SessionLogAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "room",
        "story_point_average",
        "participant_count",
        "timestamp",
    ]
    list_filter = ["room"]
    readonly_fields = [
        "room",
        "story_point_average",
        "participant_selections",
        "timestamp",
    ]
    search_fields = ["room__code"]

    def participant_count(self, obj):
        return len(obj.participant_selections)

    participant_count.short_description = "Participants"


@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = ["user", "role", "user_email", "user_last_login"]
    list_filter = ["role"]
    search_fields = ["user__username", "user__email"]
    readonly_fields = ["user_email", "user_last_login", "user_date_joined"]

    def user_email(self, obj):
        return obj.user.email

    user_email.short_description = "Email"

    def user_last_login(self, obj):
        return obj.user.last_login

    user_last_login.short_description = "Last Login"

    def user_date_joined(self, obj):
        return obj.user.date_joined

    user_date_joined.short_description = "Date Joined"


# Re-register UserAdmin
admin.site.unregister(User)
admin.site.register(User, UserAdmin)
