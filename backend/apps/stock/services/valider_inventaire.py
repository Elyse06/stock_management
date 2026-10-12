from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.catalogue.models import Article
from apps.common.stock import MOTIF_ECART_NEGATIF, MOTIF_ECART_POSITIF
from apps.stock.models import (
    Affectation,
    DetailMouvement,
    InventaireSession,
    LigneInventaire,
    Mouvement,
)

from .proposition_serie import materialiser_propositions_serie


@transaction.atomic
def valider_session_inventaire(session: InventaireSession):
    session = InventaireSession.objects.select_for_update().get(pk=session.pk)
    if session.statut == InventaireSession.Statut.VALIDE:
        raise serializers.ValidationError("Cet inventaire a déjà été validé.")
    if session.statut != InventaireSession.Statut.EN_ATTENTE:
        raise serializers.ValidationError("Seules les sessions EN_ATTENTE peuvent être validées.")

    affectation_lieu = None
    if session.direction_id:
        affectation_lieu = Affectation.pour_direction(session.direction)
    elif session.site_id:
        affectation_lieu = Affectation.pour_site(session.site)
    elif session.salle_id:
        affectation_lieu = Affectation.pour_salle(session.salle)

    lignes = list(session.lignes.select_related("article"))
    origine = f"Inventaire #{session.code_reference}"[:100]
    mouvement_gain = mouvement_perte = None
    if any(ligne.ecart > 0 for ligne in lignes):
        mouvement_gain = Mouvement.objects.create(
            type_mouvement=Mouvement.Type.AJUSTEMENT, origine=origine,
            motif=MOTIF_ECART_POSITIF, magasin_destination=session.magasin,
        )
    if any(ligne.ecart < 0 for ligne in lignes):
        mouvement_perte = Mouvement.objects.create(
            type_mouvement=Mouvement.Type.AJUSTEMENT, origine=origine,
            motif=MOTIF_ECART_NEGATIF, magasin_source=session.magasin,
        )

    lignes_a_mettre_a_jour = []
    for ligne in lignes:
        article = ligne.article
        ecart = int(ligne.ecart)

        if article.mode_suivi == Article.ModeSuivi.NUMERO_SERIE:
            materialiser_propositions_serie(
                ligne=ligne, article=article, mouvement_gain=mouvement_gain,
                mouvement_perte=mouvement_perte, affectation_lieu=affectation_lieu,
            )
        else:
            if (ligne.propositions_series or {}).get("changements_etat"):
                materialiser_propositions_serie(ligne=ligne, article=article)
            if ecart != 0:
                DetailMouvement.objects.create(
                    mouvement=mouvement_gain if ecart > 0 else mouvement_perte,
                    article=article,
                    quantite=abs(ecart),
                    affectation=affectation_lieu,
                )

        if ecart != 0:
            ligne.quantite_theorique = ligne.quantite_physique
            ligne.ecart = 0
            lignes_a_mettre_a_jour.append(ligne)

    if lignes_a_mettre_a_jour:
        LigneInventaire.objects.bulk_update(lignes_a_mettre_a_jour, ["quantite_theorique", "ecart"])

    session.statut = InventaireSession.Statut.VALIDE
    session.date_validation = timezone.now()
    session.save(update_fields=["statut", "date_validation"])
    return session
