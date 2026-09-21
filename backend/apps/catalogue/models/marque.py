from django.db import models


class Marque(models.Model):
    marque_id = models.BigAutoField(primary_key=True)
    mq_libelle = models.CharField(max_length=20)
    mq_descriprion = models.TextField(blank=True)

    class Meta:
        db_table = 't_marque'
        verbose_name = "Marque"
        verbose_name_plural = "Marques"

    def __str__(self):
        return self.mq_libelle
