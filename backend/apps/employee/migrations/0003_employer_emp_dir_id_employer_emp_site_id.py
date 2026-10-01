import django.db.models.deletion
from django.db import migrations, models


def populate_employee_organization(apps, schema_editor):
    del schema_editor
    Employer = apps.get_model('employee', 'Employer')
    for employee in Employer.objects.filter(emp_serv_id__isnull=False).select_related(
        'emp_serv_id__serv_dir_id__site'
    ).iterator():
        direction = employee.emp_serv_id.serv_dir_id
        employee.emp_dir_id = direction
        employee.emp_site_id = direction.site
        employee.save(update_fields=['emp_dir_id', 'emp_site_id'])


class Migration(migrations.Migration):

    dependencies = [
        ('employee', '0002_employer_emp_chef_hierarchique'),
    ]

    operations = [
        migrations.AddField(
            model_name='employer',
            name='emp_dir_id',
            field=models.ForeignKey(
                blank=True,
                db_column='emp_dir_id',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='employees',
                to='employee.direction',
            ),
        ),
        migrations.AddField(
            model_name='employer',
            name='emp_site_id',
            field=models.ForeignKey(
                blank=True,
                db_column='emp_site_id',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='employees',
                to='employee.site',
            ),
        ),
        migrations.RunPython(populate_employee_organization, migrations.RunPython.noop),
    ]