import json
from datetime import timedelta

from django import forms
from django.contrib.auth import (
    authenticate,
    get_user_model,
    login,
    logout,
    password_validation,
    update_session_auth_hash,
)
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.db.models import Count
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.http import JsonResponse
from django.shortcuts import redirect, render
from django.utils import timezone
from django.views.decorators.http import require_POST
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import permissions, viewsets

from .access import (
    assignee_allowed,
    not_found,
    user_groups,
    user_projects,
    user_tasks,
)
from .models import Project, Projects_Group, Task, UserProfile
from .serializers import ProjectSerializer, ProjectsGroupSerializer, TaskSerializer

User = get_user_model()


def _get_user_task(request, data):
    return user_tasks(request.user).filter(id=data.get("task_id")).first()


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.get_or_create(user=instance)


@login_required
def update_user(request):
    if request.method == "POST":
        data = json.loads(request.body)
        user = request.user

        username = data.get("username", "").strip()
        email = data.get("email", "").strip()
        password = data.get("password", "").strip()

        if not username:
            return JsonResponse(
                {"success": False, "error": "Username cannot be empty"}, status=400
            )
        if User.objects.filter(username=username).exclude(id=user.id).exists():
            return JsonResponse(
                {"success": False, "error": "Username already taken"}, status=400
            )

        user.username = username
        user.email = email

        if password:
            try:
                password_validation.validate_password(password, user)
            except ValidationError as error:
                return JsonResponse(
                    {"success": False, "error": " ".join(error.messages)}, status=400
                )
            user.set_password(password)
            user.save()
            update_session_auth_hash(request, user)  # keep the session after the change
        else:
            user.save()

        return JsonResponse(
            {
                "success": True,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,
            }
        )

    return JsonResponse({"success": False, "error": "Invalid request"}, status=400)


ALLOWED_AVATAR_TYPES = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
}
MAX_AVATAR_SIZE = 2 * 1024 * 1024  # 2 MB


@login_required
@require_POST
def upload_avatar(request):
    avatar = request.FILES.get("avatar")
    if avatar is None:
        return JsonResponse({"success": False, "error": "No file uploaded"}, status=400)
    if avatar.size > MAX_AVATAR_SIZE:
        return JsonResponse(
            {"success": False, "error": "Image is too large (max 2 MB)"}, status=400
        )
    try:
        # Pillow checks the real content and sets the real content type
        forms.ImageField().clean(avatar)
    except ValidationError:
        return JsonResponse(
            {"success": False, "error": "File is not a valid image"}, status=400
        )
    extension = ALLOWED_AVATAR_TYPES.get(avatar.content_type)
    if extension is None:
        return JsonResponse(
            {"success": False, "error": "Use a PNG, JPEG, GIF or WebP image"},
            status=400,
        )

    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    if profile.avatar:
        profile.avatar.delete(save=False)  # do not leave the old file on disk
    avatar.name = f"avatar.{extension}"  # never trust the client's file name
    profile.avatar = avatar
    profile.save()
    return JsonResponse({"success": True, "avatar_url": profile.avatar.url})


@login_required
def delete_avatar(request):
    if request.method == "POST":
        try:
            profile = UserProfile.objects.get(user=request.user)
            profile.avatar.delete()
            profile.avatar = None
            profile.save()
        except UserProfile.DoesNotExist:
            pass
        return JsonResponse({"success": True})
    return JsonResponse({"success": False})


@login_required
def main_page(request):
    projects = user_projects(request.user)
    groups = user_groups(request.user)

    recent_projects = projects[:4]
    favourite_projects = projects.filter(is_favourite=True)[:4]

    for p in recent_projects:
        p.group_name = p.group.name if p.group else ""

    # Добавляем атрибут group_name для favourite_projects
    for p in favourite_projects:
        p.group_name = p.group.name if p.group else ""

    context = {
        "page_title": "Home",
        "projects": projects,
        "recent_projects": recent_projects,
        "favourite_projects": favourite_projects,
        "groups": groups,
    }

    return render(request, "tasks/main.html", context)


