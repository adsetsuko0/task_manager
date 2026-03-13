from django.urls import path,include
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet, ProjectsGroupViewSet, ProjectViewSet, create_project, duplicate_project, main_page, project_rename, project_delete, create_group
from tasks import views

from django.conf import settings
from django.conf.urls.static import static

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
    path('projects/create/', create_project, name='project_create'),
    path('projects/favourite/', views.toggle_favourite_project, name='toggle_favourite_project'),
    path('projects/duplicate/', duplicate_project, name='duplicate_project'),

    path('projects/<int:project_id>/tasks/', views.get_project_tasks, name='project_tasks'),

    path('tasks/create/', views.create_task, name='create_task'),
    path('users/list/', views.list_users, name='list_users'),
    

    path('groups/', views.get_groups, name='get_groups'),
    path('groups/create/', views.create_group, name='group_create'),
    path('groups/rename/', views.rename_group, name='group_rename'),
    path('groups/change_priority/', views.change_group_priority, name='group_change_priority'),
    path('groups/duplicate/', views.duplicate_group, name='group_duplicate'),
    path('groups/delete/', views.delete_group, name='group_delete'),

    path('search_suggestions/', views.search_suggestions, name='search_suggestions'),
    path('user/update/', views.update_user, name='update_user'),
    path('user/avatar/upload/', views.upload_avatar, name='upload_avatar'),
    path('user/avatar/delete/', views.delete_avatar, name='delete_avatar'), 

    path('projects/favourites/', views.favourite_projects, name='favourite_projects'),

    path('tasks/rename/', views.rename_task),
    path('tasks/delete/', views.delete_task),
    path('tasks/duplicate/', views.duplicate_task),
    path('tasks/update_status/', views.update_task_status),
    path('tasks/update_description/', views.update_task_description),
    path('tasks/update_due_date/', views.update_task_due_date),
    path('tasks/update_priority/', views.update_task_priority),
    path('tasks/update_assignee/', views.update_task_assignee),
    path('tasks/move/', views.move_task),
    path('tasks/reorder/', views.reorder_tasks, name='reorder_tasks'),

    path('dashboard/stats/', views.dashboard_stats, name='dashboard_stats'),
]   + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


