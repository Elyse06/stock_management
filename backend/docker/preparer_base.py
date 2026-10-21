import os
import re
import sys
import time


def encoder(valeur):
    if ";" in valeur or valeur.strip(" ").startswith("{"):
        return "{" + valeur.replace("}", "}}") + "}"
    return valeur


def message(exc):
    texte = " ".join(str(a) for a in getattr(exc, "args", ()) if a) or str(exc)
    return re.sub(r"\s+", " ", texte)[:300]


def attendre_sql_server():
    import pyodbc

    nom = os.environ.get("DB_NAME", "")
    if not re.fullmatch(r"[A-Za-z0-9_]+", nom):
        sys.exit(f"DB_NAME invalide : « {nom} » (lettres, chiffres et _ uniquement).")
    pilote = os.environ.get("DB_DRIVER", "ODBC Driver 18 for SQL Server")
    if pilote not in pyodbc.drivers():
        sys.exit(f"Pilote ODBC « {pilote} » introuvable. Pilotes installés : {pyodbc.drivers()}")
    serveur = f"{os.environ.get('DB_HOST', 'localhost')},{os.environ.get('DB_PORT', '1433')}"
    chaine = (
        f"DRIVER={{{pilote}}};SERVER={serveur};DATABASE=master;"
        f"UID={encoder(os.environ.get('DB_USER', ''))};PWD={encoder(os.environ.get('DB_PASSWORD', ''))};"
        f"Encrypt=yes;TrustServerCertificate={os.environ.get('DB_TRUST_CERT', 'no')}"
    )
    attente = int(os.environ.get("DB_WAIT_SECONDS", "120"))
    limite = time.monotonic() + attente
    derniere_erreur = None
    tentative = 0
    while time.monotonic() < limite:
        tentative += 1
        try:
            connexion = pyodbc.connect(chaine, autocommit=True, timeout=5)
        except pyodbc.Error as exc:
            derniere_erreur = message(exc)
            print(f"SQL Server ({serveur}) pas encore joignable, tentative {tentative} : {derniere_erreur}", flush=True)
            time.sleep(3)
            continue
        with connexion:
            if os.environ.get("DB_CREATE", "1") == "1":
                existe = connexion.execute("SELECT DB_ID(?)", nom).fetchone()[0] is not None
                if not existe:
                    # Le nom est validé par l'expression régulière : il ne peut pas injecter de SQL.
                    connexion.execute(f"CREATE DATABASE [{nom}]")
                    print(f"Base « {nom} » créée.", flush=True)
                else:
                    print(f"Base « {nom} » déjà présente.", flush=True)
        return
    sys.exit(f"SQL Server injoignable après {attente} s. Dernière erreur : {derniere_erreur}")


if __name__ == "__main__":
    if os.environ.get("DB_ENGINE", "mssql") == "mssql":
        attendre_sql_server()