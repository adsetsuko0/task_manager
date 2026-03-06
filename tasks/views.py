from email.headerregistry import Group
from tokenize import group
from django.shortcuts import render, redirect, get_object_or_404
from rest_framework import viewsets, permissions
from django_filters.rest_framework import DjangoFilterBackend

from .models import Task, Projects_Group, Project, UserProfile
from .serializers import TaskSerializer, ProjectSerialier, ProjectsGroupSerialier
from .permissions import IsAdminOrOwner, IsAssigneeOrOwner, IsOwnerOrReadOnly

from django.contrib.auth.decorators import login_required
from django.db.models import Q
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
import json

from django.contrib.auth import get_user_model
User = get_user_model()

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import update_session_auth_hash

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.get_or_create(user=instance)



@login_required
def update_user(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        user = request.user

        username= data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '').strip()

        if not username:
            return JsonResponse({'success': False, 'error': 'Username cannot be empty'}, status=400)
        if User.objects.filter(username=username).exclude(id=user.id).exists():
            return JsonResponse({'success': False, 'error': 'Username already taken'}, status=400)
        
        user.username = username
        user.email = email


        if password:
            user.set_password(password)
            user.save()
            update_session_auth_hash(request, user)  # сохраняем сессию после смены пароля
        else:
            user.save()




        return JsonResponse({
            'success': True,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email
        })

    return JsonResponse({'success': False, 'error': 'Invalid request'}, status=400)


@login_required
def upload_avatar(request):
    if request.method=='POST' and request.FILES.get('avatar'):
        avatar=request.FILES['avatar']
        profile, created = UserProfile.objects.get_or_create(user=request.user)
        profile.avatar=avatar
        profile.save()
        return JsonResponse({'success': True, 'avatar_url': profile.avatar.url})
    
@login_required
def delete_avatar(request):
    if request.method == 'POST':
        try:
            profile = UserProfile.objects.get(user=request.user)
            profile.avatar.delete()
            profile.avatar = None
            profile.save()
        except UserProfile.DoesNotExist:
            pass
        return JsonResponse({'success': True})
    return JsonResponse({'success': False})




@login_required
def main_page(request):
    projects=Project.objects.all()
    groups=Projects_Group.objects.all()

    recent_projects = projects[:4]
    favourite_projects = projects.filter(is_favourite=True)[:4]

    for p in recent_projects:
        p.group_name = p.group.name if p.group else ''

    # Добавляем атрибут group_name для favourite_projects
    for p in favourite_projects:
        p.group_name = p.group.name if p.group else ''

    context={
        'page_title':'Home',
        'projects':projects,
        'recent_projects':recent_projects,
        'favourite_projects':favourite_projects,
        'groups':groups,
    }

    return render(request, 'tasks/main.html', context)


