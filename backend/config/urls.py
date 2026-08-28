from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


def ping(request):
    return JsonResponse({"status": "ok", "message": "API disponible"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/ping/", ping, name="ping"),
    path("api/auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/utilisateur/", include("apps.utilisateur.urls")),
    path("api/catalogue/", include("apps.catalogue.urls")),
    path("api/commandes/", include("apps.commande.urls")),
    path("api/stock/", include("apps.stock.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
]
