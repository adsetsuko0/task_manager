from django.urls import path,include
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet, ProjectsGroupViewSet, ProjectViewSet

router=DefaultRouter()
router.register(r"projects_group", ProjectsGroupViewSet, basename='projects_group')
router.register(r"projects", ProjectViewSet, basename='projects')
router.register(r"tasks", TaskViewSet, basename='tasks')



urlpatterns = [
    path('',include(router.urls)),
]
