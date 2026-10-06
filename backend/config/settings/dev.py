from .base import *

DEBUG = True
ALLOWED_HOSTS = ["*"]

# Configuration du celery et redis
CELERY_BROKER_URL = 'redis://localhost:6379/0'
CELERY_RESULT_BACKEND = 'redis://localhost:6379/0'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'

# Configuration Email (SMTP)
# Teste console pour voir si celery fonctionne
# EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Quand vous serez prêt à envoyer de vrais emails, commentez la ligne du dessus 
# et décommentez/configurez le bloc SMTP ci-dessous :

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com' # Ou smtp.office365.com, ssl0.ovh.net, etc.
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'rabelaza4774@gmail.com'       
EMAIL_HOST_PASSWORD = 'kcyd kink eilw bbve'  # Le mot de passe d'application de 16 caractères
DEFAULT_FROM_EMAIL = 'rabelaza4774@gmail.com' # Doit être EXACTEMENT le même que EMAIL_HOST_USER
