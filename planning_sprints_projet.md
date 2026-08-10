# Planning Scrum — Système de gestion de stock / parc matériel interne

Sprints de 2 semaines. Chaque sprint est autonome : à la fin, quelque chose de testable existe. L'ordre respecte les dépendances techniques (pas de frontend avant une API stable, pas d'IA avant des données réelles à observer).

---

## Sprint 0 — Cadrage & infrastructure (2 semaines)

**Objectif** : avoir un socle technique qui tourne, avant d'écrire la moindre fonctionnalité métier.

| Tâche | Détail | Livrable |
|---|---|---|
| Dépôt Git | Structure monorepo `backend/` + `frontend/`, `.gitignore`, README | Repo initialisé |
| Environnements | `dev`, `staging`, `prod` séparés (fichiers `.env`) | 3 configs |
| Docker | `docker-compose.yml` : Django, SQL Server, Redis, React | Stack locale fonctionnelle |
| Projet Django | `django-admin startproject config`, structure `apps/` | `manage.py check` OK |
| Projet React | Scaffolding Vite, routing de base, appel `ping` vers l'API | Page blanche connectée à l'API |
| CI basique | Lint + tests automatiques à chaque push (GitHub Actions) | Pipeline vert |

**Definition of Done** : un développeur clone le repo, lance `docker-compose up`, voit la page React qui affiche une réponse du backend Django.

---

## Sprint 1 — Modèles de données & authentification (2 semaines)

**Objectif** : les 4 apps métier existent en base, l'authentification fonctionne.

| Tâche | Détail |
|---|---|
| App `utilisateurs` | Modèles `Profil`, `Employe`, `Utilisateur` + migrations |
| App `catalogue` | Modèles `Categorie`, `Article`, `Fournisseur`, `ArticleFournisseur` |
| App `achats` | Modèles `Commande`, `DetailCommande` |
| App `stock` | Modèles `Magasin`, `Mouvement`, `DetailMouvement`, `Inventaire` |
| Authentification | `djangorestframework-simplejwt`, login/refresh/logout |
| Admin Django | Enregistrer tous les modèles pour pouvoir tester manuellement dès ce sprint |
| Données de test | Fixtures ou script `seed.py` avec données réalistes |

**Definition of Done** : on peut se connecter via l'API, créer un utilisateur, un article, un magasin depuis l'admin Django.

---

## Sprint 2 — API REST des modules métier (2 semaines)

**Objectif** : CRUD complet exposé en API pour les 4 apps métier.

| Tâche | Détail |
|---|---|
| Serializers | Un par modèle, avec validation métier (ex: `ecart` calculé, quantités positives) |
| ViewSets DRF | CRUD + filtres (par catégorie, par magasin, par statut de commande) |
| Permissions | Basées sur `Profil` (ex: seul un profil "Agent" peut traiter une commande) |
| Documentation API | `drf-spectacular` ou équivalent → Swagger/OpenAPI généré automatiquement |
| Tests API | Tests d'intégration sur les endpoints critiques (création commande, mouvement) |

**Definition of Done** : toutes les entités du MCD sont manipulables via l'API, documentée et testée.

---

## Sprint 3 — Frontend : socle & authentification (2 semaines)

**Objectif** : coquille applicative React fonctionnelle, connectée à l'API.

| Tâche | Détail |
|---|---|
| Layout général | Navigation, sidebar par module (catalogue, stock, achats, admin) |
| Auth React | Formulaire login, stockage du token, routes protégées |
| Client API | Wrapper axios/fetch centralisé, gestion des erreurs et du refresh token |
| Composants partagés | Table générique, formulaire générique, modales, notifications |
| Gestion des rôles | Masquer/afficher des sections selon le `Profil` de l'utilisateur connecté |

**Definition of Done** : un utilisateur se connecte, voit un tableau de bord vide mais navigable selon son profil.

---

## Sprint 4 — Frontend : catalogue & fournisseurs (2 semaines)

| Tâche | Détail |
|---|---|
| Liste & fiche article | Recherche, filtres par catégorie, pagination |
| Formulaire article | Création/édition, association fournisseurs et prix d'achat |
| Gestion catégories | CRUD simple |
| Gestion fournisseurs | CRUD + liste des articles liés |

**Definition of Done** : gestion complète du catalogue utilisable en conditions réelles.

---

## Sprint 5 — Frontend : achats & mouvements de stock (2 semaines)

| Tâche | Détail |
|---|---|
| Workflow commande | Demande → traitement → validation, avec les 2 rôles distincts (demandeur/traitant) |
| Détails commande | Ajout de lignes d'articles avec quantités |
| Mouvements de stock | Entrée / sortie / transfert entre magasins, avec sélection source/destination |
| Vue magasin | Stock actuel par magasin (calculé depuis les mouvements) |
| Module inventaire | Saisie quantité physique, calcul et affichage de l'écart |

**Definition of Done** : cycle complet demande → commande → réception → mouvement de stock utilisable de bout en bout.

---

## Sprint 6 — Traçabilité : code-barres, lots, numéros de série (3 semaines)

**Objectif** : introduire le suivi fin par unité/lot avec dates de péremption.

