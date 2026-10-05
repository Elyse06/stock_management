from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.catalogue.models import Article
from apps.stock.models import (
    Affectation,
    DetailMouvement,
    InventaireSession,
    LigneInventaire,
    Mouvement,
)

from .proposition_serie import _materieliser_propositions_serie


@transaction.atomic
def valider_session_inventaire(session: InventaireSession):
    if session.statut == InventaireSession.Statut.VALIDE:
        raise serializers.ValidationError("Cet inventaire a déjà été validé.")
    
    if session.statut != InventaireSession.Statut.EN_ATTENTE:
        raise serializers.ValidationError(
            "Seules les sessions EN_ATTENTE peuvent être validées."
        )
    
    mouvement_gain = None
    mouvement_perte = None
    affectation_lieu = None
    if session.direction_id:
        affectation_lieu = Affectation.pour_direction(session.direction)
    elif session.site_id:
        affectation_lieu = Affectation.pour_site(session.site)
    elif session.salle_id:
        affectation_lieu = Affectation.pour_salle(session.salle)
    
    lignes_ecart_positif = session.lignes.filter(ecart__gt=0)
    lignes_ecart_negatif = session.lignes.filter(ecart__lt=0)
    
    if lignes_ecart_positif.exists():
        mouvement_gain = Mouvement.objects.create(
            type_mouvement=Mouvement.Type.AJUSTEMENT,
            origine=f"Inventaire #{session.code_reference}",
            motif="Régularisation d'écart positif",
            magasin_source=None,
            magasin_destination=session.magasin,
        )
    
    if lignes_ecart_negatif.exists():
        mouvement_perte = Mouvement.objects.create(
            type_mouvement=Mouvement.Type.AJUSTEMENT,
            origine=f"Inventaire #{session.code_reference}",
            motif="Régularisation d'écart négatif",
            magasin_source=session.magasin,
            magasin_destination=None,
        )
    
    lignes_a_mettre_a_jour = []
    
    for ligne in session.lignes.select_related('article').all():
        article = ligne.article
        ecart = int(ligne.ecart)
        
        if article.mode_suivi == Article.ModeSuivi.NUMERO_SERIE:
            _materieliser_propositions_serie(
                ligne=ligne,
                session=session,
                article=article,
                mouvement_gain=mouvement_gain,
                mouvement_perte=mouvement_perte,
                affectation_lieu=affectation_lieu,
            )
        else:
            if ligne.propositions_series.get('changements_etat'):
                _materieliser_propositions_serie(
                    ligne=ligne,
                    session=session,
                    article=article,
                )

            if ecart != 0:
                mouvement_ref = mouvement_gain if ecart > 0 else mouvement_perte
                DetailMouvement.objects.create(
                    mouvement=mouvement_ref,
                    article=article,
                    quantite=abs(ecart),
                    affectation=affectation_lieu,
                )
        
        if ecart != 0:
            ligne.quantite_theorique = ligne.quantite_physique
            ligne.ecart = 0
            lignes_a_mettre_a_jour.append(ligne)
    
    if lignes_a_mettre_a_jour:
        LigneInventaire.objects.bulk_update(
            lignes_a_mettre_a_jour,
            ['quantite_theorique', 'ecart']
        )
    
    session.statut = InventaireSession.Statut.VALIDE
    session.date_validation = timezone.now()
    session.save()
    
    return session
