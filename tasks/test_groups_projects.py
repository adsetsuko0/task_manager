import json

from django.test import TestCase

from users.models import User

from .models import Project, Projects_Group, Task


def post_json(client, url, **data):
    return client.post(url, data=json.dumps(data), content_type="application/json")


class GroupActionsTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="anna", password="Pass12345!")
        self.client.login(username="anna", password="Pass12345!")
        self.group = Projects_Group.objects.create(owner=self.user, name="Work")

    def test_rename_group(self):
        response = post_json(
            self.client, "/groups/rename/", group_id=self.group.id, new_name="Study"
        )
        self.assertEqual(response.status_code, 200)
        self.group.refresh_from_db()
        self.assertEqual(self.group.name, "Study")

    def test_rename_to_existing_name_is_rejected(self):
        Projects_Group.objects.create(owner=self.user, name="Home")
        response = post_json(
            self.client, "/groups/rename/", group_id=self.group.id, new_name="Home"
        )
        self.assertEqual(response.status_code, 400)
        self.group.refresh_from_db()
        self.assertEqual(self.group.name, "Work")

    def test_rename_without_new_name_is_rejected(self):
        response = post_json(self.client, "/groups/rename/", group_id=self.group.id)
        self.assertEqual(response.status_code, 400)

    def test_rename_unknown_group_gives_404(self):
        response = post_json(
            self.client, "/groups/rename/", group_id=99999, new_name="X"
        )
        self.assertEqual(response.status_code, 404)

    def test_change_priority(self):
        response = post_json(
            self.client,
            "/groups/change_priority/",
            group_id=self.group.id,
            new_priority="high",
        )
        self.assertEqual(response.status_code, 200)
        self.group.refresh_from_db()
        self.assertEqual(self.group.priority, "high")

    def test_invalid_priority_is_rejected(self):
        response = post_json(
            self.client,
            "/groups/change_priority/",
            group_id=self.group.id,
            new_priority="urgent",
        )
        self.assertEqual(response.status_code, 400)
        self.group.refresh_from_db()
        self.assertEqual(self.group.priority, "normal")

    def test_duplicate_group_copies_projects(self):
        Project.objects.create(name="P1", group=self.group, is_favourite=True)
        response = post_json(self.client, "/groups/duplicate/", group_id=self.group.id)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["name"], "Work copy (1)")
        copy = Projects_Group.objects.get(owner=self.user, name="Work copy (1)")
        self.assertEqual(copy.projects.count(), 1)
        self.assertEqual(self.group.projects.count(), 1)

    def test_second_duplicate_gets_next_number(self):
        post_json(self.client, "/groups/duplicate/", group_id=self.group.id)
        response = post_json(self.client, "/groups/duplicate/", group_id=self.group.id)
        self.assertEqual(response.json()["name"], "Work copy (2)")

    def test_delete_group_removes_its_projects(self):
        Project.objects.create(name="P1", group=self.group)
        response = post_json(self.client, "/groups/delete/", group_id=self.group.id)
        self.assertEqual(response.status_code, 200)
        self.assertFalse(Projects_Group.objects.filter(id=self.group.id).exists())
        self.assertEqual(Project.objects.count(), 0)

    def test_delete_requires_post(self):
        self.assertEqual(self.client.get("/groups/delete/").status_code, 405)

    def test_anonymous_user_is_redirected(self):
        self.client.logout()
        response = post_json(self.client, "/groups/delete/", group_id=self.group.id)
        self.assertEqual(response.status_code, 302)


class ProjectActionsTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="anna", password="Pass12345!")
        self.client.login(username="anna", password="Pass12345!")
        self.group = Projects_Group.objects.create(owner=self.user, name="Work")
        self.project = Project.objects.create(name="Alpha", group=self.group)

    def test_rename_project(self):
        response = post_json(
            self.client,
            "/projects/rename/",
            project_id=self.project.id,
            new_name="Beta",
        )
        self.assertTrue(response.json()["success"])
        self.project.refresh_from_db()
        self.assertEqual(self.project.name, "Beta")

    def test_rename_with_empty_name_changes_nothing(self):
        response = post_json(
            self.client, "/projects/rename/", project_id=self.project.id, new_name=""
        )
        self.assertFalse(response.json()["success"])
        self.project.refresh_from_db()
        self.assertEqual(self.project.name, "Alpha")

    def test_toggle_favourite_twice(self):
        url = "/projects/favourite/"
        first = post_json(self.client, url, project_id=self.project.id)
        self.assertTrue(first.json()["is_favourite"])
        second = post_json(self.client, url, project_id=self.project.id)
        self.assertFalse(second.json()["is_favourite"])

    def test_delete_project_removes_its_tasks(self):
        Task.objects.create(title="t", owner=self.user, project=self.project)
        response = post_json(
            self.client, "/projects/delete/", project_id=self.project.id
        )
        self.assertTrue(response.json()["success"])
        self.assertFalse(Project.objects.filter(id=self.project.id).exists())
        self.assertEqual(Task.objects.count(), 0)

    def test_delete_unknown_project_reports_failure(self):
        response = post_json(self.client, "/projects/delete/", project_id=99999)
        self.assertFalse(response.json()["success"])
