from django.shortcuts import render
from rest_framework import viewsets, permissions
from django_filters.rest_framework import DjangoFilterBackend
from .models import Task, Projects_Group, Project
from .serializers import TaskSerializer, ProjectSerialier, ProjectsGroupSerialier
from .permissions import IsAdminOrOwner, IsAssigneeOrOwner, IsOwnerOrReadOnly

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
    
