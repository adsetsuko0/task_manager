from rest_framework import serializers
from .models import Task
from users.serializers import UserSerializer

class TaskSerializer(serializers.ModelSerializer):
    owner=UserSerializer(read_only=True)
    assignee=UserSerializer(read_only=True)

    class Meta:
        model= Task
        fields = (
            'id',
            'title',
            'description',
            'status',
            'author',
            'assignee',
            'created_at',
            'updated_at',
        )