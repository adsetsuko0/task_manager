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
    status= models.CharField(max_length=12, choices=STATUS_CHOICES, default='todo')
    owner=models.ForeignKey(User, on_delete=models.CASCADE, related_name='tasks')
    assignee=models.ForeignKey(User, on_delete=models.SET_NULL, related_name='assigned_tasks',null=True, blank=True)
    created_at=models.DateTimeField(auto_now_add=True)
    updated_at=models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.title}-{self.status}'