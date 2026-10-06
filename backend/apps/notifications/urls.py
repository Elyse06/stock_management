from django.urls import path
from .views import TestAlerteStockView

urlpatterns = [
    path('test-alerte-stock/', TestAlerteStockView.as_view(), name='test-alerte-stock'),
]