from django.contrib import admin

from .models import Project, Projects_Group, Task

admin.site.register(Projects_Group)
admin.site.register(Project)
admin.site.register(Task)
