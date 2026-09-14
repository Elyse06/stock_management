import logging
import re
import unicodedata
from datetime import datetime

import pandas as pd
from django.core.exceptions import ValidationError
from django.db import IntegrityError, models, transaction
from django.utils import timezone

from apps.catalogue.models import Article, Categorie, Fournisseur, Marque
from apps.commande.models import AttributionDetailCommande, Commande, DetailCommande
from apps.employee.models import Employer, Service, Site
from apps.stock.models import DetailMouvement, Magasin, Mouvement, UniteArticle

logger = logging.getLogger("stock.import")

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


def generer_code_article_unique(designation: str, cache_articles: dict = None) -> str:
    base = slugify_code_article(designation)
    code = base
    suffixe = 1
    
    if cache_articles:
        while code in cache_articles or Article.objects.filter(code_article=code).exists():
            suffixe += 1
            code = f"{base[:17]}-{suffixe}"
    else:
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
        raise ValueError("Date d'acquisition manquante")
    
    try:
        if pd.isna(valeur):
            raise ValueError("Date d'acquisition vide ou invalide")
    except (TypeError, ValueError):
        pass
    
    if isinstance(valeur, datetime):
        return timezone.make_aware(valeur) if timezone.is_naive(valeur) else valeur
    
    for fmt in ("%d/%m/%y", "%d/%m/%Y", "%Y-%m-%d"):
        try:
            dt = datetime.strptime(str(valeur).strip(), fmt)
            return timezone.make_aware(dt)
        except ValueError:
            continue
    
    raise ValueError(f"Format de date invalide : '{valeur}'. Formats attendus : JJ/MM/AA, JJ/MM/AAAA, AAAA-MM-JJ")


def get_or_create_marque_defaut():
    marque, _ = Marque.objects.get_or_create(
        mq_libelle=MARQUE_PAR_DEFAUT,
        defaults={"mq_descriprion": "Marque par défaut - non renseignée à l'import"},
    )
    return marque


def get_or_create_categorie(code_famille, cache_categories: dict = None):
    code_famille = (str(code_famille).strip() if not est_non_applicable(code_famille) else "DIVERS")[:20]
    code_famille_lower = code_famille.lower()
    
    if cache_categories and code_famille_lower in cache_categories:
        return cache_categories[code_famille_lower]
    
    categorie = Categorie.objects.filter(cat_libelle__iexact=code_famille).first()
    if not categorie:
        categorie = Categorie.objects.create(
            cat_libelle=code_famille,
            cat_description=f"Créée automatiquement à l'import ({code_famille})",
        )
    
    if cache_categories is not None:
        cache_categories[code_famille_lower] = categorie
    
    return categorie


def get_or_create_fournisseur(nom, cache_fournisseurs: dict = None):
    nom = "" if est_non_applicable(nom) else str(nom).strip()
    if not nom:
        return None
    
    nom_lower = nom.lower()
    
    if cache_fournisseurs and nom_lower in cache_fournisseurs:
        return cache_fournisseurs[nom_lower]
    
    fournisseur = Fournisseur.objects.filter(nom__iexact=nom).first()
    if not fournisseur:
        fournisseur = Fournisseur.objects.create(nom=nom, email="")
    
    if cache_fournisseurs is not None:
        cache_fournisseurs[nom_lower] = fournisseur
    
    return fournisseur


def get_or_create_site(agence, cache_sites: dict = None):
    agence = "" if est_non_applicable(agence) else str(agence).strip()
    agence = agence or "INCONNU"
    site_type = "SIEGE" if agence.upper() == "SIEGE" else "AGENCE"
    
    cle_cache = (agence.lower(), site_type)
    
    if cache_sites and cle_cache in cache_sites:
        return cache_sites[cle_cache]
    
    site = Site.objects.filter(site_nom__iexact=agence, site_type=site_type).first()
    if not site:
        site = Site.objects.create(
            site_nom=agence,
            site_type=site_type,
            localite="",
        )
    
    if cache_sites is not None:
        cache_sites[cle_cache] = site
    
    return site


def get_or_create_magasin(site, cache_magasins: dict = None):
    cle_cache = (site.site_nom, site.site_id)
    
    if cache_magasins and cle_cache in cache_magasins:
        return cache_magasins[cle_cache]
    
    magasin = Magasin.objects.filter(magasin_nom=site.site_nom, localite=site).first()
    if not magasin:
        magasin = Magasin.objects.create(magasin_nom=site.site_nom, localite=site)
    
    if cache_magasins is not None:
        cache_magasins[cle_cache] = magasin
    
    return magasin


