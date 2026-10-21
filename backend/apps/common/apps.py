from django.apps import AppConfig


class CommonConfig(AppConfig):
    name = "apps.common"
    verbose_name = "Modules partagés"

    def ready(self):
        from apps.auth import schema  # noqa: F401 - extension OpenAPI pour le JWT
