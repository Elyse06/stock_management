from django.utils import timezone

from apps.stock.models import InventaireSession


def generer_code_reference():
    today = timezone.now().strftime("%Y%m%d")
    prefix = f"INV-{today}-"
    
    count_today = InventaireSession.objects.filter(
        code_reference__startswith=prefix
    ).count()
    
    next_number = count_today + 1
    return f"{prefix}{next_number:03d}"
