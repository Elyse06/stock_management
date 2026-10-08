import random
import re
import unicodedata

import pandas as pd  # type: ignore
from django.db import transaction  # type: ignore
from django.utils import timezone  # type: ignore

from apps.catalogue.models import Article, Categorie, Fournisseur
from apps.employee.models import Direction, Employer, Site
from apps.stock.models import (
    Affectation,
    DetailMouvement,
    Magasin,
    Mouvement,
    Salle,
    UniteArticle,
)

VALEURS_NON_APPLICABLE = {"non applicable", "n/a", "na", "", "none", "nan"}

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
    designation = designation.strip()
    article = Article.objects.filter(designation__iexact=designation).first()
    if article:
        return article, False
    article = Article.objects.create(
        code_article=generer_code_article_unique(categorie),
        designation=designation[:50],
        categorie=categorie,
        mode_suivi=mode_suivi,
        is_immobilisation=True,
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


def resoudre_affectation(affectation_texte):
    if not affectation_texte or est_non_applicable(affectation_texte):
        return None, None

    texte_brut = str(affectation_texte).strip()
    texte_norm = normaliser_texte(texte_brut)

    for magasin in Magasin.objects.all():
        if normaliser_texte(magasin.magasin_nom) == texte_norm or texte_norm in normaliser_texte(magasin.magasin_nom):
            return "MAGASIN", magasin

    for salle in Salle.objects.all():
        if normaliser_texte(salle.nom) == texte_norm or texte_norm in normaliser_texte(salle.nom):
            return "SALLE", salle

    for direction in Direction.objects.all():
        if (normaliser_texte(direction.dir_libelle) == texte_norm or 
            normaliser_texte(direction.dir_description) == texte_norm or 
            texte_norm in normaliser_texte(direction.dir_description)):
            return "DIRECTION", direction

    for site in Site.objects.all():
        site_nom_norm = normaliser_texte(site.site_nom)
        if (site_nom_norm == texte_norm or 
            texte_norm in site_nom_norm or 
            site_nom_norm in texte_norm):
            return "SITE", site

    for employe in Employer.objects.all():
        if normaliser_texte(employe.emp_nom) == texte_norm or texte_norm in normaliser_texte(employe.emp_nom):
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


class MouvementsImport:
    """Regroupe tout l'import en UN mouvement d'ENTRÉE (au magasin du Siège) et
    UN mouvement de SORTIE (depuis le Siège), dont chaque ligne du fichier
    n'est qu'un DetailMouvement.

    Un Mouvement n'ayant qu'un seul magasin_destination, les rares lignes dont
    l'Affectation correspond à un Magasin précis ne peuvent pas partager le
    mouvement d'entrée du Siège : elles obtiennent un mouvement d'entrée par
    magasin concerné (en pratique, un seul mouvement d'entrée dans la
    grande majorité des imports).

    Les mouvements sont créés à la demande, AVANT le savepoint de la ligne
    qui les utilise : une ligne en erreur ne doit pas annuler la création
    d'un mouvement partagé par les lignes suivantes.
    """

    def __init__(self, origine, date, magasin_siege):
        self.origine = origine
        self.date = date
        self.magasin_siege = magasin_siege
        self._entrees = {}  # magasin_id -> Mouvement
        self._sortie = None

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

    def sortie(self):
        if self._sortie is None:
            mvt = Mouvement(
                date=self.date,
                type_mouvement=Mouvement.Type.SORTIE,
                origine=self.origine,
                magasin_source=self.magasin_siege,
            )
            mvt.full_clean(exclude=["magasin_destination"])
            mvt.save()
            self._sortie = mvt
        return self._sortie

    def finaliser(self):
        """Supprime les mouvements restés sans aucun détail (ex: toutes les
        lignes concernées étaient en erreur) et retourne ce qui subsiste."""
        candidats = list(self._entrees.values())
        if self._sortie is not None:
            candidats.append(self._sortie)
        vides = {m.pk for m in candidats if not m.details.exists()}
        if vides:
            Mouvement.objects.filter(pk__in=vides).delete()
        return {
            "entree_ids": [m.pk for m in self._entrees.values() if m.pk not in vides],
            "sortie_id": (
                self._sortie.pk
                if self._sortie is not None and self._sortie.pk not in vides
                else None
            ),
        }


def _traiter_ligne(row, ligne_no, lignes_confirmees, mouvements):
    # --- 1. Analyse (lecture seule : rien n'est écrit tant qu'on n'a pas décidé) ---
    nature = "" if est_non_applicable(row.get("nature")) else str(row.get("nature")).strip()
    if not nature:
        raise ValueError("Colonne 'nature' vide")

    affectation = row.get("Affectation")
    affectation_texte = None if est_non_applicable(affectation) else str(affectation).strip()

    type_match, entite_match = (None, None)
    if affectation_texte:
        type_match, entite_match = resoudre_affectation(affectation_texte)

    # Correspondance absente ou non confirmée : la ligne est mise de côté,
    # rien n'est écrit en base pour elle (pas même l'article).
    if affectation_texte and (type_match is None or ligne_no not in lignes_confirmees):
        existant = Article.objects.filter(designation__iexact=nature).first()
        return {
            "article": existant.code_article if existant else None,
            "article_cree": False,
            "designation": nature,
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

    # --- 2. Mouvements globaux (créés hors savepoint, voir MouvementsImport) ---
    magasin_destination = entite_match if type_match == "MAGASIN" else mouvements.magasin_siege
    attribue = type_match in ("SALLE", "DIRECTION", "SITE", "EMPLOYE")
    mvt_entree = mouvements.entree(magasin_destination)
    mvt_sortie = mouvements.sortie() if attribue else None

    # --- 3. Écriture de la ligne, isolée dans un savepoint : si elle échoue,
    # rien de ce qu'elle a déjà écrit ne subsiste (article, détails, unité...) ---
    with transaction.atomic():
        categorie = get_or_create_categorie(row.get("famille"))
        article, cree = get_or_create_article(nature, categorie, Article.ModeSuivi.QUANTITE)
        fournisseur = get_or_create_fournisseur(row.get("Fournisseur"))

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
            "article": article.code_article,
            "article_cree": cree,
            "designation": nature,
            "a_traiter": False,
            "avertissement": None,
            "attribue_a": None,
            "attribution": None,
        }

        if attribue:
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
    lignes_confirmees = lignes_confirmees or set()

    rapport = {
        "dry_run": dry_run,
        "colonnes_manquantes": manquantes,
        "lignes_ok": 0,
        "lignes_erreur": 0,
        "lignes_a_traiter": 0,
        "mouvements": {"nb_entrees": 0, "nb_sorties": 0, "entree_ids": [], "sortie_id": None},
        "details": [],
    }

    origine_import = f"Import immobilisations {timezone.now():%Y-%m-%d}"
    date_import = timezone.now()

    magasin_siege = _trouver_magasin_siege()
    mouvements = MouvementsImport(origine_import, date_import, magasin_siege)

    try:
        with transaction.atomic():
            for idx, row in df.iterrows():
                ligne_no = idx + 2
                try:
                    resultat = _traiter_ligne(row, ligne_no, lignes_confirmees, mouvements)
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

            restants = mouvements.finaliser()
            rapport["mouvements"] = {
                "nb_entrees": len(restants["entree_ids"]),
                "nb_sorties": 1 if restants["sortie_id"] else 0,
                # En aperçu, tout est annulé juste après : des identifiants
                # n'auraient aucun sens, on ne les renvoie qu'à l'import réel.
                "entree_ids": [] if dry_run else restants["entree_ids"],
                "sortie_id": None if dry_run else restants["sortie_id"],
            }

            if dry_run:
                raise RollbackDryRun()
    except RollbackDryRun:
        pass

    return rapport