# для проектов
@require_POST
@login_required
def create_project(request):
    try:
        data = json.loads(request.body)
        name = data.get("name")
        task_limit = int(data.get("limit", 10))  # default 10
        group_id = data.get("group_id")

        if not name or not group_id:
            return JsonResponse({"error": "Missing parameters"}, status=400)

        group = user_groups(request.user).get(id=int(group_id))

        projects_count = Project.objects.filter(group=group).count()

        if projects_count >= group.limit:
            return JsonResponse(
                {"success": False, "error": "Group project limit reached"}, status=400
            )

        project = Project.objects.create(
            name=name,
            task_limit=task_limit,
            is_favourite=False,
            group=group,
            created_at=None,
        )

        return JsonResponse(
            {
                "id": project.id,
                "name": project.name,
                "task_limit": project.task_limit,
                "is_favourite": project.is_favourite,
                "group_id": group.id,
            }
        )

    except Projects_Group.DoesNotExist:
        return JsonResponse({"error": "Group not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@login_required
def project_get(request):
    projects = user_projects(request.user).values(
        "id",
        "name",
        "task_limit",
        "is_favourite",
        "group_id",
    )
    return JsonResponse(list(projects), safe=False)


@login_required
def project_rename(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "Invalid request"})

    try:
        data = json.loads(request.body)
        project_id = data.get("project_id")
        new_name = data.get("new_name")

        if not new_name:
            return JsonResponse({"success": False, "error": "Name is empty"})

        project = user_projects(request.user).get(id=project_id)
        project.name = new_name
        project.save(update_fields=["name"])  # 👈 обновляем только поле name

        return JsonResponse({"success": True})

    except Project.DoesNotExist:
        return JsonResponse({"success": False, "error": "Project not found"})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)})


@login_required
@require_POST
def toggle_favourite_project(request):
    try:
        data = json.loads(request.body)
        project_id = data.get("project_id")

        project = user_projects(request.user).get(id=project_id)
        project.is_favourite = not project.is_favourite
        project.save(update_fields=["is_favourite"])

        return JsonResponse({"success": True, "is_favourite": project.is_favourite})

    except Project.DoesNotExist:
        return JsonResponse({"success": False, "error": "Project not found"})


@login_required
def duplicate_project(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "Invalid request"})

    try:
        data = json.loads(request.body)
        project_id = data.get("project_id")
        project = user_projects(request.user).get(id=project_id)
        group = project.group

        # Проверка лимита перед созданием дубликата
        projects_count = Project.objects.filter(group=group).count()
        if projects_count >= group.limit:
            return JsonResponse(
                {"success": False, "error": "Project limit reached for this group"}
            )

        # Создаем копию проекта
        new_project = Project.objects.create(
            name=f"{project.name} (copy)",
            group=project.group,
            task_limit=project.task_limit,
            is_favourite=project.is_favourite,
        )

        for task in project.tasks.all():
            Task.objects.create(
                title=task.title,
                description=task.description,
                status=task.status,
                priority=task.priority,
                owner=request.user,
                assignee=task.assignee,
                due_date=task.due_date,
                project=new_project,
            )

        return JsonResponse(
            {
                "success": True,
                "project": {
                    "id": new_project.id,
                    "name": new_project.name,
                    "group_id": new_project.group.id,
                    "task_limit": new_project.task_limit,
                    "is_favourite": new_project.is_favourite,
                },
            }
        )
    except Project.DoesNotExist:
        return JsonResponse({"success": False, "error": "Project not found"})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)})


@login_required
def project_delete(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "Invalid request"})

    try:
        data = json.loads(request.body)
        project_id = data.get("project_id")

        project = user_projects(request.user).get(id=project_id)
        project.delete()

        return JsonResponse({"success": True})

    except Project.DoesNotExist:
        return JsonResponse({"success": False, "error": "Project not found"})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)})


# для групп


