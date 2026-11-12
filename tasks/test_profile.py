import json
import shutil
import tempfile
from io import BytesIO

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import Image

from users.models import User

TEMP_MEDIA = tempfile.mkdtemp()


def make_image(name="avatar.png"):
    buffer = BytesIO()
    Image.new("RGB", (10, 10), "red").save(buffer, format="PNG")
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")


class UpdateUserTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="anna", password="OldPass12345")
        self.client.login(username="anna", password="OldPass12345")

    def post(self, **data):
        return self.client.post(
            "/user/update/", data=json.dumps(data), content_type="application/json"
        )

    def test_username_and_email_are_updated(self):
        response = self.post(username="anna2", email="a@example.com", password="")
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "anna2")
        self.assertEqual(self.user.email, "a@example.com")

    def test_empty_username_is_rejected(self):
        response = self.post(username="  ", email="", password="")
        self.assertEqual(response.status_code, 400)

    def test_taken_username_is_rejected(self):
        User.objects.create_user(username="bob", password="BobPass12345")
        response = self.post(username="bob", email="", password="")
        self.assertEqual(response.status_code, 400)

    def test_password_change_keeps_user_logged_in(self):
        response = self.post(username="anna", email="", password="NewStrongPass123")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.get("/").status_code, 200)

    def test_weak_password_is_rejected(self):
        response = self.post(username="anna", email="", password="1")
        self.assertEqual(response.status_code, 400)


@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class AvatarTest(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TEMP_MEDIA, ignore_errors=True)

    def setUp(self):
        self.user = User.objects.create_user(username="anna", password="OldPass12345")
        self.client.login(username="anna", password="OldPass12345")

    def test_upload_requires_login(self):
        self.client.logout()
        response = self.client.post("/user/avatar/upload/", {"avatar": make_image()})
        self.assertEqual(response.status_code, 302)

    def test_valid_image_is_saved(self):
        response = self.client.post("/user/avatar/upload/", {"avatar": make_image()})
        self.assertEqual(response.status_code, 200)
        self.user.profile.refresh_from_db()
        self.assertTrue(self.user.profile.avatar)

    def test_request_without_file_gives_400(self):
        response = self.client.post("/user/avatar/upload/")
        self.assertEqual(response.status_code, 400)

    def test_non_image_file_is_rejected(self):
        fake = SimpleUploadedFile("avatar.png", b"not an image", "image/png")
        response = self.client.post("/user/avatar/upload/", {"avatar": fake})
        self.assertEqual(response.status_code, 400)

    def test_delete_avatar_removes_it(self):
        self.client.post("/user/avatar/upload/", {"avatar": make_image()})
        response = self.client.post("/user/avatar/delete/")
        self.assertEqual(response.status_code, 200)
        self.user.profile.refresh_from_db()
        self.assertFalse(self.user.profile.avatar)

    def test_too_large_file_is_rejected(self):
        big = SimpleUploadedFile("big.png", b"0" * (2 * 1024 * 1024 + 1), "image/png")
        response = self.client.post("/user/avatar/upload/", {"avatar": big})
        self.assertEqual(response.status_code, 400)

    def test_wrong_extension_is_rejected(self):
        response = self.client.post(
            "/user/avatar/upload/", {"avatar": make_image("evil.html")}
        )
        self.assertEqual(response.status_code, 400)

    def test_stored_extension_follows_real_content(self):
        # PNG content with a misleading .jpg name must be stored as .png
        response = self.client.post(
            "/user/avatar/upload/", {"avatar": make_image("photo.jpg")}
        )
        self.assertEqual(response.status_code, 200)
        self.user.profile.refresh_from_db()
        self.assertTrue(self.user.profile.avatar.name.endswith(".png"))

    def test_get_is_not_allowed(self):
        self.assertEqual(self.client.get("/user/avatar/upload/").status_code, 405)
