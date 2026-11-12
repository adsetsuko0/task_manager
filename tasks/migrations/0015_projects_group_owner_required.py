# Шаг 3 из 3: владелец обязателен, а имя группы уникально
# в пределах одного пользователя (раньше было уникально на весь сайт).
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("tasks", "0014_assign_group_owners"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name="projects_group",
            name="owner",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="project_groups",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name="projects_group",
            name="name",
            field=models.CharField(max_length=100),
        ),
        migrations.AddConstraint(
            model_name="projects_group",
            constraint=models.UniqueConstraint(
                fields=("owner", "name"), name="unique_group_name_per_owner"
            ),
        ),
    ]
