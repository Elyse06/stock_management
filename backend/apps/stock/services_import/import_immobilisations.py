import re
import unicodedata
from datetime import datetime

import pandas as pd  # type: ignore
from django.db import models, transaction
from django.utils import timezone

from apps.catalogue.models import Article, Categorie, Fournisseur, Marque
from apps.commande.models import AttributionDetailCommande, Commande, DetailCommande
from apps.employee.models import Employer, Service, Site
from apps.stock.models import DetailMouvement, Magasin, Mouvement, UniteArticle

MARQUE_PAR_DEFAUT = "NON_SPECIFIEE"
VALEURS_NON_APPLICABLE = {"non applicable", "n/a", "na", "", "none", "nan"}

COLONNES_ATTENDUES = [
    "Date D'acquisition",
    "Nature",
    "Numero de série",
    "Fournisseur",
    "N° Matricule",
    "Détenteur",
    "Agence",
    "Code agence",
    "Emplacement",
    "Code famille",
]


class RollbackDryRun(Exception):
    pass


def slugify_code_article(designation: str) -> str:
    nfkd = unicodedata.normalize("NFKD", designation)
    ascii_str = nfkd.encode("ascii", "ignore").decode("ascii")
    mots = re.findall(r"[A-Za-z0-9]+", ascii_str.upper())
    base = "-".join(mots[:3]) or "ARTICLE"
    return base[:20]


def generer_code_article_unique(designation: str) -> str:
    base = slugify_code_article(designation)
    code = base
    suffixe = 1
    while Article.objects.filter(code_article=code).exists():
        suffixe += 1
        code = f"{base[:17]}-{suffixe}"
    return code


def est_non_applicable(valeur) -> bool:
    if valeur is None:
        return True
    try:
        if pd.isna(valeur):
            return True
    except (TypeError, ValueError):
        pass
    return str(valeur).strip().lower() in VALEURS_NON_APPLICABLE


def parse_date(valeur):
    if valeur is None:
        return timezone.now()
    try:
        if pd.isna(valeur):
            return timezone.now()
    except (TypeError, ValueError):
        pass
    if isinstance(valeur, datetime):
        return timezone.make_aware(valeur) if timezone.is_naive(valeur) else valeur
    for fmt in ("%d/%m/%y", "%d/%m/%Y", "%Y-%m-%d"):
        try:
            dt = datetime.strptime(str(valeur).strip(), fmt)  # noqa: DTZ007
            return timezone.make_aware(dt)
        except ValueError:
            continue
    return timezone.now()


def get_or_create_marque_defaut():
    marque, _ = Marque.objects.get_or_create(
        mq_libelle=MARQUE_PAR_DEFAUT,
        defaults={"mq_descriprion": "Marque par défaut - non renseignée à l'import"},
    )
    return marque


def get_or_create_categorie(code_famille):
    code_famille = (str(code_famille).strip() if not est_non_applicable(code_famille) else "DIVERS")[:20]
    categorie, _ = Categorie.objects.get_or_create(
        cat_libelle=code_famille,
        defaults={"cat_description": f"Créée automatiquement à l'import ({code_famille})"},
    )
    return categorie


def get_or_create_fournisseur(nom):
    nom = "" if est_non_applicable(nom) else str(nom).strip()
    if not nom:
        return None
    fournisseur, _ = Fournisseur.objects.get_or_create(
        nom__iexact=nom, defaults={"nom": nom, "email": ""}
    )
    return fournisseur


def get_or_create_site(agence):
    agence = "" if est_non_applicable(agence) else str(agence).strip()
    agence = agence or "INCONNU"
    site_type = "SIEGE" if agence.upper() == "SIEGE" else "AGENCE"
    site, _ = Site.objects.get_or_create(
        site_nom=agence, site_type=site_type, defaults={"localite": ""}
    )
    return site


def get_or_create_magasin(site):
    magasin, _ = Magasin.objects.get_or_create(magasin_nom=site.site_nom, localite=site)
    return magasin


