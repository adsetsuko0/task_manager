from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import RegisterView, ProfileView, LoginView


urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),   #регистрация пользователя
    path('auth/login/', LoginView.as_view(), name='login'),     #логин через LoginView
    path('users/me/', ProfileView.as_view(), name='user_profile'),      #профиль пользователя

    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),        #jwt токены
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
