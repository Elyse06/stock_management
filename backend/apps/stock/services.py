from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.stock.models import DetailMouvement, InventaireSession, Mouvement


@transaction.atomic
def valider_session_inventaire(session: InventaireSession):
    """Valide l'inventaire et applique automatiquement les régularisations d'écart de stock."""
    if session.statut == InventaireSession.Statut.VALIDE:
        raise serializers.ValidationError("Cet inventaire a déjà été validé.")

    # 1. Vérification s'il existe des écarts à régulariser
    lignes_avec_ecart = session.lignes.exclude(ecart=0)

    if lignes_avec_ecart.exists():
        # Génération du Mouvement d'Ajustement
        mouvement = Mouvement.objects.create(
            type_mouvement=Mouvement.Type.AJUSTEMENT,
            origine=f"Inventaire #{session.code_reference}",
            motif=f"Régularisation d'écart d'inventaire ({session.get_statut_display()})",
            magasin_source=session.magasin if session.magasin else None,
        )

        for ligne in lignes_avec_ecart:
            DetailMouvement.objects.create(
                mouvement=mouvement,
                article=ligne.article,
                quantite=abs(ligne.ecart),
            )

    # 2. Mise à jour de l'état de la session
    session.statut = InventaireSession.Statut.VALIDE
    session.date_validation = timezone.now()
    session.save()

    return session