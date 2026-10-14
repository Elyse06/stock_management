from django.conf import settings
from django.contrib import admin
from django.urls import include, path

from apps.auth import views as auth_views

urlpatterns = [
    path("api/auth/login/", auth_views.login_view, name="login"),
    path("api/auth/refresh/", auth_views.refresh_view, name="refresh"),
    path("api/auth/me/", auth_views.me_view, name="me"),
    path("api/auth/changer-mot-de-passe/", auth_views.changer_mot_de_passe_view, name="changer-mot-de-passe"),

    path("api/catalogue/", include("apps.catalogue.urls")),
    path("api/commandes/", include("apps.commande.urls")),
    path("api/stock/", include("apps.stock.urls")),
    path("api/utilisateur/", include("apps.utilisateur.urls")),
    path("api/employee/", include("apps.employee.urls")),
    path("api/historique/", include("apps.historique.urls")),
    path("api/dashboard/", include("apps.dashboard.urls")),
    path("api/notifications/", include("apps.notifications.urls")),
    path("api/ai/", include("apps.ai.urls")),
]

if settings.API_DOCS_ENABLED:
    from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

    urlpatterns += [
        path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
        path("api/schema/swagger/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
        path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
    ]

if settings.ADMIN_URL:
    urlpatterns.append(path(settings.ADMIN_URL.strip("/") + "/", admin.site.urls))
elif settings.DEBUG:
    urlpatterns.append(path("admin/", admin.site.urls))
