from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.db.utils import IntegrityError
from planning_poker.models import UserRole


class Command(BaseCommand):
    help = "Creates a development admin user"

    def add_arguments(self, parser):
        parser.add_argument(
            "--username",
            default="admin",
            help="Username for the admin (default: admin)",
        )
        parser.add_argument(
            "--password",
            default="admin",
            help="Password for the admin (default: admin)",
        )
        parser.add_argument(
            "--email",
            default="admin@example.com",
            help="Email for the admin (default: admin@example.com)",
        )

    def handle(self, *args, **options):
        username = options["username"]
        password = options["password"]
        email = options["email"]

        try:
            user = User.objects.create_superuser(
                username=username,
                email=email,
                password=password,
            )
            # Create admin role
            UserRole.objects.create(user=user, role=UserRole.ADMIN)

            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully created superuser "{username}" with admin role'
                )
            )
        except IntegrityError:
            # User already exists, update and ensure admin role
            user = User.objects.get(username=username)
            user.set_password(password)
            user.email = email
            user.is_staff = True
            user.is_superuser = True
            user.save()

            # Ensure admin role exists
            role, created = UserRole.objects.get_or_create(
                user=user, defaults={"role": UserRole.ADMIN}
            )
            if not created and role.role != UserRole.ADMIN:
                role.role = UserRole.ADMIN
                role.save()

            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully updated superuser "{username}" with admin role'
                )
            )

        self.stdout.write(
            self.style.SUCCESS(
                f'You can now login at the admin site with username "{username}" and password "{password}"'
            )
        )
