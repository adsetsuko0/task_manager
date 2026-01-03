from django.shortcuts import render
from rest_framework import generics, permissions #базовые дрф классы
from .serializers import UserSerializer

class UserProfileView(generics.RetrieveAPIView):
    serializer_class=UserSerializer
    permission_classes=[permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user
    

    