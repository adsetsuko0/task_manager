"""Изоляция REST API при настоящей JWT-аутентификации (без force_authenticate)."""

from django.test import TestCase
from rest_framework.test import APIClient

from tasks.models import Project, Projects_Group, Task
from users.models import User

PASSWORD = "StrongPass123"
LISTS = ["/api/projects_group/", "/api/projects/", "/api/tasks/"]


def jwt_client(username):
    client = APIClient()
    response = client.post(
        "/api/token/", {"username": username, "password": PASSWORD}, format="json"
    )
    assert response.status_code == 200, response.content
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.json()['access']}")
    return client


class JwtApiTestCase(TestCase):
    def setUp(self):
        self.alice = User.objects.create_user(username="alice", password=PASSWORD)
        self.bob = User.objects.create_user(username="bob", password=PASSWORD)

        self.group = Projects_Group.objects.create(owner=self.alice, name="Alice group")
        self.project = Project.objects.create(name="Alice project", group=self.group)
        self.task = Task.objects.create(
            title="Alice task", owner=self.alice, project=self.project
        )

        self.alice_api = jwt_client("alice")
        self.bob_api = jwt_client("bob")

        self.detail_urls = [
            f"/api/projects_group/{self.group.id}/",
            f"/api/projects/{self.project.id}/",
            f"/api/tasks/{self.task.id}/",
        ]


class AuthRequiredTest(JwtApiTestCase):
    def test_no_token_gives_401(self):
        anonymous = APIClient()
        for url in LISTS + self.detail_urls:
            self.assertEqual(anonymous.get(url).status_code, 401, url)

    def test_invalid_token_gives_401(self):
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION="Bearer not-a-real-token")
        for url in LISTS:
            self.assertEqual(client.get(url).status_code, 401, url)

    def test_session_login_alone_does_not_open_api(self):
        self.client.force_login(self.alice)
        for url in LISTS:
            self.assertEqual(self.client.get(url).status_code, 401, url)

    def test_refresh_token_gives_new_access_token(self):
        login = APIClient().post(
            "/api/token/", {"username": "alice", "password": PASSWORD}, format="json"
        )
        refreshed = APIClient().post(
            "/api/token/refresh/", {"refresh": login.json()["refresh"]}, format="json"
        )
        self.assertEqual(refreshed.status_code, 200)
        self.assertIn("access", refreshed.json())


class JwtIsolationTest(JwtApiTestCase):
    def test_owner_sees_own_objects(self):
        for url in LISTS:
            results = self.alice_api.get(url).json()["results"]
            self.assertEqual(len(results), 1, url)
        for url in self.detail_urls:
            self.assertEqual(self.alice_api.get(url).status_code, 200, url)

    def test_other_user_sees_nothing(self):
        for url in LISTS:
            self.assertEqual(self.bob_api.get(url).json()["results"], [], url)

    def test_other_user_gets_404_on_get_put_patch_delete(self):
        for url in self.detail_urls:
            self.assertEqual(self.bob_api.get(url).status_code, 404, url)
            self.assertEqual(
                self.bob_api.patch(
                    url, {"name": "x", "title": "x"}, format="json"
                ).status_code,
                404,
                url,
            )
            self.assertEqual(
                self.bob_api.put(
                    url, {"name": "x", "title": "x"}, format="json"
                ).status_code,
                404,
                url,
            )
            self.assertEqual(self.bob_api.delete(url).status_code, 404, url)

        self.group.refresh_from_db()
        self.project.refresh_from_db()
        self.task.refresh_from_db()
        self.assertEqual(self.group.name, "Alice group")
        self.assertEqual(self.project.name, "Alice project")
        self.assertEqual(self.task.title, "Alice task")
        self.assertEqual(Projects_Group.objects.count(), 1)
        self.assertEqual(Project.objects.count(), 1)
        self.assertEqual(Task.objects.count(), 1)

    def test_admin_role_does_not_bypass_isolation(self):
        User.objects.create_user(username="boss", password=PASSWORD, role="admin")
        boss_api = jwt_client("boss")
        for url in LISTS:
            self.assertEqual(boss_api.get(url).json()["results"], [], url)
        for url in self.detail_urls:
            self.assertEqual(boss_api.get(url).status_code, 404, url)


class CannotMoveIntoForeignContainersTest(JwtApiTestCase):
    def setUp(self):
        super().setUp()
        self.bob_group = Projects_Group.objects.create(owner=self.bob, name="Bob group")
        self.bob_project = Project.objects.create(
            name="Bob project", group=self.bob_group
        )
        self.bob_task = Task.objects.create(
            title="Bob task", owner=self.bob, project=self.bob_project
        )

    def test_cannot_move_own_project_into_foreign_group(self):
        response = self.bob_api.patch(
            f"/api/projects/{self.bob_project.id}/",
            {"group": self.group.id},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.bob_project.refresh_from_db()
        self.assertEqual(self.bob_project.group, self.bob_group)

    def test_cannot_move_own_task_into_foreign_project(self):
        response = self.bob_api.patch(
            f"/api/tasks/{self.bob_task.id}/",
            {"project": self.project.id},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.bob_task.refresh_from_db()
        self.assertEqual(self.bob_task.project, self.bob_project)

    def test_cannot_assign_own_task_to_another_user(self):
        response = self.bob_api.patch(
            f"/api/tasks/{self.bob_task.id}/",
            {"assignee": self.alice.id},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.bob_task.refresh_from_db()
        self.assertIsNone(self.bob_task.assignee)
