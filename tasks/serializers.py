from rest_framework import serializers
from .models import Task
from users.serializers import UserSerializer
from users.models import User

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