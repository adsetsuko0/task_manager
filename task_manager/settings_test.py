from task_manager.settings import *  # noqa: F403

# Fast hasher only for tests
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
