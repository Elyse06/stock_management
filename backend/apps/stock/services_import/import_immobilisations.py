import re
import unicodedata
from datetime import datetime

import pandas as pd  # type: ignore
from django.db import transaction
from django.utils import timezone

from apps.catalogue.models import Article, Categorie, Fournisseur
from apps.employee.models import Direction, Employer, Site
from apps.stock.models import DetailMouvement, Magasin, Mouvement, UniteArticle

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


def _generer_emp_id_unique(matricule_str: str) -> str:
    base = re.sub(r"[^A-Za-z0-9]", "", matricule_str)[-5:].upper() or "EMP"
    candidat = f"E{base}"[:6]
    suffixe = 0
    while Employer.objects.filter(emp_id=candidat).exists():
        suffixe += 1
        candidat = f"E{base[:5 - len(str(suffixe))]}{suffixe}"[:6]
    return candidat


def resoudre_ou_creer_employe(matricule):
    """Résout l'employé UNIQUEMENT à partir du matricule.

    - Si le matricule correspond à un employé déjà en base, c'est cet employé
      (avec son nom déjà enregistré) qui est utilisé — jamais le texte de la
      colonne 'Détenteur' du fichier Excel.
    - Si le matricule ne correspond à aucun employé, un nouvel employé est créé
      avec un nom générique à compléter ; le texte 'Détenteur' n'est pas non
      plus utilisé pour ce nom.
    """
    if est_non_applicable(matricule):
        return None, False

    matricule_str = str(matricule).strip().removesuffix(".0")

    employe = Employer.objects.filter(emp_matricule=matricule_str).first()
    if employe:
        return employe, False

    employe = Employer.objects.create(
        emp_id=_generer_emp_id_unique(matricule_str),
        emp_nom=f"Employé matricule {matricule_str} (nom à compléter)"[:255],
        emp_matricule=matricule_str,
        emp_contact="",
        emp_fonction="",
    )
    return employe, True


def _generer_dir_id_unique(libelle: str) -> str:
    base = re.sub(r"[^A-Za-z0-9]", "", libelle).upper()[:6] or "DIR"
    candidat = base[:8]
    suffixe = 0
    while Direction.objects.filter(pk=candidat).exists():
        suffixe += 1
        candidat = f"{base[:8 - len(str(suffixe))]}{suffixe}"[:8]
    return candidat


def _creer_direction(libelle: str) -> Direction:
    libelle_str = str(libelle).strip()
    return Direction.objects.create(
        dir_id=_generer_dir_id_unique(libelle_str),
        dir_libelle=libelle_str[:50],
        dir_description="Créée automatiquement à l'import",
    )


def _resoudre_direction(detenteur_texte, ligne_no, resolutions_direction):
    """Détermine la direction à utiliser pour une ligne donnée.

    - Si l'utilisateur a explicitement choisi une direction existante pour
      cette ligne (reçu depuis le front au moment de la confirmation), on
      l'utilise telle quelle.
    - Sinon — qu'il n'y ait eu aucune correspondance automatique, ou qu'une
      correspondance ait été trouvée mais pas confirmée par l'utilisateur —
      on crée systématiquement une nouvelle direction avec le texte brut du
      'Détenteur'. Aucune tentative de réutilisation silencieuse d'une
      direction existante n'est faite ici : sans confirmation explicite, une
      nouvelle entrée est créée.
    """
    direction_id_choisi = (resolutions_direction or {}).get(ligne_no)
    if direction_id_choisi:
        direction = Direction.objects.filter(pk=direction_id_choisi).first()
        if direction:
            return direction, False

    return _creer_direction(detenteur_texte), True


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


