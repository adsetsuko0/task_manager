"""Выборки данных, доступных конкретному пользователю.

Все данные в приложении приватные: пользователь видит и меняет только свои
группы, проекты и задачи. Вьюхи должны брать объекты через эти функции,
а не через Model.objects.all() или Model.objects.get(id=...).
"""

from django.db.models import Q
from django.http import JsonResponse

from .models import Project, Projects_Group, Task


def user_groups(user):
    return Projects_Group.objects.filter(owner=user)


def user_projects(user):
    return Project.objects.filter(group__owner=user)


def user_tasks(user):
    # Задача принадлежит владельцу своего проекта. Задачи без проекта
    # (старые данные) принадлежат тому, кто их создал.
    return Task.objects.filter(
        Q(project__group__owner=user) | Q(project__isnull=True, owner=user)
    )


def assignee_allowed(user, assignee_id):
    """Исполнителем можно назначить только самого себя или никого."""
    return assignee_id in (None, "") or str(assignee_id) == str(user.id)


def not_found(what="Not found"):
    return JsonResponse({"success": False, "error": what}, status=404)
