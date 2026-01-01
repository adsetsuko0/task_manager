from django.db import models
from users.models import User

class Task(models.Model):
    STATUS_CHOICES = (
        ("todo", "To Do"),
        ("in_progress", "In Progress"),
        ("done", "Done"),
    )

    title=models.CharField(max_length=100)
    description = models.TextField(blank=True)
    