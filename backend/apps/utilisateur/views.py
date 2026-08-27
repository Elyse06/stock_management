from rest_framework import viewsets

from .models import Action, Autoriser, Utilisateur
from .serializers import ActionSerializer, AutoriserSerializer, UtilisateurSerializer


class UtilisateurViewSet(viewsets.ModelViewSet):
    queryset = Utilisateur.objects.all()
    serializer_class = UtilisateurSerializer


class AutoriserViewSet(viewsets.ModelViewSet):
    queryset = Autoriser.objects.all()
    serializer_class = AutoriserSerializer

class ActionViewSet(viewsets.ModelViewSet):
    queryset = Action.objects.all()
    serializer_class = ActionSerializer