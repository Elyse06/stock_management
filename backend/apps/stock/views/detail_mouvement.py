from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets

from apps.common.permissions import HasActionByMethod
from apps.stock.models import DetailMouvement
from apps.stock.serializers import DetailMouvementSerializer


class DetailMouvementViewSet(viewsets.ModelViewSet):
    queryset = DetailMouvement.objects.select_related(
        'affectation', 'affectation__employe', 'affectation__direction',
        'affectation__salle', 'affectation__site',
        'mouvement', 'article', 'fournisseur',
    ).all().prefetch_related("unites_creees", "unites_attribuees")
    serializer_class = DetailMouvementSerializer
    permission_classes = [HasActionByMethod.for_methods(  # noqa: RUF012
        GET=("MOV_LIRE",),
        HEAD=("MOV_LIRE",),
        OPTIONS=("MOV_LIRE",),
        **{"*": ("INV_GERE",)},
    )]
    filter_backends = [DjangoFilterBackend]  # noqa: RUF012
    filterset_fields = ["mouvement", "article", "affectation", "affectation__employe", "fournisseur"]  # noqa: RUF012