@login_required
def create_group(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST"}, status=405)

    data = json.loads(request.body)

    name = (data.get("name") or "").strip()
    if not name:
        return JsonResponse({"error": "Name is empty"}, status=400)
    if user_groups(request.user).filter(name=name).exists():
        return JsonResponse(
            {"error": "Group with this name already exists"}, status=400
        )

    group = Projects_Group.objects.create(
        owner=request.user,
        name=name,
        priority=data["priority"],
        limit=int(data["limit"]),
    )

    return JsonResponse(
        {
            "id": group.id,
            "name": group.name,
            "priority": group.priority,
            "limit": group.limit,
        }
    )


@login_required
def get_groups(request):
    groups = user_groups(request.user).values("id", "name", "priority", "limit")
    return JsonResponse(list(groups), safe=False)


@login_required
@require_POST
def rename_group(request):
    group_id = request.POST.get("group_id")
    new_name = request.POST.get("name")

    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)

    try:
        data = json.loads(request.body)
        group_id = data.get("group_id")
        new_name = data.get("new_name")

        if not group_id or not new_name:
            return JsonResponse({"error": "Missing parameters"}, status=400)

        group = user_groups(request.user).get(id=group_id)
        if (
            user_groups(request.user)
            .filter(name=new_name)
            .exclude(id=group.id)
            .exists()
        ):
            return JsonResponse(
                {"error": "Group with this name already exists"}, status=400
            )
        group.name = new_name
        group.save()

        return JsonResponse(
            {"success": True, "name": group.name},
        )

    except Projects_Group.DoesNotExist:
        return JsonResponse({"error": "Group not found"}, status=404)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@login_required
