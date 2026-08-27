from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("achats", "0002_initial"),
        ("employee", "0001_initial"),
    ]

    operations = [
        migrations.RenameField(
            model_name="commande",
            old_name="utilisateur_demandeur",
            new_name="employe_demandeur",
        ),
        migrations.RenameField(
            model_name="commande",
            old_name="utilisateur_traitant",
            new_name="employe_traitant",
        ),
        migrations.AlterField(
            model_name="commande",
            name="employe_demandeur",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="commandes_demandees",
                to="employee.employer",
            ),
        ),
        migrations.AlterField(
            model_name="commande",
            name="employe_traitant",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="commandes_traitees",
                to="employee.employer",
            ),
        ),
    ]