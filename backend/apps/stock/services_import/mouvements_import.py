from apps.stock.models import Mouvement


class MouvementsImport:
    def __init__(self, origine, date, magasin_siege):
        self.origine = origine
        self.date = date
        self.magasin_siege = magasin_siege
        self._entrees = {}
        self._sortie = None

    def entree(self, magasin):
        mouvement = self._entrees.get(magasin.pk)
        if mouvement is None:
            mouvement = Mouvement(
                date=self.date, type_mouvement=Mouvement.Type.ENTREE,
                origine=self.origine, magasin_destination=magasin,
            )
            mouvement.full_clean(exclude=["magasin_source"])
            mouvement.save()
            self._entrees[magasin.pk] = mouvement
        return mouvement

    def sortie(self):
        if self._sortie is None:
            mouvement = Mouvement(
                date=self.date, type_mouvement=Mouvement.Type.SORTIE,
                origine=self.origine, magasin_source=self.magasin_siege,
            )
            mouvement.full_clean(exclude=["magasin_destination"])
            mouvement.save()
            self._sortie = mouvement
        return self._sortie

    def finaliser(self):
        candidats = list(self._entrees.values()) + ([self._sortie] if self._sortie else [])
        utilises = set(
            Mouvement.objects.filter(pk__in=[m.pk for m in candidats], details__isnull=False)
            .values_list("pk", flat=True)
        )
        Mouvement.objects.filter(pk__in=[m.pk for m in candidats if m.pk not in utilises]).delete()
        return {
            "entree_ids": [m.pk for m in self._entrees.values() if m.pk in utilises],
            "sortie_id": self._sortie.pk if self._sortie and self._sortie.pk in utilises else None,
        }


class CacheReferentiels:
    def __init__(self):
        self._donnees = {}

    def obtenir(self, cle, fabrique):
        if cle not in self._donnees:
            self._donnees[cle] = fabrique()
        return self._donnees[cle]

    def vider(self):
        self._donnees.clear()