def get_or_create_article(designation, categorie, marque, mode_suivi, cache_articles: dict = None):
    designation = designation.strip()
    designation_lower = designation.lower()
    
    if cache_articles and designation_lower in cache_articles:
        return cache_articles[designation_lower], False
    
    article = Article.objects.filter(designation__iexact=designation).first()
    if article:
        if cache_articles is not None:
            cache_articles[designation_lower] = article
        return article, False
    
    article = Article.objects.create(
        code_article=generer_code_article_unique(designation, cache_articles),
        designation=designation[:50],
        categorie=categorie,
        marque=marque,
        mode_suivi=mode_suivi,
    )
    
    if cache_articles is not None:
        cache_articles[designation_lower] = article
        cache_articles[article.code_article] = article
    
    return article, True


def _generer_emp_id_unique(matricule_str: str, cache_employes: dict = None) -> str:
    base = re.sub(r"[^A-Za-z0-9]", "", matricule_str)[-5:].upper() or "EMP"
    candidat = f"E{base}"[:6]
    suffixe = 0
    
    if cache_employes:
        while candidat in cache_employes or Employer.objects.filter(emp_id=candidat).exists():
            suffixe += 1
            if suffixe > 999:
                raise ValueError(f"Impossible de générer un emp_id unique pour le matricule {matricule_str}")
            candidat = f"E{base[:5 - len(str(suffixe))]}{suffixe}"[:6]
    else:
        while Employer.objects.filter(emp_id=candidat).exists():
            suffixe += 1
            if suffixe > 999:
                raise ValueError(f"Impossible de générer un emp_id unique pour le matricule {matricule_str}")
            candidat = f"E{base[:5 - len(str(suffixe))]}{suffixe}"[:6]
    
    return candidat


def resoudre_ou_creer_employe(matricule, detenteur, cache_employes: dict = None, cache_services: dict = None):
    if est_non_applicable(matricule):
        return None, False
    
    matricule_str = str(matricule).strip()
    if matricule_str.endswith(".0"):
        matricule_str = matricule_str[:-2]
    
    if cache_employes and matricule_str in cache_employes:
        return cache_employes[matricule_str], False
    
    employe = Employer.objects.filter(emp_matricule=matricule_str).first()
    if employe:
        if cache_employes is not None:
            cache_employes[matricule_str] = employe
        return employe, False
    
    detenteur_str = "" if est_non_applicable(detenteur) else str(detenteur).strip()
    
    service = None
    if detenteur_str:
        detenteur_lower = detenteur_str.lower()
        
        if cache_services and detenteur_lower in cache_services:
            service = cache_services[detenteur_lower]
        else:
            service = Service.objects.filter(
                models.Q(serv_id__iexact=detenteur_str) | models.Q(serv_libelle__iexact=detenteur_str)
            ).first()
            
            if cache_services is not None and service:
                cache_services[service.serv_id.lower()] = service
                cache_services[service.serv_libelle.lower()] = service
    
    if service:
        nom = f"Employé matricule {matricule_str} (nom à compléter)"
    else:
        nom = detenteur_str or f"Employé matricule {matricule_str} (nom à compléter)"
    
    employe = Employer.objects.create(
        emp_id=_generer_emp_id_unique(matricule_str, cache_employes),
        emp_nom=nom[:255],
        emp_matricule=matricule_str,
        emp_contact="",
        emp_fonction="",
        emp_serv_id=service,
    )
    
    if cache_employes is not None:
        cache_employes[matricule_str] = employe
    
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
        commande=commande,
        article=article,
        quantite=1,
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


