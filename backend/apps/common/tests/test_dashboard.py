from django.test import TestCase
from rest_framework.test import APIClient

from apps.stock.models import Mouvement

from . import factories as f

T = Mouvement.Type


class EntreesDuMoisTests(TestCase):
    """Un transfert déplace du stock sans en ajouter : il n'est ni une entrée ni une sortie du mois."""

    def setUp(self):
        art = f.article()
        m1, m2 = f.magasin("M1"), f.magasin("M2")
        f.mouvement(T.ENTREE, art, 10, destination=m1)
        f.mouvement(T.RETOUR, art, 2, destination=m1)
        f.mouvement(T.TRANSFERT, art, 4, source=m1, destination=m2)
        f.mouvement(T.SORTIE, art, 3, source=m1)
        self.client = APIClient()
        self.client.force_authenticate(f.utilisateur("lecteur@test.mg", actions=("MOV_LIRE",)))

    def test_kpi_exclut_les_transferts(self):
        data = self.client.get("/api/dashboard/kpis/").json()
        self.assertEqual(data["entrees_du_mois"], 12)
        self.assertEqual(data["sorties_du_mois"], 3)
        self.assertEqual(data["total_stock"], 9)

    def test_liste_detaillee_coherente_avec_le_kpi(self):
        data = self.client.get("/api/dashboard/kpis/entrees-mois/").json()
        self.assertEqual(data["count"], 2)
        self.assertEqual(data["total_quantite"], 12)


class TendancesEtFluxTests(TestCase):
    """Comparaison avec le mois précédent et série mensuelle continue entrées / sorties."""

    def setUp(self):
        from datetime import timedelta

        from django.utils import timezone

        from apps.common.dates import plage_mois

        art = f.article()
        m1, m2 = f.magasin("M1"), f.magasin("M2")
        debut_mois, _, _ = plage_mois()
        mois_precedent = debut_mois - timedelta(days=3)
        for type_, quantite, kwargs, date in (
            (T.ENTREE, 20, {"destination": m1}, mois_precedent),
            (T.SORTIE, 5, {"source": m1}, mois_precedent),
            (T.ENTREE, 7, {"destination": m1}, timezone.now()),
            (T.SORTIE, 8, {"source": m1}, timezone.now()),
            (T.TRANSFERT, 4, {"source": m1, "destination": m2}, timezone.now()),
        ):
            mouvement = f.mouvement(type_, art, quantite, **kwargs)
            Mouvement.objects.filter(pk=mouvement.pk).update(date=date)
        self.client = APIClient()
        self.client.force_authenticate(f.utilisateur("lecteur@test.mg", actions=("MOV_LIRE",)))

    def test_totaux_du_mois_precedent(self):
        data = self.client.get("/api/dashboard/kpis/").json()
        self.assertEqual((data["entrees_du_mois"], data["sorties_du_mois"]), (7, 8))
        self.assertEqual((data["entrees_mois_precedent"], data["sorties_mois_precedent"]), (20, 5))

    def test_flux_mensuels_sur_douze_mois_continus(self):
        data = self.client.get("/api/dashboard/consommation-mensuelle/").json()
        self.assertEqual(len(data), 12)
        self.assertEqual([d["mois"] for d in data], sorted(d["mois"] for d in data))
        self.assertEqual((data[-1]["quantite_entree"], data[-1]["quantite_sortie"]), (7, 8))  # transfert exclu
        self.assertEqual((data[-2]["quantite_entree"], data[-2]["quantite_sortie"]), (20, 5))
        self.assertTrue(all(d["quantite_entree"] == 0 and d["quantite_sortie"] == 0 for d in data[:-2]))


class RepartitionCategorieTests(TestCase):
    def test_description_de_la_categorie_renvoyee(self):
        from apps.catalogue.models import Categorie

        article = f.article()
        article.categorie = Categorie.objects.create(cat_libelle="MB", cat_description="Meuble du bureau")
        article.save()
        f.mouvement(T.ENTREE, article, 5, destination=f.magasin("M1"))
        client = APIClient()
        client.force_authenticate(f.utilisateur("lecteur@test.mg", actions=("MOV_LIRE",)))
        data = client.get("/api/dashboard/repartition-categorie/").json()
        self.assertEqual(data, [{"categorie": "MB", "description": "Meuble du bureau", "stock": 5}])
