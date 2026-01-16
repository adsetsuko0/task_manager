from django.urls import path,include
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet, ProjectsGroupViewSet, ProjectViewSet, main_page, project_rename, project_delete, create_group

router=DefaultRouter()
router.register(r"projects_group", ProjectsGroupViewSet, basename='projects_group')
router.register(r"projects", ProjectViewSet, basename='projects')
router.register(r"tasks", TaskViewSet, basename='tasks')



urlpatterns = [
    path('', main_page, name='main'),
    path('project/rename/', project_rename, name='project_rename'),
    path('project/delete/', project_delete, name='project_delete'),

    path('api/', include(router.urls)),
    path('group/create/', create_group, name='create_group'),
]
