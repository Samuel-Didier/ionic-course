# 08 — Tests, build, livraison (10 min)

> **Checkpoint** : `npm run build` + `npx cap copy android` produit une app qui démarre en moins de 2 s, et la checklist des 12 points est cochée.

## 1. Ce qu'on teste — et ce qu'on ne teste pas

| Niveau | Quoi tester | Exemple | Poids |
|---|---|---|---|
| Service | règles métier, signaux, gestion d'erreur | `add` place en tête ; `loadSaved` tolère un JSON corrompu | **90 % de la valeur** |
| Composant Angular | présence d'un élément clé + état vide / état erreur | « aucun résultat » s'affiche quand `photos()` est vide | léger |
| Ionic lui-même | rien | les `ion-*` sont déjà testés en amont | 0 |
| Visuel (pixels) | rien | surtout pas : purement décoratif, coûteux, instable | 0 |

```ts
// un test de service utile : le cas d'erreur est le plus souvent oublié
it('reste utilisable si le stockage est corrompu', async () => {
  Preferences.get = async () => ({ value: '{pas du json' });
  await expectAsync(service.loadSaved()).toBeResolved();
  expect(service.photos()).toEqual([]);
});
```

Mocks à connaître : `Platform` (`useValue: { is: () => false }`), `Preferences`, `Camera`, `Filesystem`, `NavController`, `ModalController`. Un test de composant Angular avec un overlay : fournis un stub.

## 2. Build : comprendre la config

```bash
npm run build                      # = ng build (production par défaut dans ce projet)
npm run build -- --configuration development   # build rapide + sourcemaps
```

Points d'attention d'`angular.json` :

| Option | Valeur | Pourquoi |
|---|---|---|
| `outputPath.base` | `www` | `webDir` de Capacitor : ne change pas sans syncing Capacitor |
| `budgets` (initial) | 2 mb warn / 5 mb error | un bundle qui explose = temps de démarrage |
| `budgets.anyComponentStyle` | 2 kb | gros SCSS de composant = coûteux |
| `outputHashing: 'all'` | — | cache navigateur fiable |
| `styles` | `global.scss`, `theme/variables.scss` | ordre = importance croissante |

Les icônes SVG `node_modules/ionicons/dist/ionicons/svg` sont copiées dans `/svg` par une entrée `assets`. Avec `addIcons()` (v8+), tu peux te passer de ce dossier : les icônes sont dans le bundle, **0 requête réseau**.

## 3. Checklist avant livraison (12 points)

**Performance**
1. Bundle initial < 1,5 Mo gzip ; `budgets` non violés.
2. Une seule requête par interaction (pas de double appel dans `ionViewWillEnter` + `ngOnInit`).
3. `track` sur tous les `@for` ; `@if` sur les zones_conditionnelles.
4. Images : `loading="lazy"`, dimensions définies, pas de base64 en mémoire.
5. Skeleton / spinner pendant le premier chargement (perceived speed).

**Robustesse**
6. Tous les écrans ont un **état vide** et un **état d'erreur** avec retry.
7. Permissions refusées gérées ; analytics/journalisation des erreurs.
8. `ion-refresher.complete()` / `ion-infinite-scroll` : pas de boucle infinie.
9. Testé en `ios` **et** `md`, en portrait **et** paysage, sur petit écran (iPhone SE 375 px).

**Livraison**
10. `npm run build` → `npx cap copy android` → signature (keystore / certificates iOS).
11. `appId` et version cohérents everywhere ; icône et splash screens replaced (1024×1024 pour les stores).
12. Upgrade de version `versionName` / `versionCode` (ou `CFBundleShortVersionString`) + notes de version.

## 4. PWA (optionnel mais fort)

```
ng add @angular/pwa        # service worker + manifest
```

- Le manifest déclare `display: standalone`, les icônes, `theme_color` (= `variables.scss` du coup cohérent).
- Le service worker met en cache la coquille : l'app s'ouvre hors-ligne, les requêtes API restent réseau.
- `platform.is('hybrid')` distingue l'app installée (PWA) du navigateur : mêmes plugins Capacitor, fork web.

## 5. Publier

| Cible | Étapes |
|---|---|
| Web | `npm run build` → dossier `www/` (ou `dist/…/browser`) sur Netlify/Vercel/nginx ; fallback SPA : **toutes les routes_unknown → `index.html`** |
| Android | `npx cap sync android` → `npx cap open android` → Build > Generate Signed Bundle (`.aab`) → Play Console |
| iOS | `npx cap sync ios` → Xcode → Archive → App Store Connect (facturation, privacy manifest) |

Détail crucial côté hébergeur : sans *rewrite* vers `index.html`, un partage de lien `/tabs/tab1` renvoie un 404.

## 6. Diagnostique express (si « ça marche chez moi » échoue)

| Symptôme probable | Cause |
|---|---|
| 404 sur `/tabs/tab1` en prod | pas de fallback SPA chez l'hébergeur |
| App blanche en release | sortie de build dans le mauvais dossier (`webDir` ≠ sortie de build), ou exception non gérée au boot |
| Styles absents en prod | `global.scss` non présent dans la config `styles` |
| Pas d'icônes en prod | `addIcons()` oublié ou assets `/svg` non copiés |
| Freeze au retour d'arrière | modale non dismissée → `dismissOnPageChange: true` |

## Checkpoint

1. `npm test` passe : 3 tests de service (dont le cas JSON corrompu).
2. `npm run build` sans warning de budget ; taille du bundle noté.
3. `npx cap copy android && npx cap run android` → l'app démarre et fonctionne hors-ligne sur la coquille.
4. Les 12 points de la checklist sont cochés (ou explicitement assumés).
