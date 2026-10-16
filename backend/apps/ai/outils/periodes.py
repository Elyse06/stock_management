"""Périodes calculées par le serveur, à l'heure de Madagascar : le modèle ne calcule aucune date."""
from datetime import date, datetime, time, timedelta

from django.utils import timezone

from apps.common.dates import ajouter_mois

PERIODES = [
    "aujourd_hui", "hier", "7_derniers_jours", "cette_semaine", "semaine_derniere", "30_derniers_jours", "3_derniers_mois",
    "ce_mois", "mois_dernier", "ce_trimestre", "trimestre_dernier", "cette_annee", "annee_derniere", "12_derniers_mois",
]


def _debut(jour):
    return timezone.make_aware(datetime.combine(jour, time.min))


def _bornes(periode, aujourd_hui):
    """(premier jour inclus, dernier jour inclus)."""
    lundi = aujourd_hui - timedelta(days=aujourd_hui.weekday())
    premier_du_mois = aujourd_hui.replace(day=1)
    trimestre = (aujourd_hui.month - 1) // 3 * 3 + 1
    debut_trimestre = date(aujourd_hui.year, trimestre, 1)
    regles = {
        "aujourd_hui": (aujourd_hui, aujourd_hui),
        "hier": (aujourd_hui - timedelta(days=1),) * 2,
        "7_derniers_jours": (aujourd_hui - timedelta(days=6), aujourd_hui),
        "cette_semaine": (lundi, aujourd_hui),
        "semaine_derniere": (lundi - timedelta(days=7), lundi - timedelta(days=1)),
        "30_derniers_jours": (aujourd_hui - timedelta(days=29), aujourd_hui),
        "3_derniers_mois": (aujourd_hui - timedelta(days=89), aujourd_hui),
        "ce_mois": (premier_du_mois, aujourd_hui),
        "mois_dernier": (date(*ajouter_mois(aujourd_hui.year, aujourd_hui.month, -1), 1), premier_du_mois - timedelta(days=1)),
        "ce_trimestre": (debut_trimestre, aujourd_hui),
        "trimestre_dernier": (date(*ajouter_mois(debut_trimestre.year, debut_trimestre.month, -3), 1), debut_trimestre - timedelta(days=1)),
        "cette_annee": (date(aujourd_hui.year, 1, 1), aujourd_hui),
        "annee_derniere": (date(aujourd_hui.year - 1, 1, 1), date(aujourd_hui.year - 1, 12, 31)),
        "12_derniers_mois": (date(*ajouter_mois(aujourd_hui.year, aujourd_hui.month, -11), 1), aujourd_hui),
    }
    return regles[periode]


def plage(periode=None, date_debut=None, date_fin=None, defaut="30_derniers_jours"):
    """Renvoie (début, fin exclue, libellé lisible) ; dates explicites « AAAA-MM-JJ » prioritaires."""
    aujourd_hui = timezone.localdate()
    if date_debut or date_fin:
        try:
            debut = date.fromisoformat(date_debut) if date_debut else date(2000, 1, 1)
            fin = date.fromisoformat(date_fin) if date_fin else aujourd_hui
        except ValueError as exc:
            from .base import ErreurOutil

            raise ErreurOutil("Dates attendues au format AAAA-MM-JJ.") from exc
    else:
        debut, fin = _bornes(periode if periode in PERIODES else defaut, aujourd_hui)
    if debut > fin:
        debut, fin = fin, debut
    libelle = f"le {debut:%d/%m/%Y}" if debut == fin else f"du {debut:%d/%m/%Y} au {fin:%d/%m/%Y}"
    return _debut(debut), _debut(fin + timedelta(days=1)), libelle


def parametres_periode():
    """Paramètres communs des outils datés."""
    return {
        "periode": {"type": "string", "enum": PERIODES,
                    "description": "Période relative (« la semaine dernière » = semaine_derniere). À préférer aux dates."},
        "date_debut": {"type": "string", "description": "Date de début AAAA-MM-JJ (seulement si l'utilisateur donne une date précise)."},
        "date_fin": {"type": "string", "description": "Date de fin AAAA-MM-JJ (incluse)."},
    }
