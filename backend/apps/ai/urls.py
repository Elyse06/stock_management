from django.urls import path

from . import views

urlpatterns = [
    path('search/', views.ai_search_articles, name='ai_search_articles'),
]