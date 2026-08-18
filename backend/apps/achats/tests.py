from django.test import TestCase

from apps.achats.models import Commande, DetailCommande
from apps.achats.serializers import CommandeTraitementSerializer
from apps.catalogue.models import Article, Categorie
from apps.stock.models import DetailMouvement, Magasin, Mouvement
from apps.utilisateurs.models import Employe, Profil, Utilisateur


class CommandeTraitementSerializerTests(TestCase):
    def setUp(self):
        self.profil = Profil.objects.create(nom="Gestionnaire")
        self.demandeur = Utilisateur.objects.create_user(
            nom_user="demandeur.test",
            email="demandeur@test.local",
            employe=Employe.objects.create(nom="Demandeur"),
            profil=self.profil,
            password="secret123",
        )
        self.traitant = Utilisateur.objects.create_user(
            nom_user="traitant.test",
            email="traitant@test.local",
            employe=Employe.objects.create(nom="Traitant"),
            profil=self.profil,
            password="secret123",
        )
        self.magasin = Magasin.objects.create(nom="Magasin principal", localite="Antananarivo")
        self.magasin_autre = Magasin.objects.create(nom="Magasin secondaire", localite="Toamasina")
        self.categorie = Categorie.objects.create(nom="Matériel")
        self.article = Article.objects.create(
            code_article="ART-001",
            designation="Clé USB",
            categorie=self.categorie,
        )
        self.commande = Commande.objects.create(
            objet="Commande de matériel",
            utilisateur_demandeur=self.demandeur,
        )
        DetailCommande.objects.create(
            commande=self.commande,
            article=self.article,
            quantite=3,
        )

    def test_valider_commande_cree_une_sortie_de_stock(self):
        request = type("RequestStub", (), {"user": self.traitant})()
        serializer = CommandeTraitementSerializer(
            data={
                "statut": Commande.Statut.VALIDEE,
                "commentaire_agent": "OK",
                "magasin_source": self.magasin_autre.magasin_id,
            },
            context={"commande": self.commande, "request": request},
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()

        self.commande.refresh_from_db()
        self.assertEqual(self.commande.statut, Commande.Statut.VALIDEE)

        sortie = Mouvement.objects.filter(
            type_mouvement=Mouvement.Type.SORTIE,
            origine=f"Commande de {self.demandeur.nom_user}",
            motif=self.commande.objet,
        ).first()

        self.assertIsNotNone(sortie)
        self.assertEqual(sortie.magasin_source, self.magasin_autre)
        self.assertEqual(sortie.details.count(), 1)
        self.assertEqual(
            sortie.details.get(article=self.article).quantite,
            3,
        )
        self.assertTrue(DetailMouvement.objects.filter(mouvement=sortie, article=self.article).exists())