#для проектов
@require_POST
@login_required
@csrf_exempt
def create_project(request):
    try:
        data = json.loads(request.body)
        name = data.get('name')
        task_limit = int(data.get('limit', 10))  # default 10
        group_id = data.get('group_id')

        if not name or not group_id:
            return JsonResponse({'error': 'Missing parameters'}, status=400)

        group = Projects_Group.objects.get(id=int(group_id))

        projects_count=Project.objects.filter(group=group).count()

        if projects_count >= group.limit:
            return JsonResponse({
                'success': False,
                'error': 'Group project limit reached'}, status=400)

        project = Project.objects.create(
            name=name,
            task_limit=task_limit,
            is_favourite=False,
            group=group,
            created_at=None
        )

        return JsonResponse({
            'id': project.id,
            'name': project.name,
            'task_limit': project.task_limit,
            'is_favourite': project.is_favourite,
            'group_id': group.id
        })

    except Projects_Group.DoesNotExist:
        return JsonResponse({'error': 'Group not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


    


def project_get(request):
    projects=Project.objects.all().values(
        'id',
        'name',
        'task_limit',
        'is_favourite',
        'group_id',
    )
    return JsonResponse(list(projects), safe=False)


@csrf_exempt
def project_rename(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid request'})

    try:
        data = json.loads(request.body)
        project_id = data.get('project_id')
        new_name = data.get('new_name')

        if not new_name:
            return JsonResponse({'success': False, 'error': 'Name is empty'})

        # Берем проект по ID без касания owner
        project = Project.objects.get(id=project_id)
        project.name = new_name
        project.save(update_fields=['name'])  # 👈 обновляем только поле name

        return JsonResponse({'success': True})

    except Project.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Project not found'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})
    


@require_POST
def toggle_favourite_project(request):
    try:
        data = json.loads(request.body)
        project_id = data.get('project_id')

        project = Project.objects.get(id=project_id)
        project.is_favourite = not project.is_favourite
        project.save(update_fields=['is_favourite'])

        return JsonResponse({
            'success': True,
            'is_favourite': project.is_favourite
        })

    except Project.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Project not found'})


@csrf_exempt
def duplicate_project(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "Invalid request"})

    try:
        data = json.loads(request.body)
        project_id = data.get("project_id")
        project = Project.objects.get(id=project_id)
        group = project.group

        # Проверка лимита перед созданием дубликата
        projects_count = Project.objects.filter(group=group).count()
        if projects_count >= group.limit:
            return JsonResponse({
                "success": False,
                "error": "Project limit reached for this group"
            })

        # Создаем копию проекта
        new_project = Project.objects.create(
            name=f"{project.name} (copy)",
            group=project.group,
            task_limit=project.task_limit,
            is_favourite=project.is_favourite
        )

        return JsonResponse({
            "success": True,
            "project": {
                "id": new_project.id,
                "name": new_project.name,
                "group_id": new_project.group.id,
                "task_limit": new_project.task_limit,
                "is_favourite": new_project.is_favourite
            }
        })
    except Project.DoesNotExist:
        return JsonResponse({"success": False, "error": "Project not found"})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)})


@csrf_exempt
def project_delete(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "Invalid request"})

    try:
        data = json.loads(request.body)
        project_id = data.get("project_id")

        project = Project.objects.get(id=project_id)
        project.delete()

        return JsonResponse({"success": True})

    except Project.DoesNotExist:
        return JsonResponse({"success": False, "error": "Project not found"})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)})










#для групп

