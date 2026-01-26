from django.urls import path,include
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet, ProjectsGroupViewSet, ProjectViewSet, main_page, project_rename, project_delete, create_group
from tasks import views

router=DefaultRouter()
router.register(r"projects_group", ProjectsGroupViewSet, basename='projects_group')
router.register(r"projects", ProjectViewSet, basename='projects')
router.register(r"tasks", TaskViewSet, basename='tasks')



urlpatterns = [
    path('', main_page, name='main'),

    path('api/', include(router.urls)),
    path('projects/', views.project_get, name='project_get'),
    path('projects/rename/', project_rename, name='project_rename'),
    path('projects/delete/', project_delete, name='project_delete'),
    path('projects/create/', views.create_project, name='project_create'),

    path('groups/', views.get_groups, name='get_groups'),
    path('groups/create/', views.create_group, name='group_create'),
    path('groups/rename/', views.rename_group, name='group_rename'),
]
