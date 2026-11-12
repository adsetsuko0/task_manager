"""Все данные приватные: пользователь видит и меняет только свои группы,
проекты и задачи. Здесь у Alice есть полный набор данных, а Bob пытается
их увидеть, изменить и удалить разными способами."""

import json
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from tasks.models import Project, Projects_Group, Task
from users.models import User


def post(client, url, payload):
    return client.post(url, data=json.dumps(payload), content_type="application/json")


class PrivacyTestCase(TestCase):
    def setUp(self):
        self.alice = User.objects.create_user(username="alice", password="pass")
        self.bob = User.objects.create_user(username="bob", password="pass")

        self.group = Projects_Group.objects.create(
            owner=self.alice, name="Alice group", limit=10
        )
        self.project = Project.objects.create(
            name="Alice project", group=self.group, is_favourite=True
        )
        self.task = Task.objects.create(
            title="Alice task",
            owner=self.alice,
            project=self.project,
            due_date=timezone.now() - timedelta(days=1),
        )

        self.bob_client = self.client_class()
        self.bob_client.force_login(self.bob)
        self.alice_client = self.client_class()
        self.alice_client.force_login(self.alice)


class ListsShowOnlyOwnDataTest(PrivacyTestCase):
    def test_json_lists_do_not_leak(self):
        for url in [
            "/groups/",
            "/projects/",
            "/projects/favourites/",
            "/users/list/",
            "/search_suggestions/?q=a",
        ]:
            body = self.bob_client.get(url).content.decode()
            self.assertNotIn("Alice", body, url)
            self.assertNotIn("alice", body, url)

    def test_stats_and_notifications_do_not_leak(self):
        notifications = self.bob_client.get("/notifications/").json()
        self.assertEqual(notifications["count"], 0)

        home = self.bob_client.get("/home/stats/").json()
        self.assertEqual(home["calendar_dates"], {})

        dashboard = self.bob_client.get("/dashboard/stats/").json()
        self.assertEqual(dashboard["total"], 0)
        self.assertEqual(dashboard["all_tasks"], [])
        self.assertEqual(dashboard["by_project"], [])

    def test_owner_still_sees_own_data(self):
        self.assertEqual(len(self.alice_client.get("/groups/").json()), 1)
        self.assertEqual(len(self.alice_client.get("/projects/").json()), 1)
        self.assertEqual(self.alice_client.get("/notifications/").json()["count"], 1)
        self.assertEqual(self.alice_client.get("/dashboard/stats/").json()["total"], 1)
        tasks = self.alice_client.get(f"/projects/{self.project.id}/tasks/").json()
        self.assertEqual([t["title"] for t in tasks], ["Alice task"])

    def test_main_page_does_not_show_foreign_data(self):
        response = self.bob_client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertNotContains(response, "Alice project")
        self.assertNotContains(response, "Alice group")


