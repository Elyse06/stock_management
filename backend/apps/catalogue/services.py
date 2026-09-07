from django.db.models import Sum
from django.db.models.functions import Coalesce

from apps.catalogue.models import Article
from apps.commande.models import AttributionDetailCommande, Commande
from apps.stock.models import DetailMouvement, Magasin, Mouvement


def get_fiche_article_complete(code_article):
    try:
        article = Article.objects.select_related(
            "categorie", "marque"
        ).prefetch_related(
            "fournisseurs_liaison__fournisseur"
        ).get(code_article=code_article)
    except Article.DoesNotExist:
        return None

    article_data = {
        "code_article": article.code_article,
        "designation": article.designation,
        "categorie": article.categorie.cat_libelle if article.categorie else None,
        "marque": article.marque.mq_libelle if article.marque else None,
        "unite": article.unite,
        "seuil": article.seuil,
        "mode_suivi": article.mode_suivi,
        "description": article.description,
        "code_barre": article.code_barre,
    }

    stocks_par_magasin = _get_stocks_par_magasin(article)

    # 3. Fournisseurs
    fournisseurs = [
        {
            "fournisseur_id": liaison.fournisseur.fournisseur_id,
            "fournisseur_nom": liaison.fournisseur.nom,
            "prix_achat": liaison.prix_achat,
        }
        for liaison in article.fournisseurs_liaison.all()
    ]

    historique_recents = _get_historique_recents(article)

    attributions_actives = _get_attributions_actives(article)

    commandes_recentes = _get_commandes_recentes(article)

    return {
        "article": article_data,
        "stocks_par_magasin": stocks_par_magasin,
        "fournisseurs": fournisseurs,
        "historique_recents": historique_recents,
        "attributions_actives": attributions_actives,
        "commandes_recentes": commandes_recentes,
    }


def _get_stocks_par_magasin(article):
    magasins = Magasin.objects.all()
    stocks = {}
    
    for magasin in magasins:
        stock = _calculer_stock_magasin(article, magasin)
        if stock > 0:
            stocks[magasin.magasin_nom] = stock
    
    return stocks


def _calculer_stock_magasin(article, magasin):
    entrees = DetailMouvement.objects.filter(
        mouvement__type_mouvement__in=[Mouvement.Type.ENTREE, Mouvement.Type.TRANSFERT],
        mouvement__magasin_destination=magasin,
        article=article,
    ).aggregate(total=Coalesce(Sum("quantite"), 0))["total"]
    
    sorties = DetailMouvement.objects.filter(
        mouvement__type_mouvement__in=[Mouvement.Type.SORTIE, Mouvement.Type.TRANSFERT],
        mouvement__magasin_source=magasin,
        article=article,
    ).aggregate(total=Coalesce(Sum("quantite"), 0))["total"]
    
    ajustements_plus = DetailMouvement.objects.filter(
        mouvement__type_mouvement=Mouvement.Type.AJUSTEMENT,
        mouvement__magasin_destination=magasin,
        mouvement__magasin_source__isnull=True,
        article=article,
    ).aggregate(total=Coalesce(Sum("quantite"), 0))["total"]
    
    ajustements_moins = DetailMouvement.objects.filter(
        mouvement__type_mouvement=Mouvement.Type.AJUSTEMENT,
        mouvement__magasin_source=magasin,
        mouvement__magasin_destination__isnull=True,
        article=article,
    ).aggregate(total=Coalesce(Sum("quantite"), 0))["total"]
    
    return entrees - sorties + ajustements_plus - ajustements_moins


def _get_historique_recents(article):
    historique = list(
        DetailMouvement.objects.filter(article=article)
        .select_related(
            "mouvement",
            "mouvement__magasin_source",
            "mouvement__magasin_destination",
            "employe_beneficiaire",
        )
        .order_by("-mouvement__date")[:10]
        .values(
            "mouvement__mouvement_id",
            "mouvement__date",
            "mouvement__type_mouvement",
            "quantite",
            "mouvement__magasin_source__magasin_nom",
            "mouvement__magasin_destination__magasin_nom",
            "employe_beneficiaire__emp_nom",
            "mouvement__origine",
            "mouvement__motif",
        )
    )
    
    return [
        {
            "mouvement_id": h["mouvement__mouvement_id"],
            "date": h["mouvement__date"],
            "type_mouvement": h["mouvement__type_mouvement"],
            "quantite": h["quantite"],
            "magasin_source": h["mouvement__magasin_source__magasin_nom"],
            "magasin_destination": h["mouvement__magasin_destination__magasin_nom"],
            "beneficiaire": h["employe_beneficiaire__emp_nom"],
            "origine": h["mouvement__origine"],
            "motif": h["mouvement__motif"],
        }
        for h in historique
    ]


def _get_attributions_actives(article):
    attributions = list(
        AttributionDetailCommande.objects.filter(
            detail_commande__article=article
        )
        .select_related(
            "employe_beneficiaire",
            "employe_beneficiaire__emp_serv_id",
        )
        .values(
            "employe_beneficiaire__emp_id",
            "employe_beneficiaire__emp_nom",
            "employe_beneficiaire__emp_matricule",
            "employe_beneficiaire__emp_fonction",
            "employe_beneficiaire__emp_serv_id__serv_libelle",
            "code_unique",
        )
        .annotate(total_attribue=Sum("quantite"))
        .order_by("-total_attribue")
    )
    
    return [
        {
            "employe_id": a["employe_beneficiaire__emp_id"],
            "employe_nom": a["employe_beneficiaire__emp_nom"],
            "matricule": a["employe_beneficiaire__emp_matricule"],
            "fonction": a["employe_beneficiaire__emp_fonction"],
            "service": a["employe_beneficiaire__emp_serv_id__serv_libelle"],
            "quantite_attribuee": a["total_attribue"],
            "code_unique_qr": a["code_unique"],  # QR code
        }
        for a in attributions
    ]


def _get_commandes_recentes(article):
    commandes = list(
        Commande.objects.filter(details__article=article)
        .select_related("employe_demandeur", "employe_traitant")
        .distinct()
        .order_by("-date_commande")[:10]
        .values(
            "commande_id",
            "date_commande",
            "statut",
            "objet",
            "employe_demandeur__emp_nom",
            "employe_traitant__emp_nom",
        )
    )
    
    return [
        {
            "commande_id": c["commande_id"],
            "date_commande": c["date_commande"],
            "statut": c["statut"],
            "objet": c["objet"],
            "demandeur": c["employe_demandeur__emp_nom"],
            "traitant": c["employe_traitant__emp_nom"],
        }
        for c in commandes
    ]