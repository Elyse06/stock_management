"""Import des adresses électroniques de connexion des employés (Excel / CSV).

Colonnes utilisées : « Adresse électronique » et « Matricule » (les autres sont ignorées).
Pour chaque ligne, l'employé est retrouvé par son matricule, puis :
- s'il a déjà un compte : l'adresse de connexion du compte est mise à jour ;
- sinon, si un compte libre porte déjà cette adresse : ce compte lui est rattaché ;
- sinon : un compte est créé, avec les droits du profil standard et sans mot de passe
  utilisable ; après la confirmation, un mot de passe temporaire aléatoire est envoyé à
  l'adresse avec le lien de l'application (voir apps.utilisateur.acces). L'employé doit le
  changer à sa première connexion. Rien n'est envoyé lors d'un aperçu.

Comme l'import des employés, chaque ligne est traitée dans son propre savepoint.
"""
import re
import unicodedata

from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import transaction

from apps.common import actions
from apps.common.imports import executer_avec_dry_run, texte_ou_vide
from apps.employee.models import Employer
from apps.utilisateur.acces import demander_envoi_acces, preparer_sans_mot_de_passe
from apps.utilisateur.models import Action, Autoriser, Utilisateur

# Droits des comptes créés : ceux du profil standard du formulaire de création de compte.
ACTIONS_PAR_DEFAUT = (actions.CAT_LIRE, actions.MOV_LIRE, actions.COM_DEM)

# En-têtes acceptés (comparés sans accents, casse ni ponctuation).
ENTETES = {
    "email": {"adresse electronique", "adresse email", "adresse mail", "email", "e mail", "mail", "courriel"},
    "matricule": {"matricule", "mle"},
}
COLONNES_ATTENDUES = ["Adresse électronique", "Matricule"]


class ErreurLigne(Exception):
    """Erreur métier sur une ligne : rapportée telle quelle, l'import continue."""


def _normaliser_entete(texte):
    sans_accents = unicodedata.normalize("NFKD", str(texte)).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", " ", sans_accents.lower()).strip()


def _colonnes(df):
    """Nom réel de chaque colonne utile dans le fichier, ou None si absente."""
    trouvees = {}
    for colonne in df.columns:
        cle = _normaliser_entete(colonne)
        for role, variantes in ENTETES.items():
            if cle in variantes and role not in trouvees:
                trouvees[role] = colonne
    return trouvees


def _attribuer_droits_par_defaut(compte):
    existantes = set(Action.objects.filter(action_id__in=ACTIONS_PAR_DEFAUT).values_list("action_id", flat=True))
    Autoriser.objects.bulk_create([Autoriser(autoriser_utilisateur_id=compte, autoriser_action_id_id=a) for a in sorted(existantes)])


def _traiter_ligne(email_brut, matricule_brut, overwrite):
    """Retourne (statut, employé, message, compte_cree)."""
    matricule = texte_ou_vide(matricule_brut).removesuffix(".0").strip()
    email = texte_ou_vide(email_brut).strip().lower()
    if not matricule:
        raise ErreurLigne("Matricule manquant.")
    if not email:
        raise ErreurLigne("Adresse électronique manquante.")
    try:
        validate_email(email)
    except ValidationError as exc:
        raise ErreurLigne(f"Adresse électronique invalide : « {email} ».") from exc

    employe = Employer.objects.select_related("emp_utilisateur_id").filter(emp_matricule=matricule).first()
    if employe is None:
        raise ErreurLigne(f"Aucun employé avec le matricule « {matricule} ».")

    porteur = Utilisateur.objects.filter(utilisateur_mail__iexact=email).first()
    compte = employe.emp_utilisateur_id

    if compte is not None:
        if compte.utilisateur_mail.lower() == email:
            return "IGNORE", employe, "Adresse déjà à jour.", False
        if porteur is not None:
            raise ErreurLigne(f"L'adresse « {email} » est déjà utilisée par un autre compte.")
        if not overwrite:
            return "IGNORE", employe, f"Compte existant ({compte.utilisateur_mail}) : non modifié (mise à jour désactivée).", False
        ancienne = compte.utilisateur_mail
        compte.utilisateur_mail = email
        compte.save(update_fields=["utilisateur_mail"])
        return "MAJ", employe, f"Adresse de connexion modifiée (ancienne : {ancienne}).", False

    if porteur is not None:
        autre = Employer.objects.filter(emp_utilisateur_id=porteur).exclude(pk=employe.pk).first()
        if autre is not None:
            raise ErreurLigne(f"L'adresse « {email} » est déjà le compte de {autre.emp_nom} ({autre.emp_matricule}).")
        employe.emp_utilisateur_id = porteur
        employe.save(update_fields=["emp_utilisateur_id"])
        return "RATTACHE", employe, "Compte existant rattaché à l'employé.", False

    compte = Utilisateur(utilisateur_mail=email)
    preparer_sans_mot_de_passe(compte)
    compte.save()
    demander_envoi_acces(compte)  # exécuté seulement si l'import est confirmé (pas lors de l'aperçu)
    _attribuer_droits_par_defaut(compte)
    employe.emp_utilisateur_id = compte
    employe.save(update_fields=["emp_utilisateur_id"])
    return "CREE", employe, "Compte créé (profil standard) ; un e-mail d'accès sera envoyé.", True


