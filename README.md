# Task Manager
>**Learning project.** I built this app to practice Django, Django REST Framework and web development in general. 
It is not meant for production use, so please set your expectations accordingly.

A web app for planning work: organise projects into groups, track tasks and see what is overdue.

## Tech Stack
**Python 3.12 - Django - Django REST Framework - SimpleJWT - drf-yasg - django-filter - WhiteNoise - Gunicorn - SQLite - Docker**

## What's Inside
- Projects organised in groups, with favourites and limits
- Tasks with status (To Do / In Progress / Done), priority, assignee, due date and manual ordering
- Dashboard with task statistics and notifications about overdue tasks
- Search suggestions and quick task creation from the home screen
- Registration and login, profile settings with avatar upload
- Light and dark theme
- REST API (work in progress) with Swagger and ReDoc documentation

## Status and limitations
Suggestions and feedback are welcome, feel free to open an issue. This is a practice project, so it has rough edges:

- It uses SQLite and has no production deployment setup. In Docker the data is not kept between runs.
- The REST API and its authentication are still a work in progress.
- Test coverage is small, and the code quality is uneven in places.

## Installation
### Run locally
```
git clone https://github.com/adsetsuko0/task_manager.git
cd task_manager
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```
Open .env and set SECRET_KEY. You can generate one with:
```
python -c "from django.core.management.utils import get_random_secret_key as g; print(g())"
```

Then apply migrations and start the server:
```python manage.py migrate
python manage.py runserver
```
Open http://127.0.0.1:8000/ and create an account on the /register/ page.

### Run with Docker
```
docker build -t task-manager .
docker run --rm -p 8000:8000 --env-file .env task-manager
```

### Configuration
| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY` | yes | Django secret key |
| `DEBUG` | no | `True` for local development |
| `ALLOWED_HOSTS` | no | Comma-separated hosts, defaults to  `localhost` |

### API documentation
Interactive docs are available while the server is running:

- [Swagger UI](http://127.0.0.1:8000/swagger/)
- [ReDoc](http://127.0.0.1:8000/redoc/)

### Tests
```
python manage.py test
```

### License
MIT, see LICENSE.
