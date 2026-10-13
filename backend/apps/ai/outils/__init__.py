"""Registre des outils de l'assistant."""
from . import catalogue, commandes, navigation, organisation, stock
from .base import Contexte, ErreurOutil, Outil, Resultat

TOUS = [*navigation.OUTILS, *catalogue.OUTILS, *stock.OUTILS, *commandes.OUTILS, *organisation.OUTILS]
PAR_NOM = {outil.nom: outil for outil in TOUS}


def outils_autorises(contexte):
    """Outils proposés au modèle : seulement ceux que l'utilisateur a le droit d'utiliser."""
    return [outil for outil in TOUS if outil.autorise(contexte)]


__all__ = ["PAR_NOM", "TOUS", "Contexte", "ErreurOutil", "Outil", "Resultat", "outils_autorises"]
