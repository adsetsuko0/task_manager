# Task Manager
[![CI](https://github.com/adsetsuko0/task_manager/actions/workflows/ci.yml/badge.svg)](https://github.com/adsetsuko0/task_manager/actions/workflows/ci.yml)

>**Learning project.** I built this app to practice Django, Django REST Framework and web development in general. 
It is not meant for production use, so please set your expectations accordingly.

A web app for planning work: organise projects into groups, track tasks and see what is overdue.

## Tech Stack
**Python 3.12 - Django - Django REST Framework - SimpleJWT - drf-yasg - django-filter - WhiteNoise - Gunicorn - SQLite (local) - PostgreSQL - Docker Compose**

## What's Inside
- Projects organised in groups, with favourites and limits
- Tasks with status (To Do / In Progress / Done), priority, assignee, due date and manual ordering
- Dashboard with task statistics and notifications about overdue tasks
- Search suggestions and quick task creation from the home screen
- Registration and login, profile settings with avatar upload
- Light and dark theme
- REST API with JWT authentication, Swagger and ReDoc documentation

## Status and limitations
Suggestions and feedback are welcome, feel free to open an issue. This is a practice project, so it has rough edges:

- Local runs use SQLite; Docker Compose runs PostgreSQL with a persistent volume. There is no production deployment setup.
- The REST API and its authentication realized.
- Tests cover registration and login, data privacy (users only see their own groups, projects and tasks), the REST API with JWT authentication, profile and avatar uploads, and group and project actions: more than 80 tests and about 89% coverage. There are no automated frontend tests, and the code quality is uneven in places.


## Installation
### Run locally
```bash
git clone https://github.com/adsetsuko0/task_manager.git
cd task_manager
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```
Open `.env` and set `SECRET_KEY`. The app will not start with an empty `SECRET_KEY`. You can generate one with:

```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

Then apply migrations and start the server:

```bash
python manage.py migrate
python manage.py runserver
```
Open http://127.0.0.1:8000/ and create an account on the /register/ page.

### Run with Docker
```bash
cp .env.example .env
```
Open `.env` and set `SECRET_KEY` and `DB_PASSWORD`. Generate the key with the command above and avoid the `$` character in both values: Docker Compose treats it as a variable.

```bash
docker compose up --build
```
Open http://127.0.0.1:8000/ and create an account on the /register/ page.

Stop with `docker compose down`. Data is kept in a Docker volume; `docker compose down -v` deletes it.


### REST API
Obtain a JWT and call the API with it:

```bash
curl -X POST http://127.0.0.1:8000/api/auth/register/ -H "Content-Type: application/json" -d '{"username": "demo", "password": "a-strong-password"}'
curl -X POST http://127.0.0.1:8000/api/auth/login/ -H "Content-Type: application/json" -d '{"username": "demo", "password": "a-strong-password"}'
curl http://127.0.0.1:8000/api/tasks/ -H "Authorization: Bearer <access token>"
```

Endpoints: `/api/auth/register/`, `/api/auth/login/`, `/api/token/refresh/`, `/api/users/me/`, `/api/projects_group/`, `/api/projects/`, `/api/tasks/`. In Swagger UI use the Authorize button and enter `Bearer <access token>`. Every user only sees their own data.


### Configuration
| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY` | yes | Django secret key |
| `DEBUG` | no | `True` for local development |
| `ALLOWED_HOSTS` | no | Comma-separated hosts, defaults to `localhost` |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | no | PostgreSQL settings. If `DB_NAME` is empty, SQLite is used. `DB_PASSWORD` is required for Docker Compose |

### API documentation
Interactive docs while the server is running: [Swagger UI](http://127.0.0.1:8000/swagger/), [ReDoc](http://127.0.0.1:8000/redoc/)

### Tests
```bash
pip install -r requirements-dev.txt
pytest
```
Coverage report: `pytest --cov=tasks --cov=users --cov-report=term-missing`. On every push, CI runs ruff, a migration check and the tests.

### License
MIT, see LICENSE.