class ForeignObjectsAreInaccessibleTest(PrivacyTestCase):
    def test_cannot_read_foreign_project_tasks_or_task_info(self):
        r = self.bob_client.get(f"/projects/{self.project.id}/tasks/")
        self.assertEqual(r.status_code, 404)
        r = self.bob_client.get(f"/tasks/{self.task.id}/info/")
        self.assertEqual(r.status_code, 404)

    def test_cannot_change_foreign_task(self):
        tid = self.task.id
        attempts = [
            ("/tasks/rename/", {"task_id": tid, "new_name": "hacked"}),
            ("/tasks/duplicate/", {"task_id": tid}),
            ("/tasks/update_status/", {"task_id": tid, "status": "done"}),
            ("/tasks/update_description/", {"task_id": tid, "description": "x"}),
            ("/tasks/update_due_date/", {"task_id": tid, "due_date": None}),
            ("/tasks/update_priority/", {"task_id": tid, "priority": "high"}),
            ("/tasks/update_assignee/", {"task_id": tid, "assignee_id": None}),
            ("/tasks/delete/", {"task_id": tid}),
        ]
        for url, payload in attempts:
            response = post(self.bob_client, url, payload)
            self.assertEqual(response.status_code, 404, url)

        self.task.refresh_from_db()
        self.assertEqual(self.task.title, "Alice task")
        self.assertEqual(self.task.status, "todo")
        self.assertEqual(self.task.priority, "low")
        self.assertIsNotNone(self.task.due_date)
        self.assertEqual(Task.objects.count(), 1)

    def test_cannot_reorder_foreign_tasks(self):
        self.task.order = 5
        self.task.save()
        post(self.bob_client, "/tasks/reorder/", {"task_ids": [self.task.id]})
        self.task.refresh_from_db()
        self.assertEqual(self.task.order, 5)

    def test_cannot_change_foreign_project(self):
        pid = self.project.id
        attempts = [
            ("/projects/rename/", {"project_id": pid, "new_name": "hacked"}),
            ("/projects/favourite/", {"project_id": pid}),
            ("/projects/duplicate/", {"project_id": pid}),
            ("/projects/delete/", {"project_id": pid}),
        ]
        for url, payload in attempts:
            post(self.bob_client, url, payload)

        self.project.refresh_from_db()
        self.assertEqual(self.project.name, "Alice project")
        self.assertTrue(self.project.is_favourite)
        self.assertEqual(Project.objects.count(), 1)

    def test_cannot_change_foreign_group(self):
        gid = self.group.id
        attempts = [
            ("/groups/rename/", {"group_id": gid, "new_name": "hacked"}),
            ("/groups/change_priority/", {"group_id": gid, "new_priority": "high"}),
            ("/groups/duplicate/", {"group_id": gid}),
            ("/groups/delete/", {"group_id": gid}),
        ]
        for url, payload in attempts:
            post(self.bob_client, url, payload)

        self.group.refresh_from_db()
        self.assertEqual(self.group.name, "Alice group")
        self.assertEqual(self.group.priority, "normal")
        self.assertEqual(Projects_Group.objects.count(), 1)

    def test_cannot_put_things_into_foreign_containers(self):
        r = post(
            self.bob_client,
            "/projects/create/",
            {"name": "Sneaky", "group_id": self.group.id, "limit": 5},
        )
        self.assertEqual(r.status_code, 404)

        r = post(
            self.bob_client,
            "/tasks/create/",
            {"title": "Sneaky", "project_id": self.project.id},
        )
        self.assertEqual(r.status_code, 404)

        bob_group = Projects_Group.objects.create(owner=self.bob, name="B", limit=5)
        bob_project = Project.objects.create(name="BP", group=bob_group)
        bob_task = Task.objects.create(
            title="Bob task", owner=self.bob, project=bob_project
        )
        r = post(
            self.bob_client,
            "/tasks/move/",
            {"task_id": bob_task.id, "project_id": self.project.id},
        )
        self.assertEqual(r.status_code, 404)
        bob_task.refresh_from_db()
        self.assertEqual(bob_task.project_id, bob_project.id)

        self.assertEqual(Project.objects.filter(group=self.group).count(), 1)
        self.assertEqual(Task.objects.filter(project=self.project).count(), 1)

    def test_cannot_assign_task_to_another_user(self):
        bob_group = Projects_Group.objects.create(owner=self.bob, name="B", limit=5)
        bob_project = Project.objects.create(name="BP", group=bob_group)
        bob_task = Task.objects.create(title="T", owner=self.bob, project=bob_project)

        r = post(
            self.bob_client,
            "/tasks/update_assignee/",
            {"task_id": bob_task.id, "assignee_id": self.alice.id},
        )
        self.assertEqual(r.status_code, 400)

        r = post(
            self.bob_client,
            "/tasks/create/",
            {"title": "X", "project_id": bob_project.id, "assignee_id": self.alice.id},
        )
        self.assertEqual(r.status_code, 400)

        r = post(
            self.bob_client,
            "/tasks/update_assignee/",
            {"task_id": bob_task.id, "assignee_id": self.bob.id},
        )
        self.assertEqual(r.status_code, 200)