| Tâche | Détail |
|---|---|
| Modèles backend | `Lot`, `UniteSerie`, extension `Article.mode_suivi` et `code_barre` |
| Migration & validation | Contrainte applicative : un `DetailMouvement` référence lot XOR unité XOR rien, selon `mode_suivi` |
| Scan code-barres | Intégration d'une lib de lecture caméra côté React (ex: `@zxing/browser`) |
| UI lot/série | Écrans de génération, recherche, affectation d'unités et de lots |
| Alertes péremption (base) | Vue listant les lots proches de la date de péremption |

**Definition of Done** : on peut scanner un code-barres, créer un lot avec date de péremption, affecter une unité de série à un mouvement.

---

## Sprint 7 — Automatisation (2 semaines)

**Objectif** : le système agit tout seul sur des règles simples et traçables.

| Tâche | Détail |
|---|---|
| App `automatisation` | Modèles `RegleAutomatisation`, `JournalExecution` |
| Celery + Redis | Configuration des workers et de Celery Beat (tâches planifiées) |
| Règle : seuil de réappro | Génère une `Commande` si stock < seuil défini par article/magasin |
| Règle : alerte péremption | Notifie X jours avant `Lot.date_peremption` |
| Règle : régularisation | Suggère un `Mouvement` de régularisation si écart d'inventaire détecté |
| UI administration règles | Activer/désactiver, consulter le journal d'exécution |

**Definition of Done** : une règle activée déclenche automatiquement une action visible et journalisée, désactivable à tout moment.

---

## Sprint 8 — Modules IA via API (2 semaines)

**Objectif** : brancher l'API IA (pas de ML local) sur des cas d'usage concrets.

| Tâche | Détail |
|---|---|
| App `intelligence` | `ai_client.py` (wrapper unique vers l'API IA), modèle `RequeteIA` (log des appels) |
| Analyse d'écart d'inventaire | Appel IA qui classifie et explique un écart en langage clair |
| Assistant recherche stock | Endpoint en langage naturel avec function calling sur la base |
| Résumé d'activité | Génération de synthèses périodiques par magasin |
| Suivi des coûts | Tableau de bord des appels API (nombre, coût estimé) |

**Definition of Done** : un utilisateur pose une question en langage naturel sur le stock et obtient une réponse pertinente basée sur les données réelles.

---

## Sprint 9 — Sécurité, permissions fines & tests (2 semaines)

**Objectif** : durcir avant mise en production.

| Tâche | Détail |
|---|---|
| Permissions par action | Au-delà du profil : qui peut valider une commande, qui peut désactiver une règle d'automatisation |
| Journal d'audit | Traçabilité des actions sensibles (qui a fait quoi, quand) |
| Tests de charge légers | Vérifier le comportement sous usage réaliste (nombre d'articles, de mouvements) |
| Revue de sécurité | Vérification CORS, secrets, injections, rate limiting sur l'API IA |
| Couverture de tests | Backend et frontend sur les parcours critiques |

**Definition of Done** : rapport de tests et de sécurité sans blocant majeur.

---

## Sprint 10 — Déploiement & documentation (2 semaines)

| Tâche | Détail |
|---|---|
| Déploiement production | Serveur cible, HTTPS, sauvegardes base de données automatisées |
| Documentation technique | README, schéma d'architecture, guide de déploiement |
| Documentation utilisateur | Guide par profil (magasinier, agent, admin) |
| Formation | Session de prise en main avec les futurs utilisateurs |
| Plan de bascule | Import des données existantes si migration depuis un système actuel |

**Definition of Done** : application accessible en production, utilisateurs formés, documentation à jour.

---

## Vue d'ensemble

| Sprint | Thème | Durée | Cumul |
|---|---|---|---|
| 0 | Infrastructure | 2 sem | 2 sem |
| 1 | Modèles & auth | 2 sem | 4 sem |
| 2 | API REST | 2 sem | 6 sem |
| 3 | Frontend socle | 2 sem | 8 sem |
| 4 | Frontend catalogue | 2 sem | 10 sem |
| 5 | Frontend achats/stock | 2 sem | 12 sem |
| 6 | Lots/séries/péremption | 3 sem | 15 sem |
| 7 | Automatisation | 2 sem | 17 sem |
| 8 | IA via API | 2 sem | 19 sem |
| 9 | Sécurité & tests | 2 sem | 21 sem |
| 10 | Déploiement | 2 sem | 23 sem |

**Durée totale estimée : ~23 semaines (environ 5,5 mois)**, avec une équipe stable. Les sprints 3-5 (frontend) peuvent être menés en parallèle du sprint 2 finissant si vous avez plus d'une personne — dans ce cas, comptez plutôt 18-19 semaines.

## Recommandations pour ne pas se perdre

- **Ne sautez pas le Sprint 0.** Un socle CI/Docker qui fonctionne dès le départ évite des semaines de dette technique plus tard.
- **Chaque sprint doit se terminer par une démo utilisable**, même minimale — c'est ce qui garde le projet ancré dans le concret.
- **Les sprints 6 (lots/séries) et 8 (IA) sont les plus à risque** en termes d'estimation — prévoyez une marge, ou scindez-les si besoin en sous-tâches plus petites en cours de sprint.
- **Ne commencez pas l'automatisation (Sprint 7) avant d'avoir des données réelles** issues des sprints précédents — une règle testée sur des données de test ne révèle pas les vrais cas limites.