def get_or_create_article(designation, categorie, marque, mode_suivi):
    designation = designation.strip()
    article = Article.objects.filter(designation__iexact=designation).first()
    if article:
        return article, False
    article = Article.objects.create(
        code_article=generer_code_article_unique(designation),
        designation=designation[:50],
        categorie=categorie,
        marque=marque,
        mode_suivi=mode_suivi,
        is_immobilisation=True,
    )
    return article, True


def _generer_emp_id_unique(matricule_str: str) -> str:
    base = re.sub(r"[^A-Za-z0-9]", "", matricule_str)[-5:].upper() or "EMP"
    candidat = f"E{base}"[:6]
    suffixe = 0
    while Employer.objects.filter(emp_id=candidat).exists():
        suffixe += 1
        candidat = f"E{base[:5 - len(str(suffixe))]}{suffixe}"[:6]
    return candidat


def resoudre_ou_creer_employe(matricule, detenteur):
    if est_non_applicable(matricule):
        return None, False

    matricule_str = str(matricule).strip()
    matricule_str = matricule_str.removesuffix(".0")

    employe = Employer.objects.filter(emp_matricule=matricule_str).first()
    if employe:
        return employe, False

    detenteur_str = "" if est_non_applicable(detenteur) else str(detenteur).strip()

    service = None
    if detenteur_str:
        service = Service.objects.filter(
            models.Q(serv_id__iexact=detenteur_str) | models.Q(serv_libelle__iexact=detenteur_str)
        ).first()

    if service:
        nom = f"Employé matricule {matricule_str} (nom à compléter)"
    else:
        nom = detenteur_str or f"Employé matricule {matricule_str} (nom à compléter)"

    employe = Employer.objects.create(
        emp_id=_generer_emp_id_unique(matricule_str),
        emp_nom=nom[:255],
        emp_matricule=matricule_str,
        emp_contact="",
        emp_fonction="",
        emp_serv_id=service,
    )
    return employe, True


def detecter_index_entete(source, feuille=0, max_lignes_recherche=10) -> int:
    if hasattr(source, "seek"):
        source.seek(0)

    brut = pd.read_excel(
        source, sheet_name=feuille, header=None, nrows=max_lignes_recherche
    )

    attendues_normalisees = {c.strip().lower() for c in COLONNES_ATTENDUES}

    meilleur_index = 0
    meilleur_score = 0
    for idx, row in brut.iterrows():
        valeurs = {str(v).strip().lower() for v in row.tolist() if not pd.isna(v)}
        score = len(valeurs & attendues_normalisees)
        if score > meilleur_score:
            meilleur_score = score
            meilleur_index = idx

    if hasattr(source, "seek"):
        source.seek(0)

    return meilleur_index if meilleur_score >= 3 else 0


