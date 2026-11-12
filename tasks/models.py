from django.db import models

from users.models import User


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} Profile"


class Projects_Group(models.Model):
    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("normal", "Normal"),
        ("high", "High"),
    ]
    owner = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="project_groups"
    )
    name = models.CharField(max_length=100)
    priority = models.CharField(
        max_length=10, choices=PRIORITY_CHOICES, default="normal"
    )
    limit = models.PositiveIntegerField(default=10)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["owner", "name"], name="unique_group_name_per_owner"
            )
        ]

    def __str__(self):
        return self.name


class Project(models.Model):
    name = models.CharField(max_length=100)
    group = models.ForeignKey(
        Projects_Group, on_delete=models.CASCADE, related_name="projects"
    )
    task_limit = models.PositiveIntegerField(default=10)
    is_favourite = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Task(models.Model):
    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("high", "High"),
    ]

    STATUS_CHOICES = (
        ("todo", "To Do"),
        ("in_progress", "In Progress"),
        ("done", "Done"),
    )

    title = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default="todo")
    priority = models.CharField(
        max_length=10, choices=PRIORITY_CHOICES, default="low"
    )  # ← новое
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="tasks")
    assignee = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name="assigned_tasks",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    due_date = models.DateTimeField(null=True, blank=True)
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="tasks", null=True, blank=True
    )
    order = models.PositiveIntegerField(default=0)
