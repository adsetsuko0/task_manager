from email.headerregistry import Group
from tokenize import group
from django.shortcuts import render, redirect, get_object_or_404
from rest_framework import viewsets, permissions
from django_filters.rest_framework import DjangoFilterBackend

from .models import Task, Projects_Group, Project
from .serializers import TaskSerializer, ProjectSerialier, ProjectsGroupSerialier
from .permissions import IsAdminOrOwner, IsAssigneeOrOwner, IsOwnerOrReadOnly

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
import json



@login_required
def main_page(request):
    projects=Project.objects.all()
    groups=Projects_Group.objects.all()

    context={
        'page_title':'Home',
        'projects':projects,
        'recent_projects':projects[:4],
        'favourite_projects':projects[:4],
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





@login_required
def project_rename(request):
    if request.method=='POST':
        project_id=request.POST.get('project_id')
        new_name=request.POST.get('new_name')

        project=get_object_or_404(Project, id=project_id, owner=request.user)
        project.name=new_name
        project.save()
    return redirect('main')
    

@login_required
def project_delete(request, project_id):
    if request.method=='POST':
        project_id=request.POST.get('project_id')
        
        project=get_object_or_404(Project, id=project_id, owner=request.user)
        project.delete()
    return redirect('main')


def project_get(request):
    projects=Project.objects.all().values(
        'id',
        'name',
        'task_limit',
        'is_favourite',
        'group_id',
    )
    return JsonResponse(list(projects), safe=False)

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
        return Project.objects.filter(owner=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)



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
    
