from django.urls import path

from . import views

urlpatterns = [
    path('search/', views.ai_search_articles, name='ai_search_articles'),
    path('chat/', views.ai_chat, name='ai_chat'),
    path('chat/flux/', views.ai_chat_flux, name='ai_chat_flux'),
]
