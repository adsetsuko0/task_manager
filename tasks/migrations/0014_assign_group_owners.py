# Шаг 2 из 3: у существующих групп появляется владелец.
# Раньше все группы были общими, поэтому отдаём их одному пользователю:
# тому, у кого больше всего задач; если задач нет, первому суперпользователю,
# а если и его нет, самому раннему пользователю.
# Если выбрался не тот, поменять владельца можно в админке (/admin/).
from django.conf import settings
from django.db import migrations
from django.db.models import Count


def assign_owners(apps, schema_editor):
    app_label, model_name = settings.AUTH_USER_MODEL.split(".")
    User = apps.get_model(app_label, model_name)
    Group = apps.get_model("tasks", "Projects_Group")
    Task = apps.get_model("tasks", "Task")

    orphans = Group.objects.filter(owner__isnull=True)
    if not orphans.exists():
        return

    top = (
        Task.objects.values("owner_id")
        .annotate(n=Count("id"))
        .order_by("-n", "owner_id")
        .first()
    )
    owner = User.objects.filter(id=top["owner_id"]).first() if top else None
    owner = (
        owner
        or User.objects.filter(is_superuser=True).order_by("id").first()
        or User.objects.order_by("id").first()
    )
    if owner is None:
        # Групп без единого пользователя в системе не бывает по смыслу:
        # некому ими владеть, поэтому их удаляем.
        orphans.delete()
        return
    orphans.update(owner=owner)


class Migration(migrations.Migration):
    dependencies = [
        ("tasks", "0013_projects_group_owner"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RunPython(assign_owners, migrations.RunPython.noop),
    ]
