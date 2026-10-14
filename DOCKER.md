# Lancer Tahiry avec Docker
Cinq conteneurs : 
> SQL Server (base de données), 
> Redis (file de tâches), 
> backend (API Django), 
> worker (Celery : envoi des e-mails), 
> frontend (nginx : application React).

## Prérequis
> Docker Desktop (Windows, macOS) ou Docker Engine avec le plugin Compose (Linux).
> Processeur x86-64. Sur un Mac à puce Apple, activer « Use Rosetta for x86/amd64 emulation »

## Premier démarrage
> Créer .env en copiant le .env.docker.example
> Renseigner au minimum SECRET_KEY, DB_PASSWORD et SEED_ADMIN_PASSWORD (Pour la 1ere authentification) dans .env
> docker compose up -d --build
> docker compose logs -f backend (Verifier si le service backend est en écoute)

> Ouvrir ensuite http://localhost:8080 et se connecter avec `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

Au démarrage, le backend attend que SQL Server réponde, crée la base `DB_NAME` si elle n'existe pas,
applique les migrations, puis crée les permissions et le compte administrateur. Ces étapes sont sans
effet si elles ont déjà été faites : le mot de passe d'un administrateur existant n'est jamais modifié.

## Commandes utiles
> État des conteneurs : `docker compose ps` 
> Journaux d'un service : `docker compose logs -f backend` (ou `worker`, `frontend`, `db`) 
> Arrêter : `docker compose down` 
> Mettre à jour après une modification du code : `docker compose up -d --build` 
> Commande Django : `docker compose exec backend python manage.py <commande>` 
> Tests du backend : `docker compose exec backend python manage.py test --settings=config.settings.test` 
> Tout supprimer : `docker compose down -v` 

## Données
Les données SQL Server sont conservées dans le volume `tahiry_sqlserver-data` : elles survivent aux
arrêts et aux reconstructions. Seul `docker compose down -v` les efface.
SQL Server est accessible depuis SQL Server Management Studio ou Azure Data Studio :
serveur `localhost,1433`, utilisateur `sa`, mot de passe `DB_PASSWORD`, en cochant
« Faire confiance au certificat du serveur ».

## Accès depuis un autre poste
Pour ouvrir l'application depuis le réseau, ajouter l'adresse
du serveur dans `.env` :
> ALLOWED_HOSTS=localhost,127.0.0.1,backend,192.168.1.10

## Production
> Placer un proxy HTTPS devant le port 8080, puis mettre dans `.env` :
  `SECURE_SSL_REDIRECT=True` et `SECURE_HSTS_SECONDS=31536000`.
> Utiliser une édition de SQL Server adaptée (`MSSQL_PID`) et un compte applicatif dédié plutôt
  que `sa` ; pour une base créée par l'administrateur de bases de données, ajouter `DB_CREATE=0`.
> Configurer l'envoi SMTP (section E-mails de `.env`).
> Ne pas exposer le port 1433 hors du serveur (supprimer la ligne `ports` du service `db`).

## Dépannage
> `db` s'arrête aussitôt : Mot de passe `DB_PASSWORD` trop simple, ou mémoire insuffisante.
> `SQL Server injoignable` dans les journaux du backend : SQL Server met plus de 2 minutes à démarrer : relancer `docker compose up -d`, ou augmenter `DB_WAIT_SECONDS`.
> Erreur 400 `Bad Request` : L'adresse utilisée n'est pas dans `ALLOWED_HOSTS`.
> Erreur 502 sur `/api/` : Le backend démarre encore : consulter `docker compose logs backend`.
