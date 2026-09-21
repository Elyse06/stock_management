from apps.commande.models import Commande
from apps.commande.serializers import (
    CommandeSerializer,
    CommandeTraitementSerializer,
    RecapitulatifCommandeSerializer,
)
from apps.common.permissions import (
    HasAction,
    get_request_employee,
)
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response


class CommandeViewSet(viewsets.ModelViewSet):
    queryset = (
        Commande.objects.all()
        .select_related(
            "employe_demandeur",
            "employe_traitant",
            "employe_demandeur__emp_serv_id",
            "employe_traitant__emp_serv_id",
            "employe_demandeur__emp_serv_id__serv_dir_id",
            "employe_traitant__emp_serv_id__serv_dir_id",
            "employe_demandeur__emp_serv_id__serv_dir_id__site",
            "employe_traitant__emp_serv_id__serv_dir_id__site",
        )
        .prefetch_related(
            "details__article",
            "details__attributions__employe_beneficiaire",
        )
    )
    serializer_class = CommandeSerializer
    permission_classes = [HasAction.for_actions("COM_DEM")]  # noqa: RUF012
    filter_backends = [DjangoFilterBackend]  # noqa: RUF012
    filterset_fields = ["statut", "employe_demandeur"]  # noqa: RUF012

    def get_permissions(self):
        if self.action == "traiter":
            return [HasAction.for_actions("COM_VAL")()]
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [HasAction.for_actions("COM_DEM", "COM_VAL")()]
        return [HasAction.for_actions("COM_DEM")()]

    def get_queryset(self):
        has_cat_gere = HasAction.for_actions("CAT_GERE")().has_permission(self.request, self)
        has_com_val = HasAction.for_actions("COM_VAL")().has_permission(self.request, self)
        queryset = super().get_queryset()
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            employee = get_request_employee(self.request)
            if has_cat_gere and has_com_val:
                pass
            elif has_com_val:
                if employee and employee.emp_serv_id and employee.emp_serv_id.serv_dir_id:
                    queryset = queryset.filter(
                        employe_demandeur__emp_serv_id__serv_dir_id=employee.emp_serv_id.serv_dir_id
                    )
            else:
                if employee:
                    queryset = queryset.filter(employe_demandeur=employee)

        return queryset

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

    @action(detail=True, methods=['get'], url_path='recapitulatif')
    def recapitulatif(self, request, commande_id=None):
        commande = self.get_object()
        serializer = RecapitulatifCommandeSerializer(commande, context={'request': request})
        return Response(serializer.data)
