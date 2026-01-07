from rest_framework import serializers
from .models import User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model=User
        fields=('id','username','email','role')



class RegisterSerializer(serializers.ModelSerializer):
    password=serializers.CharField(write_only=True)

    class Meta:
        model=User
        fields=('id','username','password','role')

    def create(self, validated_data):
        user=User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            role=validated_data('role','user'),
        )

        return user
    


class LoginSerializer(TokenObtainPairSerializer):
    pass