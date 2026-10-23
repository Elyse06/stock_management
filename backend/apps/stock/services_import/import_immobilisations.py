"""Import du fichier Excel « Suivi des immobilisations ».

Une ligne = une unité d'immobilisation, toujours entrée au magasin du siège.
- Affectation « Siège » (ou vide) : l'unité reste en stock au siège.
- Sinon (salle, direction, agence, employé) : si la correspondance est
  CONFIRMÉE, sortie vers ce bénéficiaire ; sinon la ligne est mise de côté.

Chaque ligne crée une unité ; les lignes d'un même article sont regroupées, où qu'elles soient dans le
fichier : un détail d'ENTRÉE par article et par fournisseur, un détail de SORTIE par article et par
bénéficiaire (quantité = nombre de lignes du groupe).
"""
import pandas as pd
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from apps.catalogue.models import Article, Categorie, Fournisseur
from apps.catalogue.services.codes_categorie import code_categorie_disponible
from apps.common.imports import detecter_index_entete as _detecter_index_entete
from apps.common.imports import (
    executer_avec_dry_run,
    generer_code_article_unique,
    normaliser_texte,
    texte_ou_vide,
    trouver_magasin_siege,
)
from apps.employee.models import Direction, Employer, Site
from apps.stock.models import Affectation, DetailMouvement, Salle, UniteArticle

from .mouvements_import import CacheReferentiels, MouvementsImport

COLONNES_ATTENDUES = ["Date D'acquisition", "nature", "famille", "Agence", "Affectation", "Fournisseur"]
TYPES_ATTRIBUES = {"SALLE": "Salle", "DIRECTION": "Direction", "SITE": "Agence", "EMPLOYE": "Employé"}
# Nom affiché du bénéficiaire (str() d'un site ajoute son type : « Agence - Agence Toamasina »).
NOMS = {"SALLE": "nom", "DIRECTION": "dir_libelle", "SITE": "site_nom", "EMPLOYE": "emp_nom"}


def nom_beneficiaire(type_match, entite):
    return getattr(entite, NOMS.get(type_match, ""), None) or str(entite)


def detecter_index_entete(source, feuille=0, max_lignes_recherche=10) -> int:
    return _detecter_index_entete(source, COLONNES_ATTENDUES, feuille, max_lignes_recherche)


