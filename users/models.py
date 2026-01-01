from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):   #наследование от класса Юзер, с уже прописанными полями
    ROLE_CHOICES = (
        ("user", "User"),    # обычный пользователь
        ("admin", "Admin"),  # администратор
    )

    role=models.CharField(max_length=5, choices=ROLE_CHOICES, default='user')

    def __str__(self):
        return self.username