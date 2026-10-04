import re
import unicodedata

import pandas as pd  # type: ignore
from django.db import transaction
from django.utils import timezone

from apps.catalogue.models import Article, Categorie, Fournisseur
from apps.employee.models import Direction, Employer, Site
from apps.stock.models import Affectation, DetailMouvement, Magasin, Mouvement, Salle, UniteArticle

VALEURS_NON_APPLICABLE = {"non applicable", "n/a", "na", "", "none", "nan"}

# Colonnes du fichier "Registre des inventaires". "Agence" est gardée dans
# cette liste uniquement pour aider à repérer la ligne d'en-tête (voir
# detecter_index_entete) : elle n'est plus utilisée pour déterminer un
# magasin d'entrée (voir _trouver_magasin_siege). Les colonnes comptables
# (AMT ...), "N IMMO", "mois", "Anneée", "reference immo", "Etat" et
# "N° fiche d'affectation" existent dans le fichier mais ne sont pas
# utilisées par cet import.
COLONNES_ATTENDUES = [
    "Date D'acquisition",
    "nature",
    "famille",
    "Agence",
    "Affectation",
    "Fournisseur",
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


def get_or_create_categorie(famille):
    famille = (str(famille).strip() if not est_non_applicable(famille) else "DIVERS")[:20]
    categorie, _ = Categorie.objects.get_or_create(
        cat_libelle=famille,
        defaults={"cat_description": f"Créée automatiquement à l'import ({famille})"},
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


def get_or_create_article(designation, categorie, mode_suivi):
    """Marque supprimée : l'article n'est plus rattaché à une marque."""
    designation = designation.strip()
    article = Article.objects.filter(designation__iexact=designation).first()
    if article:
        return article, False
    article = Article.objects.create(
        code_article=generer_code_article_unique(designation),
        designation=designation[:50],
        categorie=categorie,
        mode_suivi=mode_suivi,
        is_immobilisation=True,
    )
    return article, True


def _trouver_magasin_siege():
    """Le magasin du Siège est la destination par défaut de TOUTE entrée en
    stock (plus de magasin créé par Agence). Il est cherché par le type de
    site de sa localité (SIEGE), jamais créé par cet import : il doit déjà
    exister en base."""
    magasins = list(Magasin.objects.filter(localite__site_type="SIEGE"))
    if not magasins:
        raise ValueError(
            "Aucun magasin trouvé au Siège (site de type SIEGE). "
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


def resoudre_affectation(affectation_texte):
    """Cherche une correspondance pour le texte de la colonne 'Affectation',
    dans l'ordre : Magasin, Salle, Direction, Agence (Site), Employé. Ne crée
    rien : recherche en lecture seule, utilisée pour proposer une suggestion
    que l'utilisateur devra confirmer. Retourne (type, entité) ou (None, None).

    Magasin reste vérifié en premier (si l'objet est physiquement rangé dans
    un magasin précis déjà existant, pas de bénéficiaire : il reste en stock
    dans ce magasin). Aucune des entités cherchées ici (Magasin, Salle,
    Direction, Site, Employé) n'est jamais créée par cet import : les
    recherches en direct sur la base sont donc sûres (pas de risque
    d'auto-pollution d'une ligne à l'autre du même import).
    """
    magasin = Magasin.objects.filter(magasin_nom__iexact=affectation_texte).first()
    if magasin:
        return "MAGASIN", magasin

    salle = Salle.objects.filter(nom__iexact=affectation_texte).first()
    if salle:
        return "SALLE", salle

    direction = Direction.objects.filter(dir_libelle__iexact=affectation_texte).first()
    if direction:
        return "DIRECTION", direction

    site = Site.objects.filter(site_nom__iexact=affectation_texte).first()
    if site:
        return "SITE", site

    employe = Employer.objects.filter(emp_nom__iexact=affectation_texte).first()
    if employe:
        return "EMPLOYE", employe

    return None, None


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


def _traiter_ligne(row, origine_import, date_import, ligne_no, lignes_confirmees, magasin_siege):
    nature = "" if est_non_applicable(row.get("nature")) else str(row.get("nature")).strip()
    if not nature:
        raise ValueError("Colonne 'nature' vide")

    categorie = get_or_create_categorie(row.get("famille"))
    article, cree = get_or_create_article(nature, categorie, Article.ModeSuivi.QUANTITE)
    fournisseur = get_or_create_fournisseur(row.get("Fournisseur"))

    resultat_base = {
        "article": article.code_article,
        "article_cree": cree,
        "designation": nature,
    }

    # --- Résolution de l'affectation : Magasin / Salle / Direction / Site / Employé ---
    affectation = row.get("Affectation")
    affectation_texte = None if est_non_applicable(affectation) else str(affectation).strip()

    type_match, entite_match = (None, None)
    if affectation_texte:
        type_match, entite_match = resoudre_affectation(affectation_texte)

    # Toute correspondance doit être confirmée explicitement par l'utilisateur
    # avant d'être appliquée. Si l'affectation est renseignée mais qu'aucune
    # correspondance n'a été trouvée, OU qu'une correspondance existe mais n'a
    # pas été confirmée : la ligne est mise de côté, rien n'est écrit en base.
    if affectation_texte and (type_match is None or ligne_no not in lignes_confirmees):
        return {
            **resultat_base,
            "a_traiter": True,
            "affectation_texte": affectation_texte,
            "suggestion": (
                {"type": type_match, "libelle": str(entite_match)}
                if type_match else None
            ),
            "avertissement": None,
            "attribue_a": None,
            "attribution": None,
        }

    # --- Entrée en stock (toujours, sauf ligne mise de côté ci-dessus) ---
    # Par défaut, toute entrée se fait au magasin du Siège. Seule exception :
    # une correspondance Magasin confirmée, qui devient alors la destination
    # réelle (l'objet est rangé précisément là, pas au Siège).
    magasin_destination = entite_match if type_match == "MAGASIN" else magasin_siege

    mvt_entree = Mouvement(
        date=date_import,
        type_mouvement=Mouvement.Type.ENTREE,
        origine=origine_import,
        magasin_destination=magasin_destination,
    )
    mvt_entree.full_clean(exclude=["magasin_source"])
    mvt_entree.save()

    detail_entree = DetailMouvement.objects.create(
        mouvement=mvt_entree,
        article=article,
        quantite=1,
        fournisseur=fournisseur,
    )

    unite = UniteArticle.objects.create(
        article=article,
        statut=UniteArticle.Statut.EN_STOCK,
        mouvement_entree=detail_entree,
    )

    resultat = {
        **resultat_base,
        "a_traiter": False,
        "avertissement": None,
        "attribue_a": None,
        "attribution": None,
    }

    # --- Attribution (sortie), pour Salle / Direction / Site / Employé ---
    # La sortie part toujours du magasin du Siège (c'est là que tout entre
    # par défaut) : jamais du magasin spécifique d'un cas MAGASIN, puisque ce
    # cas-là ne produit justement aucune sortie.
    if type_match in ("SALLE", "DIRECTION", "SITE", "EMPLOYE"):
        mvt_sortie = Mouvement(
            date=date_import,
            type_mouvement=Mouvement.Type.SORTIE,
            origine=origine_import,
            magasin_source=magasin_siege,
        )
        mvt_sortie.full_clean(exclude=["magasin_destination"])
        mvt_sortie.save()

        detail_sortie = DetailMouvement.objects.create(
            mouvement=mvt_sortie,
            article=article,
            quantite=1,
            affectation=Affectation.resoudre(entite_match),
        )
        unite.attribuer(beneficiaire=entite_match, mouvement_sortie=detail_sortie)

        libelle_type = {
            "SALLE": "Salle", "DIRECTION": "Direction", "SITE": "Agence", "EMPLOYE": "Employé",
        }[type_match]
        resultat["attribue_a"] = f"{libelle_type} : {entite_match}"
        resultat["attribution"] = {"type": type_match, "libelle": str(entite_match)}

    return resultat


def importer_immobilisations(df: pd.DataFrame, dry_run: bool = True, lignes_confirmees=None) -> dict:
    df = normaliser_colonnes(df)
    manquantes = colonnes_manquantes(df)
    lignes_confirmees = lignes_confirmees or {}

    rapport = {
        "dry_run": dry_run,
        "colonnes_manquantes": manquantes,
        "lignes_ok": 0,
        "lignes_erreur": 0,
        "lignes_a_traiter": 0,
        "details": [],
    }

    origine_import = f"Import immobilisations {timezone.now():%Y-%m-%d}"
    date_import = timezone.now()

    # Peut lever ValueError si le magasin du Siège est introuvable ou
    # ambigu : la vue est responsable d'attraper cette exception et de la
    # transformer en réponse HTTP propre (ce n'est pas une erreur par ligne,
    # mais un prérequis manquant pour tout l'import).
    magasin_siege = _trouver_magasin_siege()

    try:
        with transaction.atomic():
            for idx, row in df.iterrows():
                ligne_no = idx + 2
                try:
                    resultat = _traiter_ligne(
                        row, origine_import, date_import, ligne_no, lignes_confirmees,
                        magasin_siege,
                    )
                    if resultat.get("a_traiter"):
                        rapport["lignes_a_traiter"] += 1
                        rapport["details"].append(
                            {"ligne": ligne_no, "statut": "A_TRAITER", **resultat}
                        )
                    else:
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