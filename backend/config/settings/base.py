import os
from datetime import timedelta
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")


def env_str(name, default=None, required=False):
    value = os.getenv(name, default)
    if required and not value:
        raise ImproperlyConfigured(f"La variable d'environnement {name} est obligatoire.")
    return value


def env_bool(name, default=False):
    value = os.getenv(name)
    if value is None or value == "":
        return default
    return value.strip().lower() in ("1", "true", "t", "yes", "oui")


def env_int(name, default):
    value = os.getenv(name)
    return int(value) if value not in (None, "") else default


def env_list(name, default=""):
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]


SECRET_KEY = env_str("SECRET_KEY", required=True)
DEBUG = env_bool("DEBUG", False)
ALLOWED_HOSTS = env_list("ALLOWED_HOSTS", "127.0.0.1,localhost")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    "rest_framework",
    "django_filters",
    "corsheaders",
    "drf_spectacular",

    "apps.common",
    "apps.utilisateur",
    "apps.catalogue",
    "apps.commande",
    "apps.stock",
    "apps.employee",
    "apps.historique",
    "apps.dashboard",
    "apps.notifications",
    "apps.ai",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

DB_ENGINE = env_str("DB_ENGINE", "mssql")
DATABASES = {
    "default": {
        "ENGINE": DB_ENGINE,
        "NAME": env_str("DB_NAME"),
        "USER": env_str("DB_USER"),
        "PASSWORD": env_str("DB_PASSWORD"),
        "HOST": env_str("DB_HOST", "localhost"),
        "PORT": env_str("DB_PORT", "1433"),
        "CONN_MAX_AGE": env_int("DB_CONN_MAX_AGE", 60),
        "CONN_HEALTH_CHECKS": True,
        "OPTIONS": {},
    },
}
if DB_ENGINE == "mssql":
    DATABASES["default"]["OPTIONS"] = {
        "driver": env_str("DB_DRIVER", "ODBC Driver 18 for SQL Server"),
        "extra_params": f"TrustServerCertificate={env_str('DB_TRUST_CERT', 'no')}",
    }

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
     "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = env_str("LANGUAGE_CODE", "fr-fr")
TIME_ZONE = env_str("TIME_ZONE", "UTC")
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

DATA_UPLOAD_MAX_MEMORY_SIZE = 12 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 12 * 1024 * 1024
DATA_UPLOAD_MAX_NUMBER_FIELDS = 2000

REDIS_URL = env_str("REDIS_URL", "")
if REDIS_URL:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": REDIS_URL,
        }
    }
else:
    CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ("apps.auth.authentication.JWTAuthentication",),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_RENDERER_CLASSES": ("rest_framework.renderers.JSONRenderer",),
    "DEFAULT_PARSER_CLASSES": (
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.FormParser",
        "rest_framework.parsers.MultiPartParser",
    ),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PAGINATION_CLASS": "apps.common.pagination.StandardPagination",
    "PAGE_SIZE": 20,
    "EXCEPTION_HANDLER": "apps.common.exceptions.exception_handler",
    "DEFAULT_THROTTLE_RATES": {
        "login": env_str("THROTTLE_LOGIN", "10/min"),
        "refresh": env_str("THROTTLE_REFRESH", "30/min"),
        "ai": env_str("THROTTLE_AI", "20/min"),
        "import": env_str("THROTTLE_IMPORT", "10/min"),
    },
}

SPECTACULAR_SETTINGS = {
    "TITLE": "API Gestion de stock",
    "DESCRIPTION": "API du système interne de gestion de stock",
    "VERSION": "1.1.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

API_DOCS_ENABLED = env_bool("API_DOCS_ENABLED", DEBUG)
ADMIN_URL = env_str("ADMIN_URL", "")

JWT = {
    "SIGNING_KEY": env_str("JWT_SIGNING_KEY", SECRET_KEY),
    "ALGORITHM": "HS256",
    "ACCESS_LIFETIME": timedelta(minutes=env_int("JWT_ACCESS_MINUTES", 30)),
    "REFRESH_LIFETIME": timedelta(days=env_int("JWT_REFRESH_DAYS", 7)),
    "ISSUER": env_str("JWT_ISSUER", "gestion-stock"),
}

CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS", "http://localhost:5173")
CORS_ALLOW_ALL_ORIGINS = False

CELERY_BROKER_URL = REDIS_URL or "redis://localhost:6379/0"
CELERY_RESULT_BACKEND = CELERY_BROKER_URL
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_ALWAYS_EAGER = env_bool("CELERY_TASK_ALWAYS_EAGER", False)

EMAIL_BACKEND = env_str("EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend")
EMAIL_HOST = env_str("EMAIL_HOST", "localhost")
EMAIL_PORT = env_int("EMAIL_PORT", 587)
EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", True)
EMAIL_HOST_USER = env_str("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = env_str("EMAIL_HOST_PASSWORD", "")
EMAIL_TIMEOUT = env_int("EMAIL_TIMEOUT", 15)
DEFAULT_FROM_EMAIL = env_str("DEFAULT_FROM_EMAIL", EMAIL_HOST_USER or "noreply@localhost")

GROQ_API_KEY = env_str("GROQ_API_KEY", "")
GROQ_MODEL = env_str("GROQ_MODEL", "openai/gpt-oss-20b")
GROQ_API_URL = env_str("GROQ_API_URL", "https://api.groq.com/openai/v1/chat/completions")

LOGS_DIR = BASE_DIR / "logs"
LOGS_DIR.mkdir(exist_ok=True)
LOG_LEVEL = env_str("LOG_LEVEL", "INFO")

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {"format": "[{asctime}] {levelname} {name} | {message}", "style": "{"},
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "verbose"},
        "app_file": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": LOGS_DIR / "app.log",
            "maxBytes": 5 * 1024 * 1024,
            "backupCount": 5,
            "formatter": "verbose",
            "encoding": "utf-8",
        },
        "import_file": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": LOGS_DIR / "imports.log",
            "maxBytes": 5 * 1024 * 1024,
            "backupCount": 5,
            "formatter": "verbose",
            "encoding": "utf-8",
        },
    },
    "loggers": {
        "apps": {"handlers": ["console", "app_file"], "level": LOG_LEVEL, "propagate": False},
        "apps.imports": {
            "handlers": ["console", "import_file"], "level": "INFO", "propagate": False,
        },
        "django.security": {
            "handlers": ["console", "app_file"], "level": "WARNING", "propagate": False,
        },
    },
}
