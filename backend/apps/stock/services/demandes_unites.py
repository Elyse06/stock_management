"""Demandes de retour ou de transfert d'une unité, faites par son bénéficiaire.

Règles :
- un employé peut demander pour les unités attribuées à lui-même ou à sa direction
  (les unités des salles et des agences sont gérées directement par le gestionnaire) ;
- une seule demande en attente par unité ;
- les règles des mouvements s'appliquent dès la demande (pas de retour d'une unité perdue,
  pas de transfert d'une unité perdue ou hors d'usage) ;
- une demande n'est « traitée » qu'avec le mouvement réellement effectué (même transaction).
"""
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import serializers

from apps.stock.models import Affectation, DemandeUnite, UniteArticle

ETATS_SANS_RETOUR = (UniteArticle.Etat.PERDU,)
ETATS_SANS_TRANSFERT = (UniteArticle.Etat.HORS_USAGE, UniteArticle.Etat.PERDU)


def unites_visibles(employe):
    """Unités attribuées à l'employé ou à sa direction."""
    if employe is None:
        return UniteArticle.objects.none()
    condition = Q(affectation__employe=employe)
    if employe.emp_dir_id:
        condition |= Q(affectation__direction_id=employe.emp_dir_id)
    return UniteArticle.objects.filter(condition, statut=UniteArticle.Statut.ATTRIBUE)


def _notifier(demande, evenement):
    from apps.notifications.tasks import notifier_demande_unite

    pk = demande.pk
    transaction.on_commit(lambda: notifier_demande_unite.delay(pk, evenement))


@transaction.atomic
def creer_demande(employe, unite_id, type_demande, motif="", nouveau_beneficiaire=None):
    unite = unites_visibles(employe).select_for_update().select_related("affectation").filter(unite_id=unite_id).first()
    if unite is None:
        raise serializers.ValidationError({"unite_id": "Cette unité ne vous est pas attribuée, ni à votre direction."})
    if DemandeUnite.objects.filter(unite=unite, statut=DemandeUnite.Statut.EN_ATTENTE).exists():
        raise serializers.ValidationError({"unite_id": "Une demande est déjà en attente pour cette unité."})
    nouvelle_affectation = None
    if type_demande == DemandeUnite.Type.RETOUR:
        if unite.etat in ETATS_SANS_RETOUR:
            raise serializers.ValidationError({"unite_id": "Une unité perdue ne peut pas être retournée au stock."})
    else:
        if unite.etat in ETATS_SANS_TRANSFERT:
            raise serializers.ValidationError({"unite_id": f"Une unité « {unite.get_etat_display()} » ne peut pas être transférée."})
        if nouveau_beneficiaire is None:
            raise serializers.ValidationError({"nouveau_beneficiaire": "Indiquez le nouveau bénéficiaire."})
        if unite.affectation.cible == nouveau_beneficiaire:
            raise serializers.ValidationError({"nouveau_beneficiaire": "Le nouveau bénéficiaire doit être différent de l'actuel."})
        nouvelle_affectation = Affectation.resoudre(nouveau_beneficiaire)
    demande = DemandeUnite.objects.create(
        type_demande=type_demande, unite=unite, demandeur=employe, affectation_origine=unite.affectation,
        nouvelle_affectation=nouvelle_affectation, motif=motif.strip(),
    )
    _notifier(demande, "nouvelle")
    return demande


def verrouiller_demande_a_traiter(demande_id, unite_id, type_demande):
    """Demande en attente correspondant au mouvement demandé, verrouillée (à appeler dans une transaction)."""
    demande = DemandeUnite.objects.select_for_update().filter(pk=demande_id).first()
    if demande is None:
        raise serializers.ValidationError({"demande_id": "Demande introuvable."})
    if demande.statut != DemandeUnite.Statut.EN_ATTENTE:
        raise serializers.ValidationError({"demande_id": f"Cette demande est déjà {demande.get_statut_display().lower()}."})
    if demande.unite_id != int(unite_id) or demande.type_demande != type_demande:
        raise serializers.ValidationError({"demande_id": "Cette demande ne correspond pas à ce mouvement."})
    return demande


def cloturer_apres_mouvement(unite_id, type_mouvement, traitant, mouvement, demande=None, commentaire=""):
    """Après un retour ou un transfert : la demande traitée passe « Traitée » ; les autres demandes
    en attente sur l'unité (devenues sans objet) sont annulées. À appeler dans la même transaction."""
    maintenant = timezone.now()
    if demande is not None:
        demande.statut = DemandeUnite.Statut.TRAITEE
        demande.date_traitement, demande.traitant, demande.mouvement = maintenant, traitant, mouvement
        demande.commentaire_traitement = commentaire
        demande.save(update_fields=["statut", "date_traitement", "traitant", "mouvement", "commentaire_traitement"])
        _notifier(demande, "traitee")
    action = "retournée en stock" if type_mouvement == DemandeUnite.Type.RETOUR else "transférée"
    for autre in DemandeUnite.objects.select_for_update().filter(unite_id=unite_id, statut=DemandeUnite.Statut.EN_ATTENTE):
        autre.statut = DemandeUnite.Statut.ANNULEE
        autre.date_traitement, autre.traitant = maintenant, traitant
        autre.commentaire_traitement = f"Unité déjà {action} par le gestionnaire."
        autre.save(update_fields=["statut", "date_traitement", "traitant", "commentaire_traitement"])
        _notifier(autre, "annulee")


@transaction.atomic
def refuser_demande(demande_id, traitant, commentaire):
    demande = DemandeUnite.objects.select_for_update().filter(pk=demande_id).first()
    if demande is None or demande.statut != DemandeUnite.Statut.EN_ATTENTE:
        raise serializers.ValidationError({"detail": "Seule une demande en attente peut être refusée."})
    demande.statut, demande.date_traitement, demande.traitant = DemandeUnite.Statut.REFUSEE, timezone.now(), traitant
    demande.commentaire_traitement = commentaire.strip()
    demande.save(update_fields=["statut", "date_traitement", "traitant", "commentaire_traitement"])
    _notifier(demande, "refusee")
    return demande


@transaction.atomic
def annuler_demande(demande_id, employe):
    demande = DemandeUnite.objects.select_for_update().filter(pk=demande_id).first()
    if demande is None or demande.demandeur_id != getattr(employe, "pk", None):
        raise serializers.ValidationError({"detail": "Vous ne pouvez annuler que vos propres demandes."})
    if demande.statut != DemandeUnite.Statut.EN_ATTENTE:
        raise serializers.ValidationError({"detail": "Seule une demande en attente peut être annulée."})
    demande.statut, demande.date_traitement = DemandeUnite.Statut.ANNULEE, timezone.now()
    demande.commentaire_traitement = "Annulée par le demandeur."
    demande.save(update_fields=["statut", "date_traitement", "commentaire_traitement"])
    return demande
