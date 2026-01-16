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
from .models import Projects_Group
import json



@login_required
def main_page(request):
    projects=Project.objects.filter(owner=request.user)
    groups=Projects_Group.objects.filter(owner=request.user).prefetch_related('projects')

    context={
        'page_title':'Home',
        'projects':projects,
        'recent_projects':projects[:4],
        'favourite_projects':projects[:4]
    }

    return render(request, 'tasks/main.html', context)


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


@require_POST
def create_group(request):
    data = json.loads(request.body)

    if Projects_Group.objects.filter(name=data['name']).exists():
        return JsonResponse({'error': 'duplicate'}, status=400)

    group = Projects_Group.objects.create(
        name=data['name'],
        priority=data['priority'],
        project_limit=data['limit']
    )

    return JsonResponse({
        'id': group.id,
        'name': group.name,
        'priority': group.priority,
        'limit': group.project_limit
    })



class ProjectsGroupViewSet(viewsets.ModelViewSet):
    serializer_class=ProjectsGroupSerialier
    permission_classes= [permissions.IsAuthenticated, IsOwnerOrReadOnly]

    def get_queryset(self):
        return Projects_Group.objects.filter(owner=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)



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
    