_COMPTEURS = {"CREE": "lignes_creees", "MAJ": "lignes_maj", "RATTACHE": "lignes_maj", "IGNORE": "lignes_ignorees"}
_LIBELLES = {"CREE": "CRÉÉ", "MAJ": "MIS À JOUR", "RATTACHE": "RATTACHÉ", "IGNORE": "IGNORÉ"}


def importer_emails(df, overwrite=True, dry_run=True):
    colonnes = _colonnes(df)
    manquantes = [nom for role, nom in zip(("email", "matricule"), COLONNES_ATTENDUES, strict=True) if role not in colonnes]
    if manquantes:
        return {
            "dry_run": dry_run, "colonnes_manquantes": manquantes, "lignes_ok": 0, "lignes_erreur": len(df),
            "details": [{"ligne": i + 2, "statut": "ERREUR", "message": f"Colonnes manquantes : {', '.join(manquantes)}"}
                        for i in range(len(df))],
        }

    rapport = {"dry_run": dry_run, "colonnes_manquantes": [], "lignes_ok": 0, "lignes_erreur": 0,
               "lignes_creees": 0, "lignes_maj": 0, "lignes_ignorees": 0, "details": [], "identifiants": []}
    vus = {}
    with executer_avec_dry_run(dry_run):
        for idx, row in df.iterrows():
            ligne_no = idx + 2
            email_brut, matricule_brut = row.get(colonnes["email"]), row.get(colonnes["matricule"])
            if not texte_ou_vide(email_brut) and not texte_ou_vide(matricule_brut):
                continue  # ligne vide
            detail = {"ligne": ligne_no, "matricule": texte_ou_vide(matricule_brut).removesuffix(".0"),
                      "email": texte_ou_vide(email_brut).strip().lower()}
            try:
                with transaction.atomic():
                    statut, employe, message, cree = _traiter_ligne(email_brut, matricule_brut, overwrite)
            except ErreurLigne as exc:
                rapport["lignes_erreur"] += 1
                rapport["details"].append({**detail, "statut": "ERREUR", "message": str(exc)})
                continue
            except Exception as exc:  # noqa: BLE001 - erreur rapportée ligne par ligne
                rapport["lignes_erreur"] += 1
                rapport["details"].append({**detail, "statut": "ERREUR", "message": f"Erreur inattendue : {exc}"})
                continue
            precedent = vus.get(detail["matricule"])
            if precedent:
                message = f"{message} Matricule déjà présent ligne {precedent} : cette ligne l'emporte."
            vus[detail["matricule"]] = ligne_no
            rapport["lignes_ok"] += 1
            rapport[_COMPTEURS[statut]] += 1
            rapport["details"].append({**detail, "statut": _LIBELLES[statut], "nom": employe.emp_nom, "message": message})
            if cree and not dry_run:
                rapport["identifiants"].append({"matricule": detail["matricule"], "nom": employe.emp_nom, "email": detail["email"]})
    rapport["count_total"] = rapport["lignes_creees"] + rapport["lignes_maj"]
    return rapport
