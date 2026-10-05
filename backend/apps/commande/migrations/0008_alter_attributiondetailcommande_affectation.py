import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("commande", "0007_attributiondetailcommande_affectation_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="attributiondetailcommande",
            name="affectation",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="attributions_articles",
                to="stock.affectation",
            ),
        ),
    ]
