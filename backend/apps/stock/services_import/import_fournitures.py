import random
import re
import unicodedata
from datetime import date, datetime, time
from decimal import Decimal, InvalidOperation

import pandas as pd  # type: ignore
from django.db import transaction  # type: ignore
from django.utils import timezone  # type: ignore

from apps.catalogue.models import Article, Categorie
from apps.stock.models import (
    DetailMouvement,
    Magasin,
    Mouvement,
)

VALEURS_NON_APPLICABLE = {"non applicable", "n/a", "na", "", "none", "nan"}

COLONNES_ATTENDUES = [
    "ARTICLES",
    "QTE RESTANT",
    "OBSERVATION",
]


class RollbackDryRun(Exception):
    pass


def slugify_code_article(designation: str) -> str:
    nfkd = unicodedata.normalize("NFKD", designation)
    ascii_str = nfkd.encode("ascii", "ignore").decode("ascii")
    mots = re.findall(r"[A-Za-z0-9]+", ascii_str.upper())
    base = "-".join(mots[:3]) or "ARTICLE"
    return base[:20]


def generer_code_article_unique(categorie=None) -> str:
    if categorie and getattr(categorie, 'cat_libelle', None):
        nettoye = re.sub(r"[^A-Z]", "", str(categorie.cat_libelle).upper())
        prefix = nettoye[:3] if nettoye else "ART"
    else:
        prefix = "ART"
    
    while True:
        random_suffix = random.randint(1000, 9999)
        code = f"{prefix}-{random_suffix}"
        if not Article.objects.filter(code_article=code).exists():
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


def get_or_create_categorie():
    categorie, _ = Categorie.objects.get_or_create(
        cat_libelle="FR",
        cat_description="Fourniture",
    )
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


def _trouver_magasin_siege():
    magasins = list(Magasin.objects.filter(localite__site_type="SIEGE"))
    if not magasins:
        raise ValueError(
            "Aucun magasin trouvé au Siège. "
            "Créez-en un avant de lancer l'import."
        )
    if len(magasins) > 1:
        noms = ", ".join(m.magasin_nom for m in magasins)
        raise ValueError(
            "Plusieurs magasins existent au Siège, impossible de choisir "
            f"automatiquement celui à utiliser pour l'entrée : {noms}. "
            "Il ne doit en rester qu'un seul à cette localité pour que "
            "l'import puisse déterminer la destination des entrées."
        )
    return magasins[0]


def normaliser_texte(texte: str) -> str:
    if not texte:
        return ""

    nfkd_form = unicodedata.normalize('NFKD', str(texte))
    sans_accent = "".join([c for c in nfkd_form if not unicodedata.combining(c)])
    nettoye = re.sub(r'[^a-zA-Z0-9\s]', ' ', sans_accent)
    return " ".join(nettoye.split()).upper()


def detecter_index_entete(source, feuille=0, max_lignes_recherche=10) -> int:
    if hasattr(source, "seek"):
        source.seek(0)

    brut = pd.read_excel(
        source, sheet_name=feuille, header=None, nrows=max_lignes_recherche
    )

    attendues_normalisees = {c.strip().upper() for c in COLONNES_ATTENDUES}

    meilleur_index = 0
    meilleur_score = 0
    for idx, row in brut.iterrows():
        valeurs = {str(v).strip().upper() for v in row.tolist() if not pd.isna(v)}
        score = len(valeurs & attendues_normalisees)
        if score > meilleur_score:
            meilleur_score = score
            meilleur_index = idx

    if hasattr(source, "seek"):
        source.seek(0)

    return meilleur_index if meilleur_score >= 3 else 0

def detecter_date_import(source, feuille=0, ligne_entete=0):
    if hasattr(source, "seek"):
        source.seek(0)

    brut = pd.read_excel(
        source, sheet_name=feuille, header=None, nrows=ligne_entete
    )

    date_trouvee = None
    for _, row in brut.iterrows():
        for valeur in row.tolist():
            if pd.isna(valeur):
                continue
            if isinstance(valeur, (pd.Timestamp, datetime, date)):
                date_trouvee = valeur.date() if hasattr(valeur, "date") else valeur
                break

            correspondance = re.search(
                r"\bDATE\b\s*[:\-]?\s*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})",
                str(valeur),
                flags=re.IGNORECASE,
            )
            if correspondance:
                date_parsee = pd.to_datetime(
                    correspondance.group(1), dayfirst=True, errors="coerce"
                )
                if not pd.isna(date_parsee):
                    date_trouvee = date_parsee.date()
                    break
        if date_trouvee is not None:
            break

    if hasattr(source, "seek"):
        source.seek(0)

    return date_trouvee


