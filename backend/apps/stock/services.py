from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.stock.models import (
    DetailMouvement,
    InventaireSession,
    LigneInventaire,
    Mouvement,
)


@transaction.atomic
def valider_session_inventaire(session: InventaireSession):
    if session.statut == InventaireSession.Statut.VALIDE:
        raise serializers.ValidationError("Cet inventaire a déjà été validé.")

    # Vérification s'il existe des écarts à régulariser
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

        for ligne in lignes_ecart_positif:
            DetailMouvement.objects.create(
                mouvement=mouvement_gain,
                article=ligne.article,
                quantite=abs(ligne.ecart),
            )

        
    if lignes_ecart_negatif.exists():
        mouvement_perte = Mouvement.objects.create(
            type_mouvement=Mouvement.Type.AJUSTEMENT,
            origine=f"Inventaire #{session.code_reference}",
            motif="Régularisation d'écart négatif",
            magasin_source=session.magasin,
            magasin_destination=None,
        )

        for ligne in lignes_ecart_negatif:
            DetailMouvement.objects.create(
                mouvement=mouvement_perte,
                article=ligne.article,
                quantite=abs(ligne.ecart),
            )

    lignes_a_mettre_a_jour = []
    for ligne in session.lignes.exclude(ecart=0):
        ligne.quantite_theorique = ligne.quantite_physique
        ligne.ecart = 0
        lignes_a_mettre_a_jour.append(ligne)

    if lignes_a_mettre_a_jour:
        LigneInventaire.objects.bulk_update(
            lignes_a_mettre_a_jour, 
            ['quantite_theorique', 'ecart']
        )

    

    # 2. Mise à jour de l'état de la session
    session.statut = InventaireSession.Statut.VALIDE
    session.date_validation = timezone.now()
    session.save()

    return session