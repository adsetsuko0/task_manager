# Шаг 1 из 3: добавляем владельца группы (пока необязательного),
# чтобы старые группы можно было передать конкретному пользователю.
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("tasks", "0012_task_order"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="projects_group",
            name="owner",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="project_groups",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
