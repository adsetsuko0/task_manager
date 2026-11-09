from django.test import TestCase

# Импортируем APITestCase вместо обычного TestCase.
# APITestCase — это специальная версия для тестирования API,
# у неё есть self.client, через который мы делаем запросы (GET, POST и т.д.)
from rest_framework.test import APITestCase

# status содержит константы HTTP-кодов: status.HTTP_200_OK = 200,
# status.HTTP_401_UNAUTHORIZED = 401 и т.д.
# Удобнее читать, чем магические числа.
from rest_framework import status

from users.models import User
from tasks.models import UserProfile




class RegistrationTest(APITestCase):

    def test_successful_registration_creates_user(self):
        response = self.client.post('/register/', {
            'username': 'newuser',
            'password': 'strongpass123',
            'password2': 'strongpass123',
        })

        self.assertEqual(response.status_code, 302)

        self.assertTrue(User.objects.filter(username='newuser').exists())

    def test_registration_fails_if_passwords_dont_match(self):
        response = self.client.post('/register/', {
            'username': 'user2',
            'password': 'pass1234',
            'password2': 'DIFFERENT',  # намеренно другой пароль
        })

        self.assertEqual(response.status_code, 200)

        self.assertFalse(User.objects.filter(username='user2').exists())

    def test_registration_fails_if_username_already_taken(self):
        User.objects.create_user(username='existinguser', password='pass')

        self.client.post('/register/', {
            'username': 'existinguser',
            'password': 'newpass123',
            'password2': 'newpass123',
        })

        self.assertEqual(User.objects.filter(username='existinguser').count(), 1)



class LoginTest(APITestCase):

    def setUp(self):
        def setUp(self):
            self.user = User.objects.create_user(
            username='testuser',
            password='correctpass'
        )

    def test_login_with_correct_credentials_redirects(self):
        response = self.client.post('/login/', {
                'username': 'testuser',
                'password': 'correctpass',
        })
        self.assertEqual(response.status_code, 302)

    def test_login_with_wrong_password_shows_error(self):
        response = self.client.post('/login/', {
            'username': 'testuser',
            'password': 'wrongpassword',
        })
        self.assertEqual(response.status_code, 200)

    def test_login_with_nonexistent_user_shows_error(self):
        
        response = self.client.post('/login/', {
            'username': 'nobody',
            'password': 'pass',
        })
        self.assertEqual(response.status_code, 200)




class UserProfileSignalTest(APITestCase):

    def test_user_profile_created_automatically(self):
     
        #создаём пользователя — сигнал должен сработать автоматически
        user = User.objects.create_user(username='signaluser', password='pass')

        #проверяем что UserProfile появился в БД для этого пользователя
        self.assertTrue(UserProfile.objects.filter(user=user).exists())

    def test_profile_linked_to_correct_user(self):
       
        user = User.objects.create_user(username='profileuser', password='pass')
        profile = UserProfile.objects.get(user=user)

        # profile.user должен быть нашим пользователем
        self.assertEqual(profile.user, user)