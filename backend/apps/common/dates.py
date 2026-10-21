from datetime import date, datetime, time

from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework.exceptions import ValidationError


def parse_date_param(value, nom, requis=False):
    if value in (None, ""):
        if requis:
            raise ValidationError({nom: "Ce paramètre est obligatoire."})
        return None
    try:
        resultat = parse_date(str(value))
    except ValueError:
        resultat = None
    if resultat is None:
        raise ValidationError({nom: "Format attendu : AAAA-MM-JJ."})
    return resultat


def fin_de_journee(jour: date) -> datetime:
    return timezone.make_aware(datetime.combine(jour, time.max))


def debut_de_journee(jour: date) -> datetime:
    return timezone.make_aware(datetime.combine(jour, time.min))


def ajouter_mois(annee: int, mois: int, delta: int) -> tuple[int, int]:
    total = annee * 12 + (mois - 1) + delta
    return total // 12, total % 12 + 1


def plage_mois(valeur=None):
    if valeur:
        try:
            annee, mois = (int(part) for part in str(valeur).split("-"))
            if not 1 <= mois <= 12:
                raise ValueError
        except (TypeError, ValueError) as exc:
            raise ValidationError({"mois": "Format de mois invalide. Utilisez AAAA-MM."}) from exc
    else:
        aujourd_hui = timezone.localdate()
        annee, mois = aujourd_hui.year, aujourd_hui.month

    annee_fin, mois_fin = ajouter_mois(annee, mois, 1)
    debut = debut_de_journee(date(annee, mois, 1))
    fin = debut_de_journee(date(annee_fin, mois_fin, 1))
    return debut, fin, f"{annee:04d}-{mois:02d}"


def derniers_mois(nombre: int):
    aujourd_hui = timezone.localdate()
    resultats = []
    for decalage in range(nombre - 1, -1, -1):
        annee, mois = ajouter_mois(aujourd_hui.year, aujourd_hui.month, -decalage)
        annee_suivante, mois_suivant = ajouter_mois(annee, mois, 1)
        fin = debut_de_journee(date(annee_suivante, mois_suivant, 1))
        resultats.append((f"{annee:04d}-{mois:02d}", fin))
    return resultats
