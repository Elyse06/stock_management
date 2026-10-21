"""Outil des commandes : même visibilité que l'API.

Un demandeur ne voit que ses commandes, un chef celles de sa direction, le
gestionnaire toutes (``filtrer_commandes_visibles``, celui des vues de l'API).
"""
from django.db.models import Count
from django.utils import timezone

from apps.commande.access import filtrer_commandes_visibles
from apps.commande.models import Commande
from apps.common import actions as a

from .base import Outil, Resultat, entier, lien_unique, tableau, texte
from .periodes import parametres_periode, plage


def _commandes(contexte, statut=None, periode=None, date_debut=None, date_fin=None, limite=10):
    visibles = filtrer_commandes_visibles(Commande.objects.all(), contexte.request)
    libelle_periode = "toutes périodes"
    if periode or date_debut or date_fin:
        debut, fin, libelle_periode = plage(periode, date_debut, date_fin)
        visibles = visibles.filter(date_commande__gte=debut, date_commande__lt=fin)
    par_statut = dict(visibles.values_list("statut").annotate(n=Count("pk")))
    if statut:
        visibles = visibles.filter(statut=statut)
    total = visibles.count()
    lignes = list(
        visibles.select_related("employe_demandeur").prefetch_related("details__article").order_by("-date_commande")[:limite]
    )

    def articles(c):
        return ", ".join(f"{d.libelle} ×{d.quantite}" for d in c.details.all())

    return Resultat(
        pour_ia={
            "portee": "toutes les commandes" if contexte.peut(a.CAT_GERE) and contexte.peut(a.COM_VAL)
            else "les commandes visibles par l'utilisateur",
            "periode": libelle_periode,
            "nombre_par_statut": {Commande.Statut(s).label: n for s, n in par_statut.items()},
            "total_filtre": total,
            "commandes": [
                {"numero": c.commande_id, "date": f"{timezone.localtime(c.date_commande):%d/%m/%Y}",
                 "demandeur": c.employe_demandeur.emp_nom if c.employe_demandeur else None,
                 "statut": c.get_statut_display(), "objet": c.objet, "articles": articles(c)}
                for c in lignes
            ],
        },
        tableau=tableau("Commandes", ["N°", "Date", "Demandeur", "Statut"],
                        [[c.commande_id, f"{timezone.localtime(c.date_commande):%d/%m/%Y}",
                          c.employe_demandeur.emp_nom if c.employe_demandeur else "—", c.get_statut_display()]
                         for c in lignes], total,
                        lien_unique(contexte, "Voir les commandes", "/commandes")),
    )


OUTILS = [
    Outil("commandes",
          "Commandes (demandes de matériel) visibles par l'utilisateur, avec le nombre par statut.", {
              "statut": texte("Statut de la commande.", enum=list(Commande.Statut.values)),
              **parametres_periode(),
              "limite": entier("Nombre maximum de commandes (10 par défaut)."),
          }, _commandes, (a.COM_DEM, a.COM_VAL)),
]
