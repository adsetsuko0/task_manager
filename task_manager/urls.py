from django.contrib import admin
from django.urls import path, include   

from rest_framework import permissions
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.routers import DefaultRouter

from tasks.views import TaskViewSet
from users.views import UserProfileView

from drf_yasg.views import get_schema_view
from drf_yasg import openapi

schema_view=get_schema_view(openapi.Info(
    title='Task Manager API',
    default_version='v1',
    description='API для управления своими планами и задачами',
    contact=openapi.Contact(email='r41969827@gmail.com'),
    ),
    public=True,
    permission_classes=[permissions.AllowAny],
    authentication_classes=[]
)




urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('tasks.urls')),
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='swagger'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='redoc'),
]
#path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='swagger'),
#path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='redoc'),