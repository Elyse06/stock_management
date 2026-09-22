from django.db import transaction
from rest_framework import serializers

from apps.catalogue.models import Article
from apps.stock.models import (
    DetailMouvement,
    Mouvement,
    UniteArticle,
)

from .detail_mouvement import DetailMouvementSerializer


class MouvementSerializer(serializers.ModelSerializer):
    details = DetailMouvementSerializer(many=True, required=False)
    magasin_source_nom = serializers.CharField(source="magasin_source.magasin_nom", read_only=True, default=None)
    magasin_destination_nom = serializers.CharField(source="magasin_destination.magasin_nom", read_only=True, default=None)

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
            raise serializers.ValidationError(
                {"magasin_source": "Une sortie doit avoir un magasin source."}
            )
        if type_mouvement == Mouvement.Type.RETOUR and not destination:
            raise serializers.ValidationError(
                {"magasin_destination": "Un retour doit avoir un magasin de destination."}
            )
        if type_mouvement == Mouvement.Type.TRANSFERT:
            if not source or not destination:
                raise serializers.ValidationError(
                    "Un transfert doit avoir un magasin source ET destination."
                )
            if source == destination:
                raise serializers.ValidationError(
                    "Source et destination doivent être différents pour un transfert."
                )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        details_data = validated_data.pop("details", [])
        mouvement = Mouvement.objects.create(**validated_data)
        
        for detail in details_data:
            numeros_de_serie = detail.pop("numeros_de_serie", [])
            detail_mouvement = DetailMouvement.objects.create(
                mouvement=mouvement, **detail
            )
            
            article = detail_mouvement.article
            if hasattr(article, 'mode_suivi') and article.mode_suivi == "NUMERO_SERIE":
                
                if mouvement.type_mouvement == Mouvement.Type.ENTREE:
                    for numero in numeros_de_serie:
                        UniteArticle.objects.create(
                            article=article,
                            numero_de_serie=numero.strip(),
                            statut=UniteArticle.Statut.EN_STOCK,
                            mouvement_entree=detail_mouvement,
                        )
                        
                elif mouvement.type_mouvement == Mouvement.Type.SORTIE:
                    beneficiaire = (
                        detail_mouvement.employe_beneficiaire
                        or detail_mouvement.direction_beneficiaire
                    )
                    for numero in numeros_de_serie:
                        try:
                            unite = UniteArticle.objects.get(
                                article=article,
                                numero_de_serie=numero.strip(),
                                statut=UniteArticle.Statut.EN_STOCK,
                            )
                            if unite.etat in [
                                UniteArticle.Etat.PERDU,
                                UniteArticle.Etat.HORS_USAGE,
                            ]:
                                raise UniteArticle.DoesNotExist
                            unite.attribuer(
                                beneficiaire=beneficiaire,
                                mouvement_sortie=detail_mouvement,
                            )
                        except UniteArticle.DoesNotExist:
                            raise serializers.ValidationError(
                                f"L'unité avec le N° série '{numero}' n'existe pas ou n'est plus en stock."
                            )
                        
            elif (
                hasattr(article, 'is_immobilisation') and article.is_immobilisation
                and article.mode_suivi != Article.ModeSuivi.NUMERO_SERIE
                and mouvement.type_mouvement == Mouvement.Type.ENTREE
            ):
                quantite_a_creer = int(detail_mouvement.quantite)
                unites_a_creer = [
                    UniteArticle(
                        article=article,
                        statut=UniteArticle.Statut.EN_STOCK,
                        etat=UniteArticle.Etat.BON,
                        mouvement_entree=detail_mouvement,
                    )
                    for _ in range(quantite_a_creer)
                ]
                UniteArticle.objects.bulk_create(unites_a_creer)
        
        return mouvement
