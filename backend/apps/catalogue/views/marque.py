from rest_framework import viewsets

from apps.catalogue.models import Marque
from apps.catalogue.serializers import MarqueSerializer

from .categorie import CategorieViewSet


class MarqueViewSet(viewsets.ModelViewSet):
    queryset = Marque.objects.all()
    serializer_class = MarqueSerializer
    permission_classes = CategorieViewSet.permission_classes
