from django.db import transaction
from rest_framework import serializers

from apps.catalogue.models import Article
from apps.common.serializers import BeneficiaireWriteMixin
from apps.stock.models import DetailMouvement, Mouvement, UniteArticle

from .detail_mouvement import DetailMouvementSerializer

ETATS_INUTILISABLES = (UniteArticle.Etat.PERDU, UniteArticle.Etat.HORS_USAGE)


class MouvementSerializer(serializers.ModelSerializer):
    details = DetailMouvementSerializer(many=True, required=False)
    magasin_source_nom = serializers.CharField(
        source="magasin_source.magasin_nom", read_only=True, default=None
    )
    magasin_destination_nom = serializers.CharField(
        source="magasin_destination.magasin_nom", read_only=True, default=None
    )

    class Meta:
        model = Mouvement
        fields = [  # noqa: RUF012
            "mouvement_id", "date", "type_mouvement", "origine", "motif", "magasin_source",
            "magasin_source_nom", "magasin_destination", "magasin_destination_nom", "details",
        ]
        read_only_fields = ["date"]  # noqa: RUF012

    def validate(self, attrs):
        type_mouvement = attrs.get("type_mouvement")
        source = attrs.get("magasin_source")
        destination = attrs.get("magasin_destination")

        if type_mouvement == Mouvement.Type.ENTREE and not destination:
            raise serializers.ValidationError(
                {"magasin_destination": "Une entrée doit avoir un magasin de destination."}
            )
        if type_mouvement == Mouvement.Type.SORTIE and not source:
            raise serializers.ValidationError({"magasin_source": "Une sortie doit avoir un magasin source."})
        if type_mouvement == Mouvement.Type.RETOUR and not destination:
            raise serializers.ValidationError(
                {"magasin_destination": "Un retour doit avoir un magasin de destination."}
            )
        if type_mouvement == Mouvement.Type.TRANSFERT:
            if not source or not destination:
                raise serializers.ValidationError("Un transfert doit avoir un magasin source ET destination.")
            if source == destination:
                raise serializers.ValidationError(
                    "Source et destination doivent être différents pour un transfert."
                )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        details_data = validated_data.pop("details", [])
        mouvement = Mouvement.objects.create(**validated_data)

        for detail_data in details_data:
            numeros = [n.strip() for n in detail_data.pop("numeros_de_serie", []) if n.strip()]
            affectation = BeneficiaireWriteMixin.extraire_affectation(detail_data)
            if affectation is not None:
                detail_data["affectation"] = affectation
            detail = DetailMouvement.objects.create(mouvement=mouvement, **detail_data)
            self._traiter_unites(mouvement, detail, numeros)

        return mouvement

    @staticmethod
    def _traiter_unites(mouvement, detail, numeros):
        article = detail.article

        if article.mode_suivi == Article.ModeSuivi.NUMERO_SERIE:
            if mouvement.type_mouvement == Mouvement.Type.ENTREE:
                for numero in numeros:
                    UniteArticle.objects.create(
                        article=article,
                        numero_de_serie=numero,
                        statut=UniteArticle.Statut.EN_STOCK,
                        mouvement_entree=detail,
                    )
            elif mouvement.type_mouvement == Mouvement.Type.SORTIE and numeros:
                beneficiaire = detail.affectation.cible if detail.affectation_id else None
                if beneficiaire is None:
                    raise serializers.ValidationError(
                        "Un bénéficiaire est requis pour sortir des unités suivies par numéro de série."
                    )
                # Verrouille les unités : deux sorties simultanées ne peuvent pas
                # attribuer la même unité.
                unites = {
                    unite.numero_de_serie: unite
                    for unite in UniteArticle.objects.select_for_update().filter(
                        article=article,
                        numero_de_serie__in=numeros,
                        statut=UniteArticle.Statut.EN_STOCK,
                    ).exclude(etat__in=ETATS_INUTILISABLES)
                }
                for numero in numeros:
                    unite = unites.get(numero)
                    if unite is None:
                        raise serializers.ValidationError(
                            f"L'unité avec le N° série '{numero}' n'existe pas ou n'est plus en stock."
                        )
                    unite.attribuer(beneficiaire=beneficiaire, mouvement_sortie=detail)

        elif article.is_immobilisation and mouvement.type_mouvement == Mouvement.Type.ENTREE:
            UniteArticle.objects.bulk_create([
                UniteArticle(
                    article=article,
                    statut=UniteArticle.Statut.EN_STOCK,
                    etat=UniteArticle.Etat.BON,
                    mouvement_entree=detail,
                )
                for _ in range(int(detail.quantite))
            ])
