from django.test import TestCase
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory

from apps.catalogue.models import Article, Categorie
from apps.catalogue.views.article import ArticleViewSet


class ArticlePaginationTests(TestCase):
    def test_second_page_uses_stable_ordering(self):
        categorie = Categorie.objects.create(cat_libelle="Matériel")
        Article.objects.bulk_create(
            [
                Article(
                    code_article=f"ART{index:03}",
                    designation=f"Article {index}",
                    categorie=categorie,
                )
                for index in range(21)
            ]
        )
        view = ArticleViewSet()
        request = APIRequestFactory().get("/api/catalogue/articles/?page=2")
        view.request = Request(request)

        page = list(view.get_queryset()[20:40])

        self.assertEqual([article.code_article for article in page], ["ART020"])
