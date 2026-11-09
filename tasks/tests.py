from django.test import TestCase

import json  #Python-словари в JSON-строки для запросов

from rest_framework.test import APITestCase
from rest_framework import status

from users.models import User
from tasks.models import Task, Project, Projects_Group, UserProfile


class ProjectLimitTest(APITestCase):
    """
    В views.py create_project есть логика:
    
        if projects_count >= group.limit:
            return JsonResponse({'error': 'Group project limit reached'}, status=400)
    
    """

    def setUp(self):
        #создаю пользователя и авторизую его
        
        self.user = User.objects.create_user(username='user1', password='pass')
        self.client.force_login(self.user)

        self.group = Projects_Group.objects.create(
            name='SmallGroup',
            priority='normal',
            limit=2
        )

    def test_can_create_project_within_limit(self):
        """
        Проверяем: если лимит не превышен — проект создаётся успешно.
        """
        response = self.client.post(
            '/projects/create/',
            data=json.dumps({
                'name': 'First Project',
                'group_id': self.group.id,
                'limit': 5,
            }),
        
            content_type='application/json'
        )

        data = response.json()
        self.assertTrue(data.get('id') is not None)  #id созданного проекта
        self.assertEqual(Project.objects.filter(group=self.group).count(), 1)

    def test_cannot_exceed_group_project_limit(self):
        """
        Проверяем при превышении лимита проект НЕ создаётся и возвращается ошибка
        """
        # Заполняем группу до предела (limit=2)
        Project.objects.create(name='P1', group=self.group)
        Project.objects.create(name='P2', group=self.group)

        #пытаюсь создать 3 проект
        response = self.client.post(
            '/projects/create/',
            data=json.dumps({
                'name': 'P3 — должен не создаться',
                'group_id': self.group.id,
                'limit': 5,
            }),
            content_type='application/json'
        )

        #сервер должен вернуть 400
        self.assertEqual(response.status_code, 400)

        #в БД должно быть ровно 2 проекта, не 3
        self.assertEqual(Project.objects.filter(group=self.group).count(), 2)



class TaskPermissionTest(APITestCase):
    """
    Тест на то что только владелец может управлять своей задачей,
    а чужой пользователь нет.
    
    """

    def setUp(self):
        #создаёю двух пользователей
        self.owner = User.objects.create_user(username='owner', password='pass')
        self.other_user = User.objects.create_user(username='other', password='pass')

        self.group = Projects_Group.objects.create(name='G1', limit=10)
        self.project = Project.objects.create(name='P1', group=self.group)
        self.task = Task.objects.create(
            title='Задача владельца',
            owner=self.owner,
            project=self.project,
        )

    def test_owner_can_delete_own_task(self):
        """
        Проверяем: владелец может удалить свою задачу.
        """
        #авторизацияя как владелец
        self.client.force_login(self.owner)

        response = self.client.post(
            '/tasks/delete/',
            data=json.dumps({'task_id': self.task.id}),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 200)

        #ззадача должна исчезнуть из БД
        self.assertFalse(Task.objects.filter(id=self.task.id).exists())

    def test_owner_can_rename_own_task(self):
        """
        Проверяем: владелец может переименовать свою задачу.
        """
        self.client.force_login(self.owner)

        response = self.client.post(
            '/tasks/rename/',
            data=json.dumps({
                'task_id': self.task.id,
                'new_name': 'Новое название'
            }),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 200)

        self.task.refresh_from_db()
        self.assertEqual(self.task.title, 'Новое название')

    def test_owner_can_update_task_status(self):
        """
        Проверяем можно ли изменить статус задачи на in_progress.
        """
        self.client.force_login(self.owner)

        response = self.client.post(
            '/tasks/update_status/',
            data=json.dumps({
                'task_id': self.task.id,
                'status': 'in_progress'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self.task.refresh_from_db()
        self.assertEqual(self.task.status, 'in_progress')

    def test_unauthenticated_user_cannot_delete_task(self):
        """
        Проверяем: неавторизованный пользователь не может удалять задачи.
        Мы НЕ вызываем force_login — клиент остаётся анонимным.
        """
        response = self.client.post(
            '/tasks/delete/',
            data=json.dumps({'task_id': self.task.id}),
            content_type='application/json'
        )

        self.assertNotEqual(response.status_code, 200)

        self.assertTrue(Task.objects.filter(id=self.task.id).exists())



class DuplicateProjectTest(APITestCase):
    """
    Тестирую duplicate_project из views.py

    """

    def setUp(self):
        self.user = User.objects.create_user(username='dupuser', password='pass')
        self.client.force_login(self.user)

        self.group = Projects_Group.objects.create(name='DupGroup', limit=10)
        self.project = Project.objects.create(name='Original', group=self.group)

        Task.objects.create(title='Task A', owner=self.user, project=self.project)
        Task.objects.create(title='Task B', owner=self.user, project=self.project)

    def test_duplicate_project_creates_new_project(self):


        response = self.client.post(
            '/projects/duplicate/',
            data=json.dumps({'project_id': self.project.id}),
            content_type='application/json'
        )

        data = response.json()
        self.assertTrue(data.get('success'))

        self.assertEqual(Project.objects.filter(group=self.group).count(), 2)

    def test_duplicate_project_copies_all_tasks(self):
        response = self.client.post(
            '/projects/duplicate/',
            data=json.dumps({'project_id': self.project.id}),
            content_type='application/json'
        )

        data = response.json()
        new_project_id = data['project']['id']


        new_tasks = Task.objects.filter(project_id=new_project_id)

        self.assertEqual(new_tasks.count(), 2)

        new_titles = set(new_tasks.values_list('title', flat=True))
        self.assertIn('Task A', new_titles)
        self.assertIn('Task B', new_titles)

    def test_duplicate_respects_group_limit(self):
      
     
        for i in range(9):
            Project.objects.create(name=f'Filler {i}', group=self.group)


        response = self.client.post(
            '/projects/duplicate/',
            data=json.dumps({'project_id': self.project.id}),
            content_type='application/json'
        )

        data = response.json()

        self.assertFalse(data.get('success'))



class CreateTaskTest(APITestCase):
 

    def setUp(self):
        self.user = User.objects.create_user(username='taskuser', password='pass')
        self.client.force_login(self.user)
        self.group = Projects_Group.objects.create(name='G', limit=10)
        self.project = Project.objects.create(name='P', group=self.group)

    def test_create_task_successfully(self):
      
        response = self.client.post(
            '/tasks/create/',
            data=json.dumps({
                'title': 'Новая задача',
                'description': 'Описание',
                'status': 'todo',
                'priority': 'high',
                'project_id': self.project.id,
            }),
            content_type='application/json'
        )

        data = response.json()
        self.assertTrue(data.get('success'))

        self.assertTrue(Task.objects.filter(title='Новая задача').exists())

    def test_created_task_belongs_to_correct_user(self):

        self.client.post(
            '/tasks/create/',
            data=json.dumps({
                'title': 'Моя задача',
                'project_id': self.project.id,
            }),
            content_type='application/json'
        )

        task = Task.objects.get(title='Моя задача')

        self.assertEqual(task.owner, self.user)

    def test_create_task_requires_login(self):
        

        self.client.logout()

        response = self.client.post(
            '/tasks/create/',
            data=json.dumps({
                'title': 'Задача без логина',
                'project_id': self.project.id,
            }),
            content_type='application/json'
        )

        self.assertNotEqual(response.status_code, 200)
        self.assertFalse(Task.objects.filter(title='Задача без логина').exists())