def _traiter_ligne(row, marque_defaut, origine_import, caches: dict):
    nature = "" if est_non_applicable(row.get("Nature")) else str(row.get("Nature")).strip()
    if not nature:
        raise ValueError("Colonne 'Nature' vide")
    
    numero_serie_brut = row.get("Numero de série")
    numero_serie_ok = not est_non_applicable(numero_serie_brut)
    mode_suivi = Article.ModeSuivi.NUMERO_SERIE if numero_serie_ok else Article.ModeSuivi.QUANTITE
    
    categorie = get_or_create_categorie(row.get("Code famille"), caches["categories"])
    article, cree = get_or_create_article(nature, categorie, marque_defaut, mode_suivi, caches["articles"])
    
    fournisseur = get_or_create_fournisseur(row.get("Fournisseur"), caches["fournisseurs"])
    site = get_or_create_site(row.get("Agence") or row.get("Code agence"), caches["sites"])
    magasin = get_or_create_magasin(site, caches["magasins"])
    
    date_acquisition = parse_date(row.get("Date D'acquisition"))
    
    employe, employe_cree = resoudre_ou_creer_employe(
        row.get("N° Matricule"),
        row.get("Détenteur"),
        caches["employes"],
        caches["services"],
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
        mouvement=mvt_entree,
        article=article,
        quantite=1,
        fournisseur=fournisseur,
    )
    
    unite = None
    if mode_suivi == Article.ModeSuivi.NUMERO_SERIE:
        unite = UniteArticle.objects.create(
            article=article,
            numero_de_serie=str(numero_serie_brut).strip(),
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
        
        if unite:
            unite.attribuer(employe=employe, mouvement_sortie=detail_sortie)
        
        resultat["attribue_a"] = f"{employe.emp_nom} ({employe.emp_matricule})"
        resultat["code_unique_attribution"] = str(attribution.code_unique)
        
        if employe_cree:
            resultat["avertissement"] = (
                f"Employé '{employe.emp_matricule}' créé automatiquement (nom à vérifier/compléter)"
            )
    elif not est_non_applicable(matricule_val):
        resultat["avertissement"] = f"Matricule '{matricule_val}' introuvable, article resté EN_STOCK"
    
    return resultat


def initialiser_caches() -> dict:
    logger.info("Initialisation des caches pour l'import...")
    
    articles = {}
    for article in Article.objects.all():
        articles[article.designation.lower()] = article
        articles[article.code_article] = article
    
    categories = {
        cat.cat_libelle.lower(): cat
        for cat in Categorie.objects.all()
    }
    
    fournisseurs = {
        f.nom.lower(): f
        for f in Fournisseur.objects.all()
    }
    
    sites = {
        (site.site_nom.lower(), site.site_type): site
        for site in Site.objects.all()
    }
    
    magasins = {
        (mag.magasin_nom, mag.localite_id): mag
        for mag in Magasin.objects.all()
    }
    
    employes = {}
    for emp in Employer.objects.all():
        employes[emp.emp_matricule] = emp
        employes[emp.emp_id] = emp
    
    services = {}
    for serv in Service.objects.all():
        services[serv.serv_id.lower()] = serv
        services[serv.serv_libelle.lower()] = serv
    
    caches = {
        "articles": articles,
        "categories": categories,
        "fournisseurs": fournisseurs,
        "sites": sites,
        "magasins": magasins,
        "employes": employes,
        "services": services,
    }
    
    logger.info(
        "Caches initialisés : %d articles, %d catégories, %d fournisseurs, %d sites, %d magasins, %d employés, %d services",
        len(articles),
        len(categories),
        len(fournisseurs),
        len(sites),
        len(magasins),
        len(employes),
        len(services),
    )
    
    return caches


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
    
    caches = initialiser_caches()
    
    try:
        with transaction.atomic():
            marque_defaut = get_or_create_marque_defaut()
            
            for idx, row in df.iterrows():
                ligne_no = idx + 2
                try:
                    resultat = _traiter_ligne(row, marque_defaut, origine_import, caches)
                    rapport["lignes_ok"] += 1
                    rapport["details"].append({"ligne": ligne_no, "statut": "OK", **resultat})
                except (ValueError, ValidationError, IntegrityError) as exc:
                    rapport["lignes_erreur"] += 1
                    rapport["details"].append(
                        {"ligne": ligne_no, "statut": "ERREUR", "message": str(exc)}
                    )
                    logger.warning(
                        "Ligne %s en erreur : %s", ligne_no, exc,
                        extra={"type_erreur": type(exc).__name__},
                    )
                except Exception as exc:
                    rapport["lignes_erreur"] += 1
                    rapport["details"].append(
                        {
                            "ligne": ligne_no,
                            "statut": "ERREUR",
                            "message": f"Erreur interne : {exc}",
                        }
                    )
                    logger.exception("Erreur inattendue ligne %s", ligne_no)
            
            if dry_run:
                raise RollbackDryRun()
    
    except RollbackDryRun:
        pass
    
    logger.info(
        "Import immobilisations terminé (dry_run=%s) : %s OK, %s erreur(s) sur %s ligne(s)",
        dry_run,
        rapport["lignes_ok"],
        rapport["lignes_erreur"],
        rapport["lignes_ok"] + rapport["lignes_erreur"],
    )
    
    return rapport
