from django.shortcuts import render
from rest_framework import generics, permissions #базовые дрф классы
from .serializers import UserSerializer, LoginSerializer, RegisterSerializer 
from .models import User

from rest_framework_simplejwt.views import TokenObtainPairView



class UserProfileView(generics.RetrieveAPIView):
    serializer_class=UserSerializer
    permission_classes=[permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user
    

class RegisterView(generics.CreateAPIView):
    queryset=User.objects.all()
    serializer_class=RegisterSerializer


class LoginView(TokenObtainPairView):
    serializer_class=LoginSerializer


class ProfileView(generics.RetrieveAPIView):
    serializer_class=UserSerializer
    permission_classes=[permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user