class GroupNamesTest(PrivacyTestCase):
    def test_same_group_name_is_allowed_for_different_users(self):
        r = post(
            self.bob_client,
            "/groups/create/",
            {"name": "Alice group", "priority": "low", "limit": 3},
        )
        self.assertEqual(r.status_code, 200)

    def test_duplicate_group_name_for_same_user_is_rejected(self):
        r = post(
            self.alice_client,
            "/groups/create/",
            {"name": "Alice group", "priority": "low", "limit": 3},
        )
        self.assertEqual(r.status_code, 400)
        self.assertEqual(Projects_Group.objects.filter(owner=self.alice).count(), 1)

    def test_created_group_belongs_to_creator(self):
        post(
            self.bob_client,
            "/groups/create/",
            {"name": "Bob group", "priority": "low", "limit": 3},
        )
        self.assertEqual(Projects_Group.objects.get(name="Bob group").owner, self.bob)


class RestApiPrivacyTest(PrivacyTestCase):
    def setUp(self):
        super().setUp()
        self.api = APIClient()
        self.api.force_authenticate(self.bob)

    def test_lists_are_empty_for_other_user(self):
        for url in ["/api/projects_group/", "/api/projects/", "/api/tasks/"]:
            self.assertEqual(self.api.get(url).json()["results"], [], url)

    def test_foreign_objects_return_404(self):
        for url in [
            f"/api/projects_group/{self.group.id}/",
            f"/api/projects/{self.project.id}/",
            f"/api/tasks/{self.task.id}/",
        ]:
            self.assertEqual(self.api.get(url).status_code, 404, url)
            self.assertEqual(
                self.api.patch(url, {}, format="json").status_code, 404, url
            )
            self.assertEqual(self.api.delete(url).status_code, 404, url)
        self.assertEqual(Task.objects.count(), 1)

    def test_admin_role_does_not_bypass_privacy(self):
        admin = User.objects.create_user(username="boss", password="pass", role="admin")
        self.api.force_authenticate(admin)
        self.assertEqual(self.api.get("/api/tasks/").json()["results"], [])
        self.assertEqual(self.api.get(f"/api/tasks/{self.task.id}/").status_code, 404)

    def test_cannot_create_inside_foreign_containers(self):
        r = self.api.post(
            "/api/projects/", {"name": "Sneaky", "group": self.group.id}, format="json"
        )
        self.assertEqual(r.status_code, 400)
        r = self.api.post(
            "/api/tasks/",
            {"title": "Sneaky", "project": self.project.id},
            format="json",
        )
        self.assertEqual(r.status_code, 400)
        r = self.api.post(
            "/api/tasks/", {"title": "Sneaky", "assignee": self.alice.id}, format="json"
        )
        self.assertEqual(r.status_code, 400)

    def test_owner_is_set_by_server_not_by_client(self):
        r = self.api.post(
            "/api/projects_group/",
            {"name": "Mine", "owner": self.alice.id, "limit": 3},
            format="json",
        )
        self.assertEqual(r.status_code, 201)
        self.assertEqual(Projects_Group.objects.get(name="Mine").owner, self.bob)
        r = self.api.post("/api/tasks/", {"title": "Mine"}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(Task.objects.get(title="Mine").owner, self.bob)

    def test_owner_can_use_own_objects(self):
        api = APIClient()
        api.force_authenticate(self.alice)
        self.assertEqual(len(api.get("/api/tasks/").json()["results"]), 1)
        r = api.patch(
            f"/api/projects/{self.project.id}/", {"name": "Renamed"}, format="json"
        )
        self.assertEqual(r.status_code, 200)
        self.project.refresh_from_db()
        self.assertEqual(self.project.name, "Renamed")
