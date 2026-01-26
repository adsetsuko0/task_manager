from django.db import models
from django.conf import settings
from users.models import User


class Projects_Group(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
    ]
    name=models.CharField(max_length=100, unique=True)
    priority=models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='normal')
    limit=models.PositiveIntegerField(default=10)

    def __str__(self):
        return self.name
    

class Project(models.Model):
    name=models.CharField(max_length=100)
    group=models.ForeignKey(
        Projects_Group,
        on_delete=models.CASCADE,
        related_name='projects'
    )
    task_limit=models.PositiveIntegerField(default=50)
    is_favourite=models.BooleanField(default=False)
    created_at=models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
    


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
    project=models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='tasks',
        null=True,
        blank=True,
    )

    def __str__(self):
        return f'{self.title}-{self.status}'
    
    
