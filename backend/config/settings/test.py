"""Settings pour la suite de tests (SQLite en mémoire, aucun service externe)."""
import os

os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-production")

from .base import *  # noqa: E402, F403

DEBUG = False
DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
CELERY_TASK_ALWAYS_EAGER = True
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {  # noqa: F405
    key: "10000/min" for key in REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]  # noqa: F405
}
LOGGING = {"version": 1, "disable_existing_loggers": False}
