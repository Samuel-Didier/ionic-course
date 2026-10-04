# 91 — Pièges : ce qui casse (à relire avant tout commit)

Deux listes : **(A)** ce qui a changé dans Ionic 9 / Angular 22 (à vérifier une fois), **(B)** les pièges du quotidien (à relire souvent).

---

## A. Ionic 8 → 9 : les changements qui cassent le code

| Changement | Conséquence | Fix |
|---|---|---|
| Import standalone par défaut | `@ionic/angular/standalone` devient `@ionic/angular` ; `@ionic/angular/lazy` pour le lazy | `npx @ionic/migrate --dry-run` puis migre |
| `IonicModule` déprécié | fonctionne encore, Removed plus tard | `provideIonicAngular()` (fonctionne en standalone **et** NgModule) |
| Pas de préfixe `~` dans les imports CSS | `@import "~@ionic/angular/css/core.css"` casse le build Angular actuel | retirer le `~` |
| Zoneless supporté (défaut sur Angular 21+) | pas besoin de `provideZoneChangeDetection` | si tu as `zone.js` en `polyfills`, le mode zoneless est conditionné à son absence |
| Angular 22 : `OnPush` par défaut | un champ muté depuis `ionViewWillEnter` ne rend plus rien | **signals** (fiche 06) |
| Capacitor 7+ requis ; `isNative` (Cap 2) supprimé | `platform.is('native')` peut mentir | `Capacitor.isNativePlatform()` / `platform.is('hybrid')` |
| `ion-img` déprécié | à remplacer | `<img loading="lazy">` |
| `ion-datetime` : plus de `ion-buttons` dans `slot="buttons"` | styles cassés si tu y comptais | utiliser un `<div>` |
| `ion-picker-legacy*` supprimé | n'est plus dans le bundle | `ion-datetime` avec `preferWheel` |
| `ion-nav` sans intégration `ion-router` | plus de router intégré dans `ion-nav` | API impérative (`root`, `push`, `pop`, `setRoot`) uniquement |
| `ion-router-outlet [swipeGesture]` | le swipe global devient par outlet | `(swipeGesture)` = `false` si besoin |
| `ion-modal.handleBehavior` = `'cycle'` | la poignée est focusable et fait défiler les breakpoints (iOS) | revenir à `'none'` si besoin |
| `ionChange` ne se déclenche que si la valeur change | `ion-select` / `ion-toggle` : faux déclenchements en moins (correction) | ne dépends plus d'un `ionChange` « cosmétique » |
| `autocorrect` de `ion-input` = `boolean` | `autocorrect="off"` **active** l'autocorrect (coercition) | écrire `autocorrect="false"` ou `[autocorrect]="false"` |
| Floated labels avec contenu slotted | les labels ne flottent plus automatiquement |:focus ou valeur requise |
| `ion-textarea` (md) : hauteur min 72 px | hauteur différente de v8 | `rows` explicite si besoin |
| Grid : `push` / `pull` supprimés | plus d'effet | `order` |
| `ion-card-content`, `ion-textarea`, `ion-radio-group`, `ion-input-otp` en Shadow DOM | CSS internes inaccessibles | shadow parts / variables CSS ; les `h1..h6` de `ion-card-content` n'ont plus de style |
| Rayons par défaut button/card/chip alignés guidelines (iOS 6 px, md pill) | apparence différente | `shape="soft"` / `shape="round"`, ou `--border-radius` |
| Navigateurs supportés revus | ancien Safari/IE hors support | voir le guide navigateur |
| React 18+ / Vue Router 5+ requis (autres frameworks) | — | hors périmètre Angular |

---

## B. Les 12 pièges du quotidien (classement par fréquence réelle)

### 1. Le composant `ion-*` n'est pas dans `imports`
Standalone = pas d'import implicite. Symptôme : l'élément s'affiche « cru » (sans style), sans erreur claire.
`grep` sur le template → chaque balise `ion-*` doit exister dans `imports`.

### 2. Zoneless + OnPush : le re-rendu fantôme
`ionViewWillEnter() { this.items = await load(); }` → rien ne bouge. Les signaux sont le canal d'état (`photos.set(...)`), pas une affectation de champ. Même problème avec `platform.ready().then(() => this.x = …)` et avec les événements Web Componentsbranchés à la main.

### 3. `@for` sans `track`
Recréation complète du DOM à chaque rendu : flickers, perte de scroll, animations cassées, perfs.
`@for (p of photos(); track p.id) { }`

### 4. `ion-refresher` / `ion-infinite-scroll` : `complete()` oublié
Le spinner tourne indéfiniment et la requête est rejouée en boucle. Toujours dans un `finally`.

### 5. `ionInput` vs `ionChange`
Brancher une requête serveur sur `(ionInput)` = une requête par frappe. `debounce` + `switchMap`, sinon tu vas saturer l'API.

### 6. La modale qui ne rend pas
`ion-modal` **inline** : contenu dans `<ng-template>`, `[isOpen]` + `(didDismiss)`, et le composant qui le déclare doit être `standalone` avec `IonModal` dans `imports`. Une modale `controller` oubliée `dismiss()` bloque tous les gestes ensuite.

### 7. Navigation qui empile à l'infini
`navigate` vers une page déjà dans la pile sans `replaceUrl` / `routerDirection="root"` → le bouton retour ne sort jamais.

### 8. CSS qui ne s'applique pas sur un composant
Shadow DOM. Utilise variables CSS, `::part(...)` ou le style du slot que tu écris. `ion-input .input-wrapper` ne peut pas fonctionner. Et `!important` sur un composant = dette.

### 9. Fichier natif invisible dans la WebView
`file://` bloqué par la WebView : passes par `Capacitor.convertFileSrc(uri)`. Sur le web, une photo stockée dans Filesystem n'est plus lisible après rechargement : il faut la relire en base64 au moment du rendu.

### 10. Plugin installé mais pas dans le natif
`npm i @capacitor/x` puis **oubli** de `npx cap sync` → `plugin not implemented` au runtime. `npx cap doctor` détecte l'incohérence.

### 11. Deep-link / refresh qui renvoie 404
Côté hébergeur : toutes les routes inconnues doivent servir `index.html`. Côté Ionic : `IonicRouteStrategy` doit être fourni, sinon chaque navigation recharge le document.

### 12. Safe areas
`viewport-fit=cover` dans `index.html` + `ion-header`/`ion-footer` réels. Un `div` « collé en bas » n'est pas protégé : `env(safe-area-inset-bottom)`.

---

## Bonus — l'anti-motif « 100 % natif trop tôt »

```
symptôme : « la caméra marche sur mon téléphone mais pas dans le navigateur »
           ↓
 cause   : le code ne contient que le chemin natif ; aucun fallback web
           ↓
 règle   : branche → exécute → await → gère l'erreur → degrade proprement (jamais crash blanc)
```
