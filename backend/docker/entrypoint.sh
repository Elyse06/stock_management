#!/bin/sh
# Point d'entrée du conteneur backend (API et worker Celery).
set -e

python docker/preparer_base.py

if [ "${RUN_MIGRATIONS:-0}" = "1" ]; then
    python manage.py migrate --noinput
    python manage.py seed_data
fi

exec "$@"
