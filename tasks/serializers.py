from rest_framework import serializers
from .models import Task, Projects_Group, Project
from users.serializers import UserSerializer
from users.models import User

class ProjectsGroupSerialier(serializers.ModelSerializer):
    class Meta:
        model=Projects_Group
        fields='__all__'
        read_only_fields=['owner']
        

class ProjectSerialier(serializers.ModelSerializer):
    class Meta:
        model=Project
        fields='__all__'
        read_only_fields=['owner']
        


class TaskSerializer(serializers.ModelSerializer):
    owner=serializers.ReadOnlyField(source='owner.username')
    assignee=serializers.PrimaryKeyRelatedField(queryset=User.objects.all())

    class Meta:
        model= Task
        fields = (
            'id',
            'title',
            'description',
            'status',
            'owner',
            'assignee',
            'created_at',
            'updated_at',
        )


