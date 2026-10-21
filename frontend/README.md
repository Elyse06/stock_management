# Tahiry — Frontend

Interface web de gestion des stocks, inventaires et commandes de Paositra Malagasy.

**Pile** : React 19, MUI 9 (dont DataGrid), TanStack Query 5, React Router 7, axios, Recharts, Vite 8.
Node.js ≥ 20.19.

## Démarrer

```bash
cp .env.example .env      # puis renseigner VITE_API_BASE_URL
npm ci
npm run dev               # http://localhost:5173
```

| Script | Rôle |
|---|---|
| `npm run dev` | Serveur de développement (rechargement à chaud) |
| `npm run build` | Compilation de production dans `dist/` |
| `npm run preview` | Sert le build localement |
| `npm run lint` | Lint (oxlint) |
| `npm run check` | Lint puis build : à lancer avant chaque livraison |

Les tests de bout en bout sont décrits dans [`e2e/README.md`](e2e/README.md).

## Organisation du code

```
src/
  app/          Shell : App, providers, routes (une page = un fichier chargé à la demande)
  components/   Composants partagés, par rôle : data-display, feedback, forms, import, layout, table, wizard
  config/       endpoints.js (toutes les URL de l'API), env.js, queryClient.js
  constants/    Messages, permissions, pagination, libellés des champs de l'API
  features/     Un dossier par domaine métier
    <domaine>/
      api/        Appels à l'API du domaine
      components/ Composants propres au domaine
      constants/  Listes de valeurs, règles simples
      hooks/      État et logique (formulaires, mutations)
      pages/      Une page par route
      utils/      Fonctions pures (calculs, validations, construction des requêtes)
  hooks/        Hooks partagés (listes paginées, CRUD, notifications, données de référence…)
  lib/api/      Client HTTP, jetons, erreurs, pagination, ressource REST générique
  styles/       Thème MUI
  utils/        Fonctions partagées (dates, export CSV, impression, bénéficiaires…)
```

### Conventions

- **Imports** : chemin relatif à l'intérieur d'une feature, alias `@/` pour tout le reste.
  Une feature n'importe pas les fichiers internes d'une autre feature. Seuls points d'entrée partagés :
  `auth` (`usePermission`, `AuthContext`) et, dans `mouvements`, `MouvementFormModal` et `MouvementDetailModal`
  (réutilisés par le tableau de bord et l'historique).
- **Taille** : aucun fichier au-delà de 300 lignes. La logique va dans un hook ou une fonction pure de `utils/`,
  l'affichage dans des sous-composants.
- **Données serveur** : toujours via TanStack Query (`usePaginatedList`, `useOptions`, `useReferenceData`,
  `useCrudMutations`) ; pas de `useEffect` + `useState` pour charger des données.
- **Listes** : la pagination est faite par le serveur (100 lignes maximum par page). `fetchAllPages` sert
  uniquement aux listes de choix.
- **Droits** : `usePermission()` reprend exactement les règles du backend. Le menu et les gardes de route
  lisent la même déclaration (`app/router/navigation.js`).
- **Erreurs** : `getErrorMessage()` convertit toute erreur de l'API en message lisible, avec le nom du champ
  en cause (`constants/fieldLabels.js`).
- **URL de l'API** : uniquement dans `config/endpoints.js`.

## Sécurité

- Le jeton d'accès reste **en mémoire** ; seul le jeton de rafraîchissement est stocké. Il est renouvelé
  automatiquement, une seule fois même si plusieurs requêtes échouent en même temps. La déconnexion est
  propagée aux autres onglets et vide le cache.
- Les exports CSV neutralisent les formules (`= + - @`), et l'impression d'étiquettes n'interpole aucune donnée
  dans du HTML.
- Les variables `VITE_*` sont intégrées au code envoyé au navigateur : **aucun secret** ne doit y figurer.

## Déploiement

L'image de production compile l'application puis la sert avec nginx (sans privilèges root, port 8080) :

```bash
docker build --build-arg VITE_API_BASE_URL=https://api.exemple.mg -t tahiry-frontend .
docker run -p 8080:8080 -e API_ORIGIN=https://api.exemple.mg tahiry-frontend
```

`API_ORIGIN` alimente la politique de sécurité du contenu (CSP) : le navigateur refuse toute requête vers un
autre serveur. La configuration (`deploy/nginx.conf.template`) ajoute les en-têtes de sécurité, met en cache
longue durée les fichiers versionnés, ne met jamais `index.html` en cache et renvoie l'application pour
toute URL directe.

`Dockerfile.dev` lance le serveur de développement dans un conteneur.
