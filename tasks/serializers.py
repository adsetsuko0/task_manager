from rest_framework import serializers

from users.models import User

from .access import user_groups, user_projects
from .models import Project, Projects_Group, Task


class ProjectsGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Projects_Group
        fields = ("id", "name", "priority", "limit")

    def validate_name(self, value):
        user = self.context["request"].user
        same_name = user_groups(user).filter(name=value)
        if self.instance is not None:
            same_name = same_name.exclude(pk=self.instance.pk)
        if same_name.exists():
            raise serializers.ValidationError("Group with this name already exists.")
        return value


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ("id", "name", "group", "task_limit", "is_favourite", "created_at")

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get("request")
        if request is not None and request.user.is_authenticated:
            # В списке выбора только свои группы
            fields["group"].queryset = user_groups(request.user)
        return fields


class TaskSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source="owner.username")
    assignee = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), required=False, allow_null=True
    )
    project = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = Task
        fields = (
            "id",
            "title",
            "description",
            "status",
            "priority",
            "owner",
            "assignee",
            "project",
            "due_date",
            "created_at",
            "updated_at",
        )

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get("request")
        if request is not None and request.user.is_authenticated:
            # Проект только свой, исполнитель только сам пользователь
            fields["project"].queryset = user_projects(request.user)
            fields["assignee"].queryset = User.objects.filter(id=request.user.id)
        return fields
