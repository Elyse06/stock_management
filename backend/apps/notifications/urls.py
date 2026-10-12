from django.conf import settings
from django.urls import path

from .views import TestAlerteStockView

urlpatterns = []
if settings.DEBUG:
    urlpatterns.append(path("test-alerte-stock/", TestAlerteStockView.as_view(), name="test-alerte-stock"))
