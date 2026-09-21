from rest_framework import viewsets

from apps.catalogue.models import Categorie
from apps.catalogue.serializers import CategorieSerializer
from apps.common.permissions import HasActionByMethod


class CategorieViewSet(viewsets.ModelViewSet):
    queryset = Categorie.objects.all()
    serializer_class = CategorieSerializer
    permission_classes = [  # noqa: RUF012
        HasActionByMethod.for_methods(
            GET=("CAT_LIRE",),
            HEAD=("CAT_LIRE",),
            OPTIONS=("CAT_LIRE",),
            **{"*": ("CAT_GERE",)},
        )
    ]