def normaliser_colonnes(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    colonnes = [str(c).strip().upper() for c in df.columns]
    df.columns = [
        "ARTICLES" if colonne == "ARTICLE" else colonne
        for colonne in colonnes
    ]
    return df


def colonnes_manquantes(df: pd.DataFrame):
    presentes = {str(colonne).strip().upper() for colonne in df.columns}
    return [c for c in COLONNES_ATTENDUES if c not in presentes]


class MouvementsImport:
    def __init__(self, origine, date, magasin_siege):
        self.origine = origine
        self.date = date
        self.magasin_siege = magasin_siege
        self._entrees = {}

    def entree(self, magasin):
        mvt = self._entrees.get(magasin.pk)
        if mvt is None:
            mvt = Mouvement(
                date=self.date,
                type_mouvement=Mouvement.Type.ENTREE,
                origine=self.origine,
                magasin_destination=magasin,
            )
            mvt.full_clean(exclude=["magasin_source"])
            mvt.save()
            self._entrees[magasin.pk] = mvt
        return mvt

    def finaliser(self):
        entrees_utilisees = []
        for mouvement in self._entrees.values():
            if mouvement.details.exists():
                entrees_utilisees.append(mouvement.mouvement_id)
            else:
                mouvement.delete()
        return {
            "entree_ids": entrees_utilisees,
        }


def _traiter_ligne(row, mouvements):
    designation = (
        "" if est_non_applicable(row.get("ARTICLES"))
        else str(row.get("ARTICLES")).strip()
    )
    if not designation:
        raise ValueError("Colonne 'ARTICLES' vide")

    valeur_quantite = row.get("QTE RESTANT")
    if est_non_applicable(valeur_quantite):
        quantite = 0
    else:
        try:
            quantite_decimal = Decimal(str(valeur_quantite).replace(",", "."))
        except (InvalidOperation, ValueError) as exc:
            raise ValueError("La quantité doit être un nombre entier positif ou nul.") from exc
        if (
            not quantite_decimal.is_finite()
            or quantite_decimal < 0
            or quantite_decimal != quantite_decimal.to_integral_value()
        ):
            raise ValueError("La quantité doit être un nombre entier positif ou nul.")
        quantite = int(quantite_decimal)

    observation = (
        "" if est_non_applicable(row.get("OBSERVATION"))
        else str(row.get("OBSERVATION")).strip()
    )

    magasin_destination = mouvements.magasin_siege
    mvt_entree = mouvements.entree(magasin_destination)

    with transaction.atomic():
        categorie = get_or_create_categorie()
        article, cree = get_or_create_article(
            designation, categorie, Article.ModeSuivi.QUANTITE
        )

        DetailMouvement.objects.create(
            mouvement=mvt_entree,
            article=article,
            quantite=quantite,
        )

        resultat = {
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
        
    return resultat


def importer_fournitures(
    df: pd.DataFrame,
    dry_run: bool = True,
    lignes_confirmees=None,
    date_import=None,
    ligne_entete=0,
) -> dict:
    df = normaliser_colonnes(df)
    manquantes = colonnes_manquantes(df)

    rapport = {
        "dry_run": dry_run,
        "date_import": None,
        "colonnes_manquantes": manquantes,
        "lignes_ok": 0,
        "lignes_erreur": 0,
        "lignes_a_traiter": 0,
        "lignes_creees": 0,
        "lignes_maj": 0,
        "lignes_ignorees": 0,
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

    date_import = date_import or timezone.localdate()
    if isinstance(date_import, date) and not isinstance(date_import, datetime):
        date_import = timezone.make_aware(
            datetime.combine(date_import, time.min)
        )
    elif isinstance(date_import, pd.Timestamp):
        date_import = date_import.to_pydatetime()
    if timezone.is_naive(date_import):
        date_import = timezone.make_aware(date_import)
    rapport["date_import"] = date_import.date().isoformat()

    origine_import = f"Import fournitures {date_import:%Y-%m-%d}"
    magasin_siege = _trouver_magasin_siege()
    mouvements = MouvementsImport(origine_import, date_import, magasin_siege)

    try:
        with transaction.atomic():
            for idx, row in df.iterrows():
                ligne_no = idx + ligne_entete + 2
                if all(est_non_applicable(row.get(colonne)) for colonne in COLONNES_ATTENDUES):
                    rapport["lignes_ignorees"] += 1
                    rapport["details"].append({
                        "ligne": ligne_no,
                        "statut": "IGNORÉ",
                        "designation": "",
                        "categorie": "",
                        "quantite": None,
                        "observation": "",
                    })
                    continue

                try:
                    resultat = _traiter_ligne(row, mouvements)
                    if resultat.get("a_traiter"):
                        rapport["lignes_a_traiter"] += 1
                        rapport["details"].append(
                            {"ligne": ligne_no, "statut": "A_TRAITER", **resultat}
                        )
                    else:
                        rapport["lignes_ok"] += 1
                        if resultat["article_cree"]:
                            rapport["lignes_creees"] += 1
                        else:
                            rapport["lignes_maj"] += 1
                        rapport["details"].append(
                            {"ligne": ligne_no, "statut": "OK", **resultat}
                        )
                except Exception as exc:  # noqa: BLE001
                    rapport["lignes_erreur"] += 1
                    rapport["details"].append(
                        {
                            "ligne": ligne_no,
                            "statut": "ERREUR",
                            "designation": str(row.get("ARTICLES") or ""),
                            "categorie": "",
                            "quantite": row.get("QTE RESTANT"),
                            "observation": str(row.get("OBSERVATION") or ""),
                            "message": str(exc),
                        }
                    )

            restants = mouvements.finaliser()
            rapport["mouvements"] = {
                "nb_entrees": len(restants["entree_ids"]),
                "entree_ids": [] if dry_run else restants["entree_ids"],
            }
            rapport["count_total"] = rapport["lignes_ok"]

            if dry_run:
                raise RollbackDryRun()
    except RollbackDryRun:
        pass

    return rapport