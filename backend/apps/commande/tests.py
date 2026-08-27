from django.test import TestCase

from apps.commande.models import Commande, DetailCommande
from apps.commande.serializers import CommandeTraitementSerializer
from apps.catalogue.models import Article, Categorie
from apps.employee.models import Employer
from apps.stock.models import DetailMouvement, Magasin, Mouvement
from apps.utilisateur.models import Utilisateur


class CommandeTraitementSerializerTests(TestCase):
    def setUp(self):
        self.demandeur = Utilisateur.objects.create(
            utilisateur_mail="demandeur@test.local",
            utilisateur_mdp="secret123",
        )
        self.traitant = Utilisateur.objects.create(
            utilisateur_mail="traitant@test.local",
            utilisateur_mdp="secret123",
        )
        self.employee_demandeur = Employer.objects.create(
            emp_id="EMP001",
            emp_nom="Demandeur",
            emp_matricule="MAT001",
            emp_contact="0340000001",
            emp_fonction="Demandeur",
            emp_utilisateur_id=self.demandeur,
        )
        self.employee_traitant = Employer.objects.create(
            emp_id="EMP002",
            emp_nom="Traitant",
            emp_matricule="MAT002",
            emp_contact="0340000002",
            emp_fonction="Gestionnaire",
            emp_utilisateur_id=self.traitant,
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
            employe_demandeur=self.employee_demandeur,
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
            origine=f"Commande de {self.employee_demandeur.emp_nom} ({self.employee_demandeur.emp_matricule})",
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

    def test_mettre_commande_en_cours_ne_cree_pas_de_sortie(self):
        request = type("RequestStub", (), {"user": self.traitant})()
        serializer = CommandeTraitementSerializer(
            data={"statut": Commande.Statut.EN_COURS},
            context={"commande": self.commande, "request": request},
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()

        self.commande.refresh_from_db()
        self.assertEqual(self.commande.statut, Commande.Statut.EN_COURS)
        self.assertFalse(Mouvement.objects.filter(type_mouvement=Mouvement.Type.SORTIE).exists())
