from apps.auth import views as auth_views
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("admin/", admin.site.urls),
    
    path("api/auth/login/", auth_views.login_view, name="login"),
    path("api/auth/refresh/", auth_views.refresh_view, name="refresh"),
    path("api/auth/me/", auth_views.me_view, name="me"),
    
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/schema/swagger/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
    
    path("api/catalogue/", include("apps.catalogue.urls")),
    path("api/commandes/", include("apps.commande.urls")),
    path("api/stock/", include("apps.stock.urls")),
    path("api/utilisateur/", include("apps.utilisateur.urls")),
    path("api/employee/", include("apps.employee.urls")),
]

