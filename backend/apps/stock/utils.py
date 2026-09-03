from django.db.models import Sum

from apps.stock.models import DetailMouvement, Mouvement


def calculer_stock_theorique(article, magasin=None, service=None):
    if magasin:
        entrees = DetailMouvement.objects.filter(
            mouvement__type_mouvement__in=[
                Mouvement.Type.ENTREE,
                Mouvement.Type.TRANSFERT,
            ],
            mouvement__magasin_destination=magasin,
            article=article,
        ).aggregate(total=Sum("quantite"))["total"] or 0
        
        sorties = DetailMouvement.objects.filter(
            mouvement__type_mouvement__in=[
                Mouvement.Type.SORTIE,
                Mouvement.Type.TRANSFERT,
            ],
            mouvement__magasin_source=magasin,
            article=article,
        ).aggregate(total=Sum("quantite"))["total"] or 0
        
        ajustements_plus = DetailMouvement.objects.filter(
            mouvement__type_mouvement=Mouvement.Type.AJUSTEMENT,
            mouvement__magasin_destination=magasin,
            mouvement__magasin_source__isnull=True,
            article=article,
        ).aggregate(total=Sum("quantite"))["total"] or 0
        
        ajustements_moins = DetailMouvement.objects.filter(
            mouvement__type_mouvement=Mouvement.Type.AJUSTEMENT,
            mouvement__magasin_source=magasin,
            mouvement__magasin_destination__isnull=True,
            article=article,
        ).aggregate(total=Sum("quantite"))["total"] or 0
        
        return entrees - sorties + ajustements_plus - ajustements_moins
    
    if service:
        stock_service = DetailMouvement.objects.filter(
            mouvement__type_mouvement=Mouvement.Type.SORTIE,
            employe_beneficiaire__emp_serv_id=service,
            article=article,
        ).aggregate(total=Sum("quantite"))["total"] or 0
        
        return stock_service
    
    return 0