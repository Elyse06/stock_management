from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.common.permissions import (
    HasAction,
    HasActionByMethod,
    IsOwnerOrProfil,
    get_request_employee,
)

from .models import AttributionDetailCommande, Commande, DetailCommande
from .serializers import (
    AttributionDetailCommandeSerializer,
    CommandeSerializer,
    CommandeTraitementSerializer,
    DetailCommandeSerializer,
)


@extend_schema_view(
    list=extend_schema(summary="Lister toutes les commandes"),
    create=extend_schema(summary="Créer une nouvelle commande avec ses détails"),
    retrieve=extend_schema(summary="Obtenir les détails d'une commande"),
    update=extend_schema(summary="Mettre à jour une commande"),
    partial_update=extend_schema(summary="Mettre à jour partiellement une commande"),
    destroy=extend_schema(summary="Supprimer une commande"),
)
class CommandeViewSet(viewsets.ModelViewSet):
    """ViewSet gérant le cycle de vie des commandes de produits/matériels."""
    queryset = (
        Commande.objects.all()
        .select_related(
            "employe_demandeur",
            "employe_traitant",
            "employe_demandeur__emp_serv_id",
            "employe_traitant__emp_serv_id",
        )
        .prefetch_related(
            "details__article",
            "details__attributions__employe_beneficiaire",
        )
    )
    serializer_class = CommandeSerializer
    permission_classes = [HasAction.for_actions("COM_DEM")]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["statut", "employe_demandeur"]

    def get_permissions(self):
        if self.action == "traiter":
            return [HasAction.for_actions("COM_VAL")()]
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [HasAction.for_actions("COM_DEM", "COM_VAL")()]
        return [HasAction.for_actions("COM_DEM")()]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            employee = get_request_employee(self.request)
            permission_instance = HasAction.for_actions("COM_VAL")()
            if employee and not permission_instance.has_permission(self.request, self):
                queryset = queryset.filter(employe_demandeur=employee)
        return queryset

    @extend_schema(
        summary="Traiter une commande (Valider / Rejeter)",
        description=(
            "Permet à un agent habilité de valider ou rejeter une commande. "
            "En cas de validation, une sortie de stock automatique est générée."
        ),
        request=CommandeTraitementSerializer,
        responses={
            200: OpenApiResponse(
                response=CommandeSerializer,
                description="Commande traitée avec succès.",
            ),
            400: OpenApiResponse(description="Données invalides ou stock insuffisant."),
            403: OpenApiResponse(description="Permission insuffisante (COM_VAL requis)."),
        },
    )
    @action(
        detail=True,
        methods=["post"],
        permission_classes=[HasAction.for_actions("COM_VAL")],
    )
    def traiter(self, request, pk=None):
        commande = self.get_object()
        serializer = CommandeTraitementSerializer(
            data=request.data,
            context={"commande": commande, "request": request},
        )
        serializer.is_valid(raise_exception=True)
        commande_traitee = serializer.save()
        output_serializer = CommandeSerializer(
            commande_traitee, context={"request": request}
        )
        return Response(output_serializer.data, status=status.HTTP_200_OK)


@extend_schema_view(
    list=extend_schema(summary="Lister les lignes de détails des commandes"),
    create=extend_schema(summary="Ajouter une ligne de détail à une commande"),
    retrieve=extend_schema(summary="Obtenir une ligne de détail"),
    update=extend_schema(summary="Modifier une ligne de détail"),
    destroy=extend_schema(summary="Supprimer une ligne de détail"),
)
class DetailCommandeViewSet(viewsets.ModelViewSet):
    queryset = DetailCommande.objects.all().select_related("article", "commande")
    serializer_class = DetailCommandeSerializer

    def get_permissions(self):
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [HasAction.for_actions("COM_DEM", "COM_VAL")()]
        return [HasAction.for_actions("COM_DEM")()]

    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["commande", "article"]


@extend_schema_view(
    list=extend_schema(summary="Lister les attributions par bénéficiaire"),
    create=extend_schema(summary="Créer une attribution pour un employé"),
    retrieve=extend_schema(summary="Obtenir les détails d'une attribution"),
    update=extend_schema(summary="Modifier une attribution"),
    destroy=extend_schema(summary="Supprimer une attribution"),
)
class AttributionDetailCommandeViewSet(viewsets.ModelViewSet):
    queryset = AttributionDetailCommande.objects.all().select_related(
        "detail_commande", "employe_beneficiaire"
    )
    serializer_class = AttributionDetailCommandeSerializer

    def get_permissions(self):
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [HasAction.for_actions("COM_DEM", "COM_VAL")()]
        return [HasAction.for_actions("COM_DEM")()]

    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["detail_commande", "employe_beneficiaire"]