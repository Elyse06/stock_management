"""Annuaire : employés, comme la page Employés (lecture ouverte à tout utilisateur connecté).

Seules les informations professionnelles sont transmises (pas le contact).
"""
from django.db.models import Q

from apps.employee.models import Employer

from .base import ErreurOutil, Outil, Resultat, entier, lien, tableau, texte


def _employes(contexte, recherche=None, direction=None, limite=10):
    if not recherche and not direction:
        raise ErreurOutil("Précisez un nom, un matricule, une fonction ou une direction.")
    employes = Employer.objects.select_related("emp_dir_id", "emp_serv_id", "emp_site_id")
    if recherche:
        employes = employes.filter(
            Q(emp_nom__icontains=recherche) | Q(emp_matricule__iexact=recherche) | Q(emp_fonction__icontains=recherche)
        )
    if direction:
        employes = employes.filter(emp_dir_id__dir_libelle__icontains=direction)
    total = employes.count()
    lignes = list(employes.order_by("emp_nom")[:limite])

    def champs(e):
        return {"nom": e.emp_nom, "matricule": e.emp_matricule, "fonction": e.emp_fonction,
                "direction": e.emp_dir_id.dir_libelle if e.emp_dir_id else None,
                "service": e.emp_serv_id.serv_libelle if e.emp_serv_id else None,
                "site": e.emp_site_id.site_nom if e.emp_site_id else None}

    donnees = [champs(e) for e in lignes]
    return Resultat(
        pour_ia={"total": total, "employes": donnees},
        tableau=tableau("Employés", ["Nom", "Matricule", "Fonction", "Direction"],
                        [[d["nom"], d["matricule"], d["fonction"], d["direction"]] for d in donnees], total),
        liens=lien(contexte, "Ouvrir l'annuaire", "/employes"),
    )


OUTILS = [
    Outil("rechercher_employes", "Rechercher des employés (nom, matricule, fonction, direction, service, site).", {
        "recherche": texte("Nom, matricule ou fonction."),
        "direction": texte("Nom de la direction."),
        "limite": entier("Nombre maximum d'employés (10 par défaut)."),
    }, _employes),
]
