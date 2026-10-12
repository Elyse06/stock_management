import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

import pandas as pd
from django.db import transaction
from django.utils import timezone

from apps.catalogue.models import Article, Categorie
from apps.common.dates import debut_de_journee
from apps.common.imports import detecter_index_entete as _detecter_index_entete
from apps.common.imports import (
    est_non_applicable,
    executer_avec_dry_run,
    generer_code_article_unique,
    texte_ou_vide,
    trouver_magasin_siege,
)
from apps.stock.models import DetailMouvement

from .mouvements_import import CacheReferentiels, MouvementsImport

COLONNES_ATTENDUES = ["ARTICLES", "QTE RESTANT", "OBSERVATION"]


def detecter_index_entete(source, feuille=0, max_lignes_recherche=10) -> int:
    return _detecter_index_entete(source, COLONNES_ATTENDUES, feuille, max_lignes_recherche)


def detecter_date_import(source, feuille=0, ligne_entete=0):
    """Date du rapport lue au-dessus de l'en-tête (cellule date ou « DATE jj/mm/aa »)."""
    if hasattr(source, "seek"):
        source.seek(0)
    brut = pd.read_excel(source, sheet_name=feuille, header=None, nrows=ligne_entete)
    if hasattr(source, "seek"):
        source.seek(0)

    for _, ligne in brut.iterrows():
        for valeur in ligne.tolist():
            if pd.isna(valeur):
                continue
            if isinstance(valeur, pd.Timestamp | datetime | date):
                return valeur.date() if hasattr(valeur, "date") else valeur
            correspondance = re.search(
                r"\bDATE\b\s*[:\-]?\s*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})", str(valeur), flags=re.IGNORECASE
            )
            if correspondance:
                date_parsee = pd.to_datetime(correspondance.group(1), dayfirst=True, errors="coerce")
                if not pd.isna(date_parsee):
                    return date_parsee.date()
    return None


def normaliser_colonnes(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [
        "ARTICLES" if colonne == "ARTICLE" else colonne
        for colonne in (str(c).strip().upper() for c in df.columns)
    ]
    return df


def colonnes_manquantes(df: pd.DataFrame):
    presentes = {str(colonne).strip().upper() for colonne in df.columns}
    return [c for c in COLONNES_ATTENDUES if c not in presentes]


def get_or_create_categorie():
    categorie, _ = Categorie.objects.get_or_create(cat_libelle="FR", cat_description="Fourniture")
    return categorie


def get_or_create_article(designation, categorie, mode_suivi):
    designation = designation.strip()
    article = Article.objects.filter(designation__iexact=designation).first()
    if article:
        return article, False
    article = Article.objects.create(
        code_article=generer_code_article_unique(categorie),
        designation=designation[:50],
        categorie=categorie,
        mode_suivi=mode_suivi,
        is_immobilisation=False,
    )
    return article, True


def _lire_quantite(valeur) -> int:
    if est_non_applicable(valeur):
        return 0
    try:
        quantite = Decimal(str(valeur).replace(",", "."))
    except (InvalidOperation, ValueError) as exc:
        raise ValueError("La quantité doit être un nombre entier positif ou nul.") from exc
    if not quantite.is_finite() or quantite < 0 or quantite != quantite.to_integral_value():
        raise ValueError("La quantité doit être un nombre entier positif ou nul.")
    return int(quantite)


def _traiter_ligne(row, mouvements, cache=None):
    designation = texte_ou_vide(row.get("ARTICLES"))
    if not designation:
        raise ValueError("Colonne 'ARTICLES' vide")
    quantite = _lire_quantite(row.get("QTE RESTANT"))
    observation = texte_ou_vide(row.get("OBSERVATION"))

    mvt_entree = mouvements.entree(mouvements.magasin_siege)

    with transaction.atomic():
        categorie = (
            cache.obtenir("categorie", get_or_create_categorie) if cache else get_or_create_categorie()
        )
        article, cree = get_or_create_article(designation, categorie, Article.ModeSuivi.QUANTITE)
        DetailMouvement.objects.create(mouvement=mvt_entree, article=article, quantite=quantite)

    return {
        "article": article.code_article,
        "article_cree": cree,
        "designation": article.designation,
        "categorie": categorie.cat_libelle,
        "quantite": quantite,
        "observation": observation,
        "a_traiter": False,
        "avertissement": None,
        "attribue_a": None,
        "attribution": None,
    }


def _date_aware(date_import):
    date_import = date_import or timezone.localdate()
    if isinstance(date_import, pd.Timestamp):
        date_import = date_import.to_pydatetime()
    if isinstance(date_import, date) and not isinstance(date_import, datetime):
        return debut_de_journee(date_import)
    return timezone.make_aware(date_import) if timezone.is_naive(date_import) else date_import


def importer_fournitures(df, dry_run=True, lignes_confirmees=None, date_import=None, ligne_entete=0) -> dict:
    df = normaliser_colonnes(df)
    manquantes = colonnes_manquantes(df)
    rapport = {
        "dry_run": dry_run,
        "date_import": None,
        "colonnes_manquantes": manquantes,
        "lignes_ok": 0, "lignes_erreur": 0, "lignes_a_traiter": 0,
        "lignes_creees": 0, "lignes_maj": 0, "lignes_ignorees": 0,
        "count_total": 0,
        "mouvements": {"nb_entrees": 0, "entree_ids": []},
        "details": [],
    }
    if manquantes:
        rapport["lignes_erreur"] = len(df)
        rapport["details"].append({
            "ligne": ligne_entete + 2,
            "statut": "ERREUR",
            "message": f"Colonnes manquantes : {', '.join(manquantes)}",
        })
        return rapport

    date_import = _date_aware(date_import)
    rapport["date_import"] = date_import.date().isoformat()
    mouvements = MouvementsImport(
        f"Import fournitures {date_import:%Y-%m-%d}", date_import, trouver_magasin_siege()
    )
    cache = CacheReferentiels()

    with executer_avec_dry_run(dry_run):
        for idx, row in df.iterrows():
            ligne_no = idx + ligne_entete + 2
            if all(est_non_applicable(row.get(colonne)) for colonne in COLONNES_ATTENDUES):
                rapport["lignes_ignorees"] += 1
                rapport["details"].append({
                    "ligne": ligne_no, "statut": "IGNORÉ", "designation": "",
                    "categorie": "", "quantite": None, "observation": "",
                })
                continue
            try:
                resultat = _traiter_ligne(row, mouvements, cache)
            except Exception as exc:  # noqa: BLE001 - erreur rapportée ligne par ligne
                cache.vider()
                rapport["lignes_erreur"] += 1
                rapport["details"].append({
                    "ligne": ligne_no, "statut": "ERREUR",
                    "designation": texte_ou_vide(row.get("ARTICLES")),
                    "categorie": "",
                    "quantite": None if est_non_applicable(row.get("QTE RESTANT")) else str(row.get("QTE RESTANT")),
                    "observation": texte_ou_vide(row.get("OBSERVATION")),
                    "message": str(exc),
                })
                continue

            rapport["lignes_ok"] += 1
            rapport["lignes_creees" if resultat["article_cree"] else "lignes_maj"] += 1
            rapport["details"].append({"ligne": ligne_no, "statut": "OK", **resultat})

        restants = mouvements.finaliser()
        rapport["mouvements"] = {
            "nb_entrees": len(restants["entree_ids"]),
            "entree_ids": [] if dry_run else restants["entree_ids"],
        }
        rapport["count_total"] = rapport["lignes_ok"]

    return rapport