def _traiter_ligne(row, origine_import, ligne_no, resolutions_direction):
    nature = "" if est_non_applicable(row.get("Nature")) else str(row.get("Nature")).strip()
    if not nature:
        raise ValueError("Colonne 'Nature' vide")

    categorie = get_or_create_categorie(row.get("Code famille"))
    article, cree = get_or_create_article(nature, categorie, Article.ModeSuivi.QUANTITE)

    fournisseur = get_or_create_fournisseur(row.get("Fournisseur"))
    site = get_or_create_site(row.get("Agence") or row.get("Code agence"))
    magasin = get_or_create_magasin(site)
    date_acquisition = parse_date(row.get("Date D'acquisition"))

    # --- Entrée en stock (obligatoire pour chaque ligne) ---
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
        statut=UniteArticle.Statut.EN_STOCK,
        mouvement_entree=detail_entree,
    )

    resultat = {
        "article": article.code_article,
        "article_cree": cree,
        "designation": nature,
        "avertissement": None,
        "attribue_a": None,
        "attribution": None,
    }

    # --- Résolution du bénéficiaire : employé (matricule) ou direction (détenteur) ---
    employe, employe_cree = resoudre_ou_creer_employe(row.get("N° Matricule"))

    direction = None
    direction_cree = False
    detenteur_texte = None
    direction_suggeree = None

    if not employe:
        detenteur = row.get("Détenteur")
        if not est_non_applicable(detenteur):
            detenteur_texte = str(detenteur).strip()
            # Recherche purement informative (ne crée/modifie rien) : sert à
            # proposer une correspondance que l'utilisateur devra confirmer.
            direction_suggeree = Direction.objects.filter(
                dir_libelle__iexact=detenteur_texte
            ).first()
            direction, direction_cree = _resoudre_direction(
                detenteur_texte, ligne_no, resolutions_direction
            )

    if employe or direction:
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
            direction_beneficiaire=direction,
        )
        unite.attribuer(beneficiaire=employe or direction, mouvement_sortie=detail_sortie)

        if employe:
            resultat["attribue_a"] = f"{employe.emp_nom} ({employe.emp_matricule})"
            resultat["attribution"] = {"type": "EMPLOYE"}
            if employe_cree:
                resultat["avertissement"] = (
                    f"Employé '{employe.emp_matricule}' créé automatiquement (nom à vérifier/compléter)"
                )
        else:
            resultat["attribue_a"] = (
                f"Direction (nouvelle) : {direction.dir_libelle}"
                if direction_cree
                else f"Direction : {direction.dir_libelle}"
            )
            resultat["attribution"] = {
                "type": "DIRECTION",
                "detenteur_texte": detenteur_texte,
                "direction_suggeree_id": direction_suggeree.pk if direction_suggeree else None,
                "direction_suggeree_libelle": direction_suggeree.dir_libelle if direction_suggeree else None,
                "necessite_confirmation": direction_suggeree is not None,
                "direction_utilisee_id": direction.pk,
                "direction_utilisee_libelle": direction.dir_libelle,
                "direction_creee": direction_cree,
            }

    return resultat


def importer_immobilisations(df: pd.DataFrame, dry_run: bool = True, resolutions_direction=None) -> dict:
    """
    resolutions_direction : dict optionnel {ligne_excel (int): dir_id (str)}.
    Envoyé par le front au moment de la confirmation, pour indiquer quelle
    direction existante utiliser pour telle ligne (correspondance auto
    confirmée, ou choix manuel différent). Une ligne absente de ce dict —
    ou dont la valeur est vide — entraîne la création automatique d'une
    nouvelle direction à partir du texte 'Détenteur'.
    """
    df = normaliser_colonnes(df)
    manquantes = colonnes_manquantes(df)
    resolutions_direction = resolutions_direction or {}

    rapport = {
        "dry_run": dry_run,
        "colonnes_manquantes": manquantes,
        "lignes_ok": 0,
        "lignes_erreur": 0,
        "directions_disponibles": [
            {"id": d["dir_id"], "libelle": d["dir_libelle"]}
            for d in Direction.objects.order_by("dir_libelle").values("dir_id", "dir_libelle")
        ],
        "details": [],
    }

    origine_import = f"Import immobilisations {timezone.now():%Y-%m-%d}"

    try:
        with transaction.atomic():
            for idx, row in df.iterrows():
                ligne_no = idx + 2
                try:
                    resultat = _traiter_ligne(row, origine_import, ligne_no, resolutions_direction)
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