import pandas as pd
from django.db import transaction
from django.utils import timezone

from apps.catalogue.models import Article, Categorie, Fournisseur
from apps.common.imports import detecter_index_entete as _detecter_index_entete
from apps.common.imports import (
    executer_avec_dry_run,
    generer_code_article_unique,
    normaliser_texte,
    texte_ou_vide,
    trouver_magasin_siege,
)
from apps.employee.models import Direction, Employer, Site
from apps.stock.models import Affectation, DetailMouvement, Magasin, Salle, UniteArticle

from .mouvements_import import CacheReferentiels, MouvementsImport

COLONNES_ATTENDUES = ["Date D'acquisition", "nature", "famille", "Agence", "Affectation", "Fournisseur"]
TYPES_ATTRIBUES = {"SALLE": "Salle", "DIRECTION": "Direction", "SITE": "Agence", "EMPLOYE": "Employé"}


def detecter_index_entete(source, feuille=0, max_lignes_recherche=10) -> int:
    return _detecter_index_entete(source, COLONNES_ATTENDUES, feuille, max_lignes_recherche)


def normaliser_colonnes(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [str(c).strip() for c in df.columns]
    return df


def colonnes_manquantes(df: pd.DataFrame):
    return [c for c in COLONNES_ATTENDUES if c not in df.columns]


class ResolveurAffectation:
    def __init__(self):
        self.magasins = [(normaliser_texte(m.magasin_nom), m) for m in Magasin.objects.order_by("pk")]
        self.salles = [(normaliser_texte(s.nom), s) for s in Salle.objects.select_related("localite").order_by("pk")]
        self.directions = [
            (normaliser_texte(d.dir_libelle), normaliser_texte(d.dir_description), d)
            for d in Direction.objects.order_by("pk")
        ]
        self.sites = [(normaliser_texte(s.site_nom), s) for s in Site.objects.order_by("pk")]
        self.employes = [
            (normaliser_texte(e.emp_nom), e)
            for e in Employer.objects.only("emp_id", "emp_nom").order_by("pk")
        ]
        self._cache = {}

    def resoudre(self, texte):
        texte = texte_ou_vide(texte)
        if not texte:
            return None, None
        cle = normaliser_texte(texte)
        if cle not in self._cache:
            self._cache[cle] = self._chercher(cle)
        return self._cache[cle]

    def _chercher(self, t):
        for nom, magasin in self.magasins:
            if nom == t or t in nom:
                return "MAGASIN", magasin
        for nom, salle in self.salles:
            if nom == t or t in nom:
                return "SALLE", salle
        for libelle, description, direction in self.directions:
            if t in (libelle, description) or t in description:
                return "DIRECTION", direction
        for nom, site in self.sites:
            if nom == t or t in nom or nom in t:
                return "SITE", site
        for nom, employe in self.employes:
            if nom == t or t in nom:
                return "EMPLOYE", employe
        return None, None


def get_or_create_categorie(famille):
    famille = (texte_ou_vide(famille) or "DIVERS")[:20]
    categorie, _ = Categorie.objects.get_or_create(
        cat_libelle=famille,
        defaults={"cat_description": f"Créée automatiquement à l'import ({famille})"},
    )
    return categorie


def get_or_create_fournisseur(nom):
    nom = texte_ou_vide(nom)
    if not nom:
        return None
    fournisseur, _ = Fournisseur.objects.get_or_create(nom__iexact=nom, defaults={"nom": nom[:50], "email": ""})
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


def _traiter_ligne(row, ligne_no, lignes_confirmees, mouvements, resolveur, cache):
    nature = texte_ou_vide(row.get("nature"))
    if not nature:
        raise ValueError("Colonne 'nature' vide")

    affectation_texte = texte_ou_vide(row.get("Affectation")) or None
    type_match, entite = resolveur.resoudre(affectation_texte) if affectation_texte else (None, None)

    if affectation_texte and (type_match is None or ligne_no not in lignes_confirmees):
        existant = Article.objects.filter(designation__iexact=nature).only("code_article").first()
        return {
            "article": existant.code_article if existant else None,
            "article_cree": False,
            "designation": nature,
            "a_traiter": True,
            "affectation_texte": affectation_texte,
            "suggestion": {"type": type_match, "libelle": str(entite)} if type_match else None,
            "avertissement": None,
            "attribue_a": None,
            "attribution": None,
        }

    magasin = entite if type_match == "MAGASIN" else mouvements.magasin_siege
    attribue = type_match in TYPES_ATTRIBUES
    mvt_entree = mouvements.entree(magasin)
    mvt_sortie = mouvements.sortie() if attribue else None

    with transaction.atomic():
        famille = texte_ou_vide(row.get("famille"))
        categorie = cache.obtenir(("categorie", famille.lower()), lambda: get_or_create_categorie(famille))
        article, cree = get_or_create_article(nature, categorie, Article.ModeSuivi.QUANTITE)
        nom_fournisseur = texte_ou_vide(row.get("Fournisseur"))
        fournisseur = cache.obtenir(
            ("fournisseur", nom_fournisseur.lower()), lambda: get_or_create_fournisseur(nom_fournisseur)
        )

        detail_entree = DetailMouvement.objects.create(
            mouvement=mvt_entree, article=article, quantite=1, fournisseur=fournisseur,
        )
        unite = UniteArticle.objects.create(
            article=article, statut=UniteArticle.Statut.EN_STOCK, mouvement_entree=detail_entree,
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
                mouvement=mvt_sortie, article=article, quantite=1,
                affectation=Affectation.resoudre(entite),
            )
            unite.attribuer(beneficiaire=entite, mouvement_sortie=detail_sortie)
            resultat["attribue_a"] = f"{TYPES_ATTRIBUES[type_match]} : {entite}"
            resultat["attribution"] = {"type": type_match, "libelle": str(entite)}

    return resultat


def importer_immobilisations(df, dry_run=True, lignes_confirmees=None) -> dict:
    df = normaliser_colonnes(df)
    lignes_confirmees = lignes_confirmees or set()
    rapport = {
        "dry_run": dry_run,
        "colonnes_manquantes": colonnes_manquantes(df),
        "lignes_ok": 0, "lignes_erreur": 0, "lignes_a_traiter": 0,
        "mouvements": {"nb_entrees": 0, "nb_sorties": 0, "entree_ids": [], "sortie_id": None},
        "details": [],
    }

    maintenant = timezone.now()
    mouvements = MouvementsImport(f"Import immobilisations {maintenant:%Y-%m-%d}", maintenant, trouver_magasin_siege())
    resolveur = ResolveurAffectation()
    cache = CacheReferentiels()

    with executer_avec_dry_run(dry_run):
        for idx, row in df.iterrows():
            ligne_no = idx + 2
            try:
                resultat = _traiter_ligne(row, ligne_no, lignes_confirmees, mouvements, resolveur, cache)
            except Exception as exc:  # noqa: BLE001 - erreur rapportée ligne par ligne
                cache.vider()
                rapport["lignes_erreur"] += 1
                rapport["details"].append({"ligne": ligne_no, "statut": "ERREUR", "message": str(exc)})
                continue
            if resultat["a_traiter"]:
                rapport["lignes_a_traiter"] += 1
                rapport["details"].append({"ligne": ligne_no, "statut": "A_TRAITER", **resultat})
            else:
                rapport["lignes_ok"] += 1
                rapport["details"].append({"ligne": ligne_no, "statut": "OK", **resultat})

        restants = mouvements.finaliser()
        rapport["mouvements"] = {
            "nb_entrees": len(restants["entree_ids"]),
            "nb_sorties": 1 if restants["sortie_id"] else 0,
            "entree_ids": [] if dry_run else restants["entree_ids"],
            "sortie_id": None if dry_run else restants["sortie_id"],
        }
    return rapport