def create_group(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST'}, status=405)

    data = json.loads(request.body)

    group = Projects_Group.objects.create(
        name=data['name'],
        priority=data['priority'],
        limit=int(data['limit'])
    )

    return JsonResponse({
        'id': group.id,
        'name': group.name,
        'priority': group.priority,
        'limit': group.limit
    })


def get_groups(request):
    groups = Projects_Group.objects.all().values(
        'id',
        'name',
        'priority',
        'limit'
    )
    return JsonResponse(list(groups), safe=False)


@require_POST
def rename_group(request):
    group_id = request.POST.get('group_id')
    new_name = request.POST.get('name')

    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST allowed'}, status=405)

    
    try:
        data = json.loads(request.body)
        group_id = data.get('group_id')
        new_name = data.get('new_name')

        if not group_id or not new_name:
            return JsonResponse({'error': 'Missing parameters'}, status=400)
    


        group = Projects_Group.objects.get(id=group_id)
        group.name = new_name
        group.save()

        return JsonResponse({'success': True, 'name': group.name},)
    
    except Projects_Group.DoesNotExist:
        return JsonResponse({'error': 'Group not found'}, status=404)  

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400) 
    


    
@csrf_exempt
@login_required
@require_POST
def change_group_priority(request):
    try:
        data = json.loads(request.body)
        group_id = data.get('group_id')
        new_priority = data.get('new_priority')

        if not group_id or not new_priority:
            return JsonResponse({'error': 'Missing parameters'}, status=400)

        if new_priority not in ['low', 'normal', 'high']:
            return JsonResponse({'error': 'Invalid priority'}, status=400)

        group = Projects_Group.objects.get(id=group_id)
        group.priority = new_priority
        group.save()

        return JsonResponse({'success': True, 'priority': group.priority})

    except Projects_Group.DoesNotExist:
        return JsonResponse({'error': 'Group not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
    


@csrf_exempt
@login_required
@require_POST
def duplicate_group(request):
    data = json.loads(request.body)
    group_id = data.get('group_id')

    try:
        original_group = Projects_Group.objects.get(id=group_id)
    except Projects_Group.DoesNotExist:
        return JsonResponse({'error': 'Group not found'}, status=404)

    base_name = original_group.name
    existing_copies = Projects_Group.objects.filter(
        name__startswith=f"{base_name} copy"
    ).count()
    copy_number = existing_copies + 1
    new_name = f"{base_name} copy ({copy_number})"

    new_group = Projects_Group.objects.create(
        name=new_name,
        priority=original_group.priority,
        limit=original_group.limit
    )

    projects_data = []

    for project in original_group.projects.all():
        new_project = Project.objects.create(
            group=new_group,
            name=project.name,
            task_limit=project.task_limit,
            is_favourite=project.is_favourite
        )

        projects_data.append({
            'id': new_project.id,
            'name': new_project.name,
            'limit': new_project.task_limit,
            'favorite': new_project.is_favourite
        })

    return JsonResponse({
        'id': new_group.id,
        'name': new_group.name,
        'priority': new_group.priority,
        'limit': new_group.limit,
        'projects': projects_data
    })



@csrf_exempt
@login_required
@require_POST
def delete_group(request):
    try:
        data = json.loads(request.body)
        group_id = data.get('group_id')

        if not group_id:
            return JsonResponse({'error': 'Missing group_id'}, status=400)

        group = Projects_Group.objects.get(id=group_id)
        group.delete()  # CASCADE удалит проекты автоматически

        return JsonResponse({'success': True})

    except Projects_Group.DoesNotExist:
        return JsonResponse({'error': 'Group not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
    


def search_suggestions(request):
    q = request.GET.get('q', '').strip()
    if not q:
        return JsonResponse([], safe=False)

    projects = Project.objects.filter(name__istartswith=q)[:5]
    groups = Projects_Group.objects.filter(name__istartswith=q)[:5]
    tasks = Task.objects.filter(title__istartswith=q)[:5]

    results = []

    results += [{"id": p.id, "name": p.name, "type": "project"} for p in projects]
    results += [{"id": g.id, "name": g.name, "type": "group"} for g in groups]
    results += [{"id": t.id, "name": t.title, "type": "task"} for t in tasks]

    return JsonResponse(results, safe=False)






class ProjectsGroupViewSet(viewsets.ModelViewSet):
    serializer_class=ProjectsGroupSerialier
    permission_classes= [permissions.IsAuthenticated, IsOwnerOrReadOnly]

    def get_queryset(self):
        return Projects_Group.objects.all()
    
    def perform_create(self, serializer):
        serializer.save()



class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class=ProjectSerialier
    permission_classes= [permissions.IsAuthenticated, IsOwnerOrReadOnly]

    def get_queryset(self):
        return Project.objects.all()
    
    def perform_create(self, serializer):
        serializer.save()



class TaskViewSet(viewsets.ModelViewSet):
    queryset=Task.objects.all()
    serializer_class=TaskSerializer
    permission_classes=[permissions.IsAuthenticated, IsOwnerOrReadOnly]

    filter_backends=[DjangoFilterBackend]
    filterset_fields=['status','assignee']

    permission_classes=[permissions.IsAuthenticated, IsAdminOrOwner]

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view',False):
            return Task.objects.none()

        user=self.request.user
        if user.role=='admin':
            return Task.objects.all()
        return Task.objects.filter(owner=user)
    



@login_required
def get_project_tasks(request, project_id):
    tasks = Task.objects.filter(project_id=project_id)
    data = [{
    'id': t.id,
    'title': t.title,
    'status': t.status,
    'assignee': t.assignee.username if t.assignee else None,
    'created_at': t.created_at.strftime('%d.%m.%Y'),
    'updated_at': t.updated_at.strftime('%d.%m.%Y'),
    'due_date': t.due_date.strftime('%d.%m.%Y') if t.due_date else None,
    'priority': getattr(t, 'priority', None),
    } for t in tasks]
    return JsonResponse(data, safe=False)


@login_required
def create_task(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        task = Task.objects.create(
            title=data['title'],
            description=data.get('description', ''),
            status=data.get('status', 'todo'),
            priority=data.get('priority', 'normal'),
            project_id=data['project_id'],
            owner=request.user,
            due_date=data.get('due_date') or None,
            assignee_id=data.get('assignee_id') or None,
        )
        return JsonResponse({'success': True, 'task_id': task.id})
    return JsonResponse({'success': False})

@login_required
def list_users(request):
    users = User.objects.all().values('id', 'username')
    return JsonResponse(list(users), safe=False)