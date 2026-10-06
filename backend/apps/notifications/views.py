from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from apps.stock.models import Mouvement, DetailMouvement, Magasin
from apps.catalogue.models import Article
from .tasks import notifier_stock_bas


class TestAlerteStockView(APIView):
    """
    View de test pour simuler une sortie de stock et déclencher l'alerte.
    """
    def post(self, request):
        code_article = request.data.get('code_article')
        magasin_id = request.data.get('magasin_id')
        quantite = request.data.get('quantite', 1)
        
        if not code_article or not magasin_id:
            return Response(
                {"error": "code_article et magasin_id requis"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            article = Article.objects.get(code_article=code_article)
            magasin = Magasin.objects.get(magasin_id=magasin_id)
        except (Article.DoesNotExist, Magasin.DoesNotExist) as e:
            return Response({"error": str(e)}, status=status.HTTP_404_NOT_FOUND)
        
        # Créer un mouvement de sortie
        mouvement = Mouvement.objects.create(
            type_mouvement=Mouvement.Type.SORTIE,
            magasin_source=magasin,
            origine="Test alerte stock",
            motif="Test de notification",
        )
        
        # Créer le détail du mouvement
        DetailMouvement.objects.create(
            mouvement=mouvement,
            article=article,
            quantite=quantite,
        )
        
        return Response(
            {
                "message": f"Mouvement de sortie créé pour {article.designation} dans {magasin.magasin_nom}",
                "mouvement_id": mouvement.mouvement_id,
            },
            status=status.HTTP_201_CREATED
        )