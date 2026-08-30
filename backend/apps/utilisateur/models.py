from django.db import models


class Utilisateur(models.Model):
    utilisateur_id = models.AutoField(primary_key=True)
    utilisateur_mail = models.EmailField(unique=True)
    utilisateur_mdp = models.CharField(max_length=255)

    def __str__(self):
        return self.mail

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    class Meta:
        db_table = 't_utilisateur'

class Action(models.Model):
    action_id = models.CharField(primary_key=True, max_length=8)
    action_libelle = models.CharField(max_length=50)
    action_description = models.TextField()

    def __str__(self):
        return self.libelle

    class Meta:
        db_table = 't_action'

class Autoriser(models.Model):
    autoriser_utilisateur_id = models.ForeignKey(
        Utilisateur, models.CASCADE, db_column="autoriser_utilisateur_id"
    )
    autoriser_action_id = models.ForeignKey(
        Action, models.CASCADE, db_column="autoriser_action_id"
    )

    class Meta:
        db_table = 't_autoriser'