@require_POST
def change_group_priority(request):
    try:
        data = json.loads(request.body)
        group_id = data.get("group_id")
        new_priority = data.get("new_priority")

        if not group_id or not new_priority:
            return JsonResponse({"error": "Missing parameters"}, status=400)

        if new_priority not in ["low", "normal", "high"]:
            return JsonResponse({"error": "Invalid priority"}, status=400)

        group = user_groups(request.user).get(id=group_id)
        group.priority = new_priority
        group.save()

        return JsonResponse({"success": True, "priority": group.priority})

    except Projects_Group.DoesNotExist:
        return JsonResponse({"error": "Group not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@login_required
@require_POST
def duplicate_group(request):
    data = json.loads(request.body)
    group_id = data.get("group_id")

    try:
        original_group = user_groups(request.user).get(id=group_id)
    except Projects_Group.DoesNotExist:
        return JsonResponse({"error": "Group not found"}, status=404)

    base_name = original_group.name
    existing_copies = (
        user_groups(request.user).filter(name__startswith=f"{base_name} copy").count()
    )
    copy_number = existing_copies + 1
    new_name = f"{base_name} copy ({copy_number})"
    while user_groups(request.user).filter(name=new_name).exists():
        copy_number += 1
        new_name = f"{base_name} copy ({copy_number})"

    new_group = Projects_Group.objects.create(
        owner=request.user,
        name=new_name,
        priority=original_group.priority,
        limit=original_group.limit,
    )

    projects_data = []

    for project in original_group.projects.all():
        new_project = Project.objects.create(
            group=new_group,
            name=project.name,
            task_limit=project.task_limit,
            is_favourite=project.is_favourite,
        )

        projects_data.append(
            {
                "id": new_project.id,
                "name": new_project.name,
                "limit": new_project.task_limit,
                "favorite": new_project.is_favourite,
            }
        )

    return JsonResponse(
        {
            "id": new_group.id,
            "name": new_group.name,
            "priority": new_group.priority,
            "limit": new_group.limit,
            "projects": projects_data,
        }
    )


@login_required
@require_POST
def delete_group(request):
    try:
        data = json.loads(request.body)
        group_id = data.get("group_id")

        if not group_id:
            return JsonResponse({"error": "Missing group_id"}, status=400)

        group = user_groups(request.user).get(id=group_id)
        group.delete()  # CASCADE удалит проекты автоматически

        return JsonResponse({"success": True})

    except Projects_Group.DoesNotExist:
        return JsonResponse({"error": "Group not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@login_required
def search_suggestions(request):
    q = request.GET.get("q", "").strip()
    if not q:
        return JsonResponse([], safe=False)

    projects = user_projects(request.user).filter(name__istartswith=q)[:5]
    groups = user_groups(request.user).filter(name__istartswith=q)[:5]
    tasks = user_tasks(request.user).filter(title__istartswith=q)[:5]

    results = []

    results += [{"id": p.id, "name": p.name, "type": "project"} for p in projects]
    results += [{"id": g.id, "name": g.name, "type": "group"} for g in groups]
    results += [{"id": t.id, "name": t.title, "type": "task"} for t in tasks]

    return JsonResponse(results, safe=False)


class ProjectsGroupViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectsGroupSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Projects_Group.objects.none()
        return user_groups(self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Project.objects.none()
        return user_projects(self.request.user)


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer

    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["status", "assignee"]

    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Task.objects.none()
        return user_tasks(self.request.user)


@login_required
def get_project_tasks(request, project_id):
    if not user_projects(request.user).filter(id=project_id).exists():
        return not_found("Project not found")
    tasks = (
        user_tasks(request.user)
        .filter(project_id=project_id)
        .select_related("assignee")
        .order_by("order", "id")
    )
    data = [
        {
            "id": t.id,
            "title": t.title,
            "description": t.description,
            "status": t.status,
            "priority": t.priority,
            "assignee": t.assignee.username if t.assignee else None,
            "assignee_id": t.assignee.id if t.assignee else None,
            "created_at": t.created_at.strftime("%d.%m.%Y"),
            "updated_at": t.updated_at.strftime("%d.%m.%Y"),
            "due_date": t.due_date.strftime("%d.%m.%Y") if t.due_date else None,
        }
        for t in tasks
    ]
    return JsonResponse(data, safe=False)


@login_required
def create_task(request):
    if request.method == "POST":
        data = json.loads(request.body)
        project = user_projects(request.user).filter(id=data.get("project_id")).first()
        if project is None:
            return not_found("Project not found")
        if not assignee_allowed(request.user, data.get("assignee_id")):
            return JsonResponse(
                {"success": False, "error": "Invalid assignee"}, status=400
            )
        task = Task.objects.create(
            title=data["title"],
            description=data.get("description", ""),
            status=data.get("status", "todo"),
            priority=data.get("priority", "low"),
            project=project,
            owner=request.user,
            due_date=data.get("due_date") or None,
            assignee_id=data.get("assignee_id") or None,
        )
        return JsonResponse({"success": True, "task_id": task.id})
    return JsonResponse({"success": False})


@login_required
def list_users(request):
    # Данные приватные: другие пользователи не видны, назначить можно только себя
    users = User.objects.filter(id=request.user.id).values("id", "username")
    return JsonResponse(list(users), safe=False)


@login_required
def rename_task(request):
    data = json.loads(request.body)
    task = _get_user_task(request, data)
    if task is None:
        return not_found("Task not found")
    task.title = data["new_name"]
    task.save()
    task.refresh_from_db()
    return JsonResponse({"success": True})


@login_required
def delete_task(request):
    data = json.loads(request.body)
    task = _get_user_task(request, data)
    if task is None:
        return not_found("Task not found")
    task.delete()
    return JsonResponse({"success": True})


@login_required
def duplicate_task(request):
    data = json.loads(request.body)
    task = _get_user_task(request, data)
    if task is None:
        return not_found("Task not found")
    task.pk = None
    task.title = task.title + " (copy)"
    task.owner = request.user
    task.save()
    return JsonResponse({"success": True})


@login_required
def update_task_status(request):
    data = json.loads(request.body)
    task = _get_user_task(request, data)
    if task is None:
        return not_found("Task not found")
    task.status = data["status"]
    task.save()
    return JsonResponse({"success": True})


@login_required
def update_task_description(request):
    data = json.loads(request.body)
    task = _get_user_task(request, data)
    if task is None:
        return not_found("Task not found")
    task.description = data["description"]
    task.save()
    return JsonResponse({"success": True})


@login_required
def update_task_due_date(request):
    data = json.loads(request.body)
    task = _get_user_task(request, data)
    if task is None:
        return not_found("Task not found")
    task.due_date = data["due_date"] or None
    task.save()
    return JsonResponse({"success": True})


@login_required
def update_task_assignee(request):
    data = json.loads(request.body)
    task = _get_user_task(request, data)
    if task is None:
        return not_found("Task not found")
    if not assignee_allowed(request.user, data.get("assignee_id")):
        return JsonResponse({"success": False, "error": "Invalid assignee"}, status=400)
    task.assignee_id = data["assignee_id"] or None
    task.save()
    return JsonResponse({"success": True})


@login_required
def move_task(request):
    data = json.loads(request.body)
    task = _get_user_task(request, data)
    if task is None:
        return not_found("Task not found")
    project = user_projects(request.user).filter(id=data.get("project_id")).first()
    if project is None:
        return not_found("Project not found")
    task.project = project
    task.save()
    return JsonResponse({"success": True})


@login_required
def update_task_priority(request):
    data = json.loads(request.body)
    task = _get_user_task(request, data)
    if task is None:
        return not_found("Task not found")
    task.priority = data["priority"]
    task.save()
    task.refresh_from_db()
    return JsonResponse({"success": True})


@login_required
def favourite_projects(request):
    projects = (
        user_projects(request.user).filter(is_favourite=True).select_related("group")
    )

    data = [
        {
            "id": p.id,
            "name": p.name,
            "group_name": p.group.name,
            "is_favourite": p.is_favourite,
        }
        for p in projects
    ]

    return JsonResponse(data, safe=False)


@login_required
def dashboard_stats(request):
    today = timezone.now()

    all_tasks = user_tasks(request.user)

    total = all_tasks.count()
    done = all_tasks.filter(status="done").count()
    in_progress = all_tasks.filter(status="in_progress").count()
    todo = all_tasks.filter(status="todo").count()
    overdue = all_tasks.filter(
        due_date__lt=today, status__in=["todo", "in_progress"]
    ).count()

    by_project = list(
        user_projects(request.user)
        .annotate(task_count=Count("tasks"))
        .values("name", "task_count")
        .order_by("-task_count")
    )

    completed_by_day = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        count = all_tasks.filter(status="done", updated_at__date=day.date()).count()
        completed_by_day.append({"date": day.strftime("%d.%m"), "count": count})

    overdue_tasks = list(
        all_tasks.filter(due_date__lt=today)
        .exclude(status="done")
        .select_related("project")
        .values("id", "title", "due_date", "priority", "project__name")
        .order_by("due_date")[:10]
    )
    for t in overdue_tasks:
        if t["due_date"]:
            t["due_date"] = t["due_date"].strftime("%d.%m.%Y")

    # upcoming tasks (следующие 7 дней)
    upcoming_tasks = list(
        all_tasks.filter(due_date__gte=today, due_date__lte=today + timedelta(days=7))
        .exclude(status="done")
        .select_related("project")
        .values("id", "title", "due_date", "priority", "project__name", "status")
        .order_by("due_date")[:10]
    )
    for t in upcoming_tasks:
        if t["due_date"]:
            t["due_date"] = t["due_date"].strftime("%d.%m.%Y")

    # все таски
    all_tasks_list = list(
        all_tasks.select_related("project")
        .values("id", "title", "status", "priority", "due_date", "project__name")
        .order_by("-created_at")[:20]
    )

    for t in all_tasks_list:
        if t["due_date"]:
            t["due_date"] = t["due_date"].strftime("%d.%m.%Y")

    done_tasks_list = list(
        all_tasks.filter(status="done")
        .select_related("project")
        .values("id", "title", "status", "priority", "due_date", "project__name")
        .order_by("-updated_at")[:20]
    )

    for t in done_tasks_list:
        if t["due_date"]:
            t["due_date"] = t["due_date"].strftime("%d.%m.%Y")

    progress_tasks_list = list(
        all_tasks.filter(status="in_progress")
        .select_related("project")
        .values("id", "title", "status", "priority", "due_date", "project__name")
        .order_by("-updated_at")[:20]
    )

    for t in progress_tasks_list:
        if t["due_date"]:
            t["due_date"] = t["due_date"].strftime("%d.%m.%Y")

    return JsonResponse(
        {
            "total": total,
            "done": done,
            "in_progress": in_progress,
            "todo": todo,
            "overdue": overdue,
            "by_project": by_project,
            "completed_by_day": completed_by_day,
            "overdue_tasks": overdue_tasks,
            "upcoming_tasks": upcoming_tasks,
            "all_tasks": all_tasks_list,
            "done_tasks": done_tasks_list,
            "progress_tasks": progress_tasks_list,
        }
    )


@login_required
@require_POST
def reorder_tasks(request):
    data = json.loads(request.body)
    task_ids = data.get("task_ids", [])
    own_tasks = user_tasks(request.user)
    for index, task_id in enumerate(task_ids):
        own_tasks.filter(id=task_id).update(order=index)
    return JsonResponse({"success": True})


@login_required
def home_stats(request):
    today = timezone.now().date()
    user = request.user

    all_tasks = user_tasks(user)
    today_tasks = all_tasks.filter(due_date__date=today)
    today_done = today_tasks.filter(status="done").count()
    today_total = today_tasks.count()

    # таски с due_date для календаря
    tasks_with_dates = list(
        all_tasks.exclude(due_date=None).values("due_date", "status")
    )
    calendar_dates = {}
    for t in tasks_with_dates:
        d = t["due_date"].strftime("%Y-%m-%d")
        if d not in calendar_dates:
            calendar_dates[d] = {"total": 0, "done": 0}
        calendar_dates[d]["total"] += 1
        if t["status"] == "done":
            calendar_dates[d]["done"] += 1

    return JsonResponse(
        {
            "today_done": today_done,
            "today_total": today_total,
            "calendar_dates": calendar_dates,
            "username": user.username,
        }
    )


@login_required
def notifications(request):
    from django.utils import timezone

    today = timezone.now()
    overdue = (
        user_tasks(request.user)
        .filter(due_date__lt=today)
        .exclude(status="done")
        .select_related("project")
        .values("id", "title", "due_date", "project__name")
        .order_by("due_date")[:20]
    )

    result = []
    for t in overdue:
        result.append(
            {
                "id": t["id"],
                "title": t["title"],
                "project": t["project__name"],
                "due_date": t["due_date"].strftime("%d.%m.%Y") if t["due_date"] else "",
            }
        )

    return JsonResponse({"notifications": result, "count": len(result)})


@login_required
def task_info(request, task_id):
    task = user_tasks(request.user).filter(id=task_id).first()
    if task is None:
        return not_found("Task not found")
    return JsonResponse({"project_id": task.project_id})


def login_view(request):
    if request.user.is_authenticated:
        return redirect("/")

    error = None
    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")
        user = authenticate(request, username=username, password=password)
        if user:
            login(request, user)
            return redirect("/")
        else:
            error = "Invalid username or password"

    return render(request, "tasks/login.html", {"error": error})


def register_view(request):
    if request.user.is_authenticated:
        return redirect("/")

    error = None
    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")
        password2 = request.POST.get("password2")

        if password != password2:
            error = "Passwords do not match"
        elif User.objects.filter(username=username).exists():
            error = "Username already taken"
        else:
            user = User.objects.create_user(username=username, password=password)
            login(request, user)
            return redirect("/")

    return render(request, "tasks/register.html", {"error": error})


def logout_view(request):
    logout(request)
    return redirect("/login/")
