from django.test import Client, TestCase
from django.urls import reverse

from users.models import User


class LogoutViewTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="logout_test_user",
            password="TestPassword123!",
        )
        self.client.force_login(self.user)
        self.logout_url = reverse("logout")

    def test_logout_rejects_get_request(self):
        response = self.client.get(self.logout_url)

        self.assertEqual(response.status_code, 405)
        self.assertTrue(response.wsgi_request.user.is_authenticated)

    def test_logout_accepts_post_request(self):
        response = self.client.post(self.logout_url)

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, "/login/")
        self.assertNotIn("_auth_user_id", self.client.session)

    def test_logout_requires_csrf_token(self):
        client = Client(enforce_csrf_checks=True)
        client.force_login(self.user)

        response = client.post(self.logout_url)

        self.assertEqual(response.status_code, 403)

    def test_logout_accepts_valid_csrf_token(self):
        client = Client(enforce_csrf_checks=True)

        client.get("/login/")
        csrf_token = client.cookies["csrftoken"].value

        client.force_login(self.user)

        response = client.post(
            self.logout_url,
            HTTP_X_CSRFTOKEN=csrf_token,
        )

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, "/login/")
        self.assertNotIn("_auth_user_id", client.session)