def normaliser_colonnes(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [str(c).strip() for c in df.columns]
    return df


def colonnes_manquantes(df: pd.DataFrame):
    return [c for c in COLONNES_ATTENDUES if c not in df.columns]


def creer_attribution_historique(employe, article, date_acquisition, origine_import, nature):
    commande = Commande.objects.create(
        employe_demandeur=employe,
        objet=f"Import immobilisation - {nature}"[:100],
        statut=Commande.Statut.VALIDEE,
        date_traitement=date_acquisition,
        commentaire_agent=origine_import,
    )
    Commande.objects.filter(pk=commande.pk).update(date_commande=date_acquisition)

    detail_commande = DetailCommande.objects.create(
        commande=commande, article=article, quantite=1,
    )

    attribution = AttributionDetailCommande.objects.create(
        detail_commande=detail_commande,
        employe_beneficiaire=employe,
        quantite=1,
    )
    AttributionDetailCommande.objects.filter(pk=attribution.pk).update(
        date_acquisition=date_acquisition
    )
    attribution.refresh_from_db()

    return attribution


def _traiter_ligne(row, marque_defaut, origine_import):
    nature = "" if est_non_applicable(row.get("Nature")) else str(row.get("Nature")).strip()
    if not nature:
        raise ValueError("Colonne 'Nature' vide")

    numero_serie_brut = row.get("Numero de série")
    numero_serie_ok = not est_non_applicable(numero_serie_brut)
    mode_suivi = Article.ModeSuivi.NUMERO_SERIE if numero_serie_ok else Article.ModeSuivi.QUANTITE

    categorie = get_or_create_categorie(row.get("Code famille"))
    article, cree = get_or_create_article(nature, categorie, marque_defaut, mode_suivi)

    fournisseur = get_or_create_fournisseur(row.get("Fournisseur"))
    site = get_or_create_site(row.get("Agence") or row.get("Code agence"))
    magasin = get_or_create_magasin(site)
    date_acquisition = parse_date(row.get("Date D'acquisition"))
    employe, employe_cree = resoudre_ou_creer_employe(
        row.get("N° Matricule"), row.get("Détenteur")
    )

    mvt_entree = Mouvement(
        date=date_acquisition,
        type_mouvement=Mouvement.Type.ENTREE,
        origine=origine_import,
        magasin_destination=magasin,
    )
    mvt_entree.full_clean(exclude=["magasin_source"])
    mvt_entree.save()

    detail_entree = DetailMouvement.objects.create(
        mouvement=mvt_entree, article=article, quantite=1, fournisseur=fournisseur,
    )

    unite = UniteArticle.objects.create(
        article=article,
        numero_de_serie=str(numero_serie_brut).strip() if mode_suivi == Article.ModeSuivi.NUMERO_SERIE else None,
        statut=UniteArticle.Statut.EN_STOCK,
        mouvement_entree=detail_entree,
    )

    resultat = {
        "article": article.code_article,
        "article_cree": cree,
        "designation": nature,
        "mode_suivi": mode_suivi,
        "avertissement": None,
        "attribue_a": None,
        "code_unique_attribution": None,
    }

    matricule_val = row.get("N° Matricule")
    if employe:
        attribution = creer_attribution_historique(
            employe=employe,
            article=article,
            date_acquisition=date_acquisition,
            origine_import=origine_import,
            nature=nature,
        )

        mvt_sortie = Mouvement(
            date=date_acquisition,
            type_mouvement=Mouvement.Type.SORTIE,
            origine=origine_import,
            magasin_source=magasin,
        )
        mvt_sortie.full_clean(exclude=["magasin_destination"])
        mvt_sortie.save()

        detail_sortie = DetailMouvement.objects.create(
            mouvement=mvt_sortie,
            article=article,
            quantite=1,
            employe_beneficiaire=employe,
            code_tracabilite=str(attribution.code_unique),
        )
        unite.attribuer(beneficiaire=employe, mouvement_sortie=detail_sortie)

        resultat["attribue_a"] = f"{employe.emp_nom} ({employe.emp_matricule})"
        resultat["code_unique_attribution"] = str(attribution.code_unique)
        if employe_cree:
            resultat["avertissement"] = (
                f"Employé '{employe.emp_matricule}' créé automatiquement (nom à vérifier/compléter)"
            )
    elif not est_non_applicable(matricule_val):
        resultat["avertissement"] = f"Matricule '{matricule_val}' introuvable, article resté EN_STOCK"

    return resultat


def importer_immobilisations(df: pd.DataFrame, dry_run: bool = True) -> dict:
    df = normaliser_colonnes(df)
    manquantes = colonnes_manquantes(df)

    rapport = {
        "dry_run": dry_run,
        "colonnes_manquantes": manquantes,
        "lignes_ok": 0,
        "lignes_erreur": 0,
        "details": [],
    }

    origine_import = f"Import immobilisations {timezone.now():%Y-%m-%d}"

    try:
        with transaction.atomic():
            marque_defaut = get_or_create_marque_defaut()
            for idx, row in df.iterrows():
                ligne_no = idx + 2 
                try:
                    resultat = _traiter_ligne(row, marque_defaut, origine_import)
                    rapport["lignes_ok"] += 1
                    rapport["details"].append({"ligne": ligne_no, "statut": "OK", **resultat})
                except Exception as exc:  # noqa: BLE001
                    rapport["lignes_erreur"] += 1
                    rapport["details"].append(
                        {"ligne": ligne_no, "statut": "ERREUR", "message": str(exc)}
                    )

            if dry_run:
                raise RollbackDryRun()
    except RollbackDryRun:
        pass

    return rapport