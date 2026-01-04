from django.shortcuts import render
from rest_framework import viewsets, permissions
from django_filters.rest_framework import DjangoFilterBackend
from .models import Task
from .serializers import TaskSerializer
from .permissions import IsAdminOrOwner

class TaskViewSet(viewsets.ModelViewSet):
    queryset=Task.objects.all()
    serializer_class=TaskSerializer
    permission_classes=[permissions.IsAuthenticated]

    filter_backends=[DjangoFilterBackend]
    filterset_fields=['status','assignee']

    permission_classes=[permissions.IsAuthenticated, IsAdminOrOwner]

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def get_queryset(self):
        user=self.request.user
        if user.role=='admin':
            return Task.objects.all()
        return Task.objects.filter(owner=user)
    
