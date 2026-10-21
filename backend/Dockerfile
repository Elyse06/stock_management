FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DJANGO_SETTINGS_MODULE=config.settings.prod

WORKDIR /app

# Pilote ODBC Microsoft pour SQL Server.
RUN apt-get update && apt-get install -y --no-install-recommends curl gnupg ca-certificates \
    && curl -sSL -O https://packages.microsoft.com/config/debian/12/packages-microsoft-prod.deb \
    && dpkg -i packages-microsoft-prod.deb && rm packages-microsoft-prod.deb \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y --no-install-recommends msodbcsql18 unixodbc libgssapi-krb5-2 \
    && apt-get purge -y curl gnupg && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/* \
    && if ldd /opt/microsoft/msodbcsql18/lib64/libmsodbcsql-18.*.so.* | grep "not found"; then \
         echo "Dépendance manquante pour le pilote ODBC" >&2; exit 1; fi

COPY requirements.txt .
RUN pip install -r requirements.txt \
    && python -c "import pyodbc, sys; d = pyodbc.drivers(); print('Pilotes ODBC :', d); sys.exit('ODBC Driver 18 for SQL Server' not in d)"

COPY . .
RUN sed -i 's/\r$//' docker/entrypoint.sh

RUN useradd --create-home --uid 1000 app && mkdir -p /app/logs && chown -R app:app /app/logs
USER app

EXPOSE 8000

ENTRYPOINT ["sh", "/app/docker/entrypoint.sh"]
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--threads", "4", "--timeout", "120", "--access-logfile", "-"]
