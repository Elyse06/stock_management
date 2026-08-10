from django.shortcuts import render

from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.common.permissions import HasProfil
from .models import Profil, Employe, Utilisateur
from .serializers import ProfilSerializer, EmployeSerializer, UtilisateurSerializer

# Create your views here.
class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UtilisateurSerializer(request.user).data)


class ProfilViewSet(viewsets.ModelViewSet):
    queryset = Profil.objects.all()
    serializer_class = ProfilSerializer
    permission_classes = [HasProfil.for_profils("Administrateur")]


class EmployeViewSet(viewsets.ModelViewSet):
    queryset = Employe.objects.all().select_related("chef_hierarchique")
    serializer_class = EmployeSerializer
    permission_classes = [HasProfil.for_profils("Administrateur")]


class UtilisateurViewSet(viewsets.ModelViewSet):
    queryset = Utilisateur.objects.all().select_related("profil", "employe")
    serializer_class = UtilisateurSerializer
    permission_classes = [HasProfil.for_profils("Administrateur")]
    filterset_fields = ["profil",]
