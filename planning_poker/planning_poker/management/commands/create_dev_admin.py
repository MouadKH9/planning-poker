from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.db.utils import IntegrityError


class Command(BaseCommand):
    help = 'Creates a development admin user'

    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            default='admin',
            help='Username for the admin (default: admin)',
        )
        parser.add_argument(
            '--password',
            default='admin',
            help='Password for the admin (default: admin)',
        )
        parser.add_argument(
            '--email',
            default='admin@example.com',
            help='Email for the admin (default: admin@example.com)',
        )

    def handle(self, *args, **options):
        username = options['username']
        password = options['password']
        email = options['email']

        try:
            user = User.objects.create_superuser(
                username=username,
                email=email,
                password=password,
            )
            self.stdout.write(self.style.SUCCESS(
                f'Successfully created superuser "{username}" with email "{email}"'
            ))
        except IntegrityError:
            # User already exists, we'll update the password
            user = User.objects.get(username=username)
            user.set_password(password)
            user.email = email
            user.is_staff = True
            user.is_superuser = True
            user.save()
            self.stdout.write(self.style.SUCCESS(
                f'Successfully updated superuser "{username}" with email "{email}"'
            ))
        
        self.stdout.write(self.style.SUCCESS(
            f'You can now login at the admin site with username "{username}" and password "{password}"'
        )) 