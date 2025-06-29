# Generated by Django 5.2.3 on 2025-06-24 15:28

import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('planning_poker', '0004_room_point_system_alter_room_project_name'),
    ]

    operations = [
        migrations.AddField(
            model_name='room',
            name='allow_skip',
            field=models.BooleanField(default=True, help_text='Allow participants to skip their selection'),
        ),
        migrations.AddField(
            model_name='room',
            name='auto_reveal_cards',
            field=models.BooleanField(default=False, help_text='Automatically reveal cards after all participants have selected'),
        ),
        migrations.AddField(
            model_name='room',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='room',
            name='enable_timer',
            field=models.BooleanField(default=False, help_text='Enable timer for each round of estimation'),
        ),
        migrations.AddField(
            model_name='room',
            name='timer_duration',
            field=models.PositiveIntegerField(default=60, help_text='Duration of the timer in seconds'),
        ),
        migrations.AddField(
            model_name='room',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AlterField(
            model_name='room',
            name='project_name',
            field=models.CharField(default='Vortex Station', help_text='Name of the project or feature being estimated', max_length=100),
        ),
    ]
