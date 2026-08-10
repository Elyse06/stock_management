# Système de gestion de stock

Application interne de suivi de parc matériel : catalogue, fournisseurs, commandes internes, mouvements de stock multi-magasins, inventaires, traçabilité par lot/numéro de série.

## Prérequis
- Python 3.12+, Node.js 20+

## Base de données

- SQL Server (via `mssql-django` + `pyodbc`)

## Démarrage

**Backend** — nécessite le driver ODBC "ODBC Driver 18 for SQL Server" installé sur la machine

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   
python manage.py migrate
python manage.py runserver
```

**Frontend**
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```