def normaliser_colonnes(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [str(c).strip() for c in df.columns]
    return df


def colonnes_manquantes(df: pd.DataFrame):
    return [c for c in COLONNES_ATTENDUES if c not in df.columns]


SIEGE = "SIEGE"


class ResolveurAffectation:
    """Interprète le texte « Affectation » du fichier.

    1. D'abord : le Siège (« Siège », « SIEGE SOCIAL », ou le nom d'un site de
       type Siège) -> ``("SIEGE", None)`` : ENTRÉE au magasin du siège, sans sortie.
    2. Sinon : un bénéficiaire -> salle, direction, site de type AGENCE ou employé
       (attribution, à confirmer). Le Siège n'est jamais une cible d'attribution.

    Les entités sont chargées et normalisées UNE fois par import.
    """

    def __init__(self):
        sites = list(Site.objects.order_by("pk"))
        self.noms_siege = {normaliser_texte(s.site_nom) for s in sites if s.site_type == "SIEGE"}
        self.salles = [(normaliser_texte(s.nom), s) for s in Salle.objects.select_related("localite").order_by("pk")]
        self.directions = [
            (normaliser_texte(d.dir_libelle), normaliser_texte(d.dir_description), d)
            for d in Direction.objects.order_by("pk")
        ]
        self.agences = [(normaliser_texte(s.site_nom), s) for s in sites if s.site_type == "AGENCE"]
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
            self._cache[cle] = (SIEGE, None) if self.est_siege(cle) else self._chercher(cle)
        return self._cache[cle]

    def est_siege(self, cle):
        return cle.split(" ", 1)[0] == SIEGE or cle in self.noms_siege

    def _chercher(self, t):
        for nom, salle in self.salles:
            if nom == t or t in nom:
                return "SALLE", salle
        for libelle, description, direction in self.directions:
            if t in (libelle, description) or t in description:
                return "DIRECTION", direction
        for nom, site in self.agences:
            if nom == t or t in nom or nom in t:
                return "SITE", site
        for nom, employe in self.employes:
            if nom == t or t in nom:
                return "EMPLOYE", employe
        return None, None


def get_or_create_categorie(famille):
    """Catégorie d'une famille : code abrégé en libellé, famille complète en description.

    La famille (description) identifie la catégorie : « Meuble du bureau » est
    retrouvée quelle que soit la casse et réutilise son code « MB ».
    """
    famille = " ".join((texte_ou_vide(famille) or "DIVERS").split())
    existante = Categorie.objects.filter(cat_description__iexact=famille).order_by("categorie_id").first()
    if existante:
        return existante
    return Categorie.objects.create(cat_libelle=code_categorie_disponible(famille), cat_description=famille)


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


def _detail_groupe(cache, mouvement, article, fournisseur=None, affectation=None):
    """Détail de mouvement d'un groupe, créé à la première ligne puis complété (quantité + 1) aux suivantes.

    Regroupement : entrée = un détail par article et par fournisseur ; sortie = un détail par article et par
    bénéficiaire, quelle que soit la place des lignes dans le fichier. Une ligne = toujours une unité.

    Le détail est recherché en base quand il n'est pas en cache : après une ligne en erreur (cache vidé,
    éventuel détail créé dans son savepoint annulé), le regroupement reprend sur les détails réellement
    enregistrés.
    """
    cle = ("detail", mouvement.pk, article.pk, getattr(fournisseur, "pk", None), getattr(affectation, "pk", None))
    existant = cache.obtenir(cle, lambda: DetailMouvement.objects.filter(
        mouvement=mouvement, article=article, fournisseur=fournisseur, affectation=affectation).first())
    if existant is not None:
        DetailMouvement.objects.filter(pk=existant.pk).update(quantite=F("quantite") + 1)
        return existant
    detail = DetailMouvement.objects.create(
        mouvement=mouvement, article=article, quantite=1, fournisseur=fournisseur, affectation=affectation,
    )
    cache.remplacer(cle, detail)
    return detail


def _traiter_ligne(row, ligne_no, lignes_confirmees, mouvements, resolveur, cache):
    # 1. Analyse (lecture seule tant que la ligne n'est pas retenue)
    nature = texte_ou_vide(row.get("nature"))
    if not nature:
        raise ValueError("Colonne 'nature' vide")

    affectation_texte = texte_ou_vide(row.get("Affectation")) or None
    type_match, entite = resolveur.resoudre(affectation_texte) if affectation_texte else (None, None)
    attribue = type_match in TYPES_ATTRIBUES

    # Bénéficiaire absent ou non confirmé : la ligne est mise de côté.
    # (Le Siège ou une affectation vide ne demandent pas de confirmation : simple entrée en stock.)
    if affectation_texte and type_match != SIEGE and (not attribue or ligne_no not in lignes_confirmees):
        existant = Article.objects.filter(designation__iexact=nature).only("code_article").first()
        return {
            "article": existant.code_article if existant else None,
            "article_cree": False,
            "designation": nature,
            "a_traiter": True,
            "affectation_texte": affectation_texte,
            "suggestion": {"type": type_match, "libelle": nom_beneficiaire(type_match, entite)} if type_match else None,
            "avertissement": None,
            "attribue_a": None,
            "attribution": None,
        }

    # 2. Mouvements partagés (créés hors du savepoint de la ligne) : toujours une
    #    entrée au magasin du siège, suivie d'une sortie seulement s'il y a un bénéficiaire.
    magasin = mouvements.magasin_siege
    mvt_entree = mouvements.entree(magasin)
    mvt_sortie = mouvements.sortie() if attribue else None

    # 3. Écriture de la ligne, isolée dans un savepoint
    with transaction.atomic():
        famille = texte_ou_vide(row.get("famille"))
        categorie = cache.obtenir(("categorie", famille.lower()), lambda: get_or_create_categorie(famille))
        article, cree = get_or_create_article(nature, categorie, Article.ModeSuivi.QUANTITE)
        nom_fournisseur = texte_ou_vide(row.get("Fournisseur"))
        fournisseur = cache.obtenir(
            ("fournisseur", nom_fournisseur.lower()), lambda: get_or_create_fournisseur(nom_fournisseur)
        )

        detail_entree = _detail_groupe(cache, mvt_entree, article, fournisseur=fournisseur)
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
            "destination": f"En stock : {magasin.magasin_nom}",
        }
        if attribue:
            detail_sortie = _detail_groupe(cache, mvt_sortie, article, affectation=Affectation.resoudre(entite))
            unite.attribuer(beneficiaire=entite, mouvement_sortie=detail_sortie)
            resultat["attribue_a"] = f"{TYPES_ATTRIBUES[type_match]} : {nom_beneficiaire(type_match, entite)}"
            resultat["destination"] = f"Attribué — {resultat['attribue_a']}"
            resultat["attribution"] = {"type": type_match, "libelle": nom_beneficiaire(type_match, entite)}

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
        ids = restants["entree_ids"] + ([restants["sortie_id"]] if restants["sortie_id"] else [])
        details = DetailMouvement.objects.filter(mouvement_id__in=ids)
        rapport["mouvements"] = {
            "nb_entrees": len(restants["entree_ids"]),
            "nb_sorties": 1 if restants["sortie_id"] else 0,
            # Lignes regroupées : un détail d'entrée par article et fournisseur, de sortie par article et bénéficiaire.
            "nb_details_entree": details.filter(mouvement_id__in=restants["entree_ids"]).count(),
            "nb_details_sortie": details.filter(mouvement_id=restants["sortie_id"]).count() if restants["sortie_id"] else 0,
            # En aperçu tout est annulé : les identifiants n'auraient aucun sens.
            "entree_ids": [] if dry_run else restants["entree_ids"],
            "sortie_id": None if dry_run else restants["sortie_id"],
        }
    return rapport
