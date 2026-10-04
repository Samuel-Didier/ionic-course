# 01 — Démarrage : anatomie d'une app (10 min)

> **Checkpoint** : `npm start` affiche 3 onglets ; tu sais expliquer les 3 lignes de `main.ts` qui font marcher Ionic ; tu as créé un 4ᵉ écran routé en 4 commandes.

## 1. Créer / démarrer

```bash
# starter officiel (npx ionic = CLI Ionic, nécessite Node)
ionic start photo-gallery --type=angular --capacitor   # ou : npm create @ionic/app
```

Le projet de ce cours est déjà généré : `cd ../sam_app && npm install && npm start`
(`npm start` = `ng serve`. Le CLI `ionic` n'est **pas** requis pour développer : Angular CLI suffit.)

| Commande | Effet |
|---|---|
| `npm start` | serveur de dev sur `http://localhost:4200`, rechargement à chaud |
| `npm run build` | build de prod dans `www/` (c'est ce dossier que Capacitor embarque) |
| `npm run watch` | build dev continu (utile pour `cap copy`) |
| `npm test` / `npm run lint` | Karma (ou Vitest) / ESLint |
| `ionic g page tabs/gallery` | génère page + route + enregistrement dans le module de routes |

## 2. Arborescence commentée (le vocabulaire est dans les noms)

```
src/
├── main.ts                 ← bootstrap : providers (Ionic + Router)
├── index.html              ← viewport-fit=cover (safe areas), meta mobile
├── global.scss             ← imports des CSS "core" d'Ionic + utilitaires
├── theme/variables.scss    ← THÈME : couleurs, variables CSS Ionic
└── app/
    ├── app.component.html  ← <ion-app><ion-router-outlet></ion-router-outlet></ion-app>
    ├── app.routes.ts       ← routes racine (lazy load)
    ├── tabs/
    │   ├── tabs.page.html  ← <ion-tabs> + <ion-tab-bar slot="bottom">
    │   └── tabs.routes.ts  ← routes enfants des onglets
    ├── tab1|tab2|tab3/     ← pages routées (header + content)
    └── services/
        └── photo.service.ts  ← état + Capacitor (caméra, fichiers, Preferences)
capacitor.config.ts         ← appId, appName, webDir: "www"
android/ ios/               ← projets natifs générés par `npx cap add`
```

## 3. `main.ts` ligne à ligne (le heart du démarrage)

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';
import { defineCustomElements } from '@ionic/pwa-elements/loader';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';

defineCustomElements(window);   // ← PWA Elements : <input type="file" pick="camera"> sur le web

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },  // ①
    provideIonicAngular(),                                          // ②
    provideRouter(routes, withPreloading(PreloadAllModules)),        // ③
  ],
}).catch((err) => console.error(err));
```

| # | Provider | Rôle | Casser quoi si absent |
|---|----------|------|------------------------|
| ① | `IonicRouteStrategy` | Recharge le document **seulement** au refresh d'une URL profonde ; le reste passe par le router Angular | L'app se recharge à chaque navigation ; animations et état perdus |
| ② | `provideIonicAngular()` | Installe Ionic : mode (`ios`/`md`), animations, ripple, config globale | Composants non stylés / non fonctionnels |
| ③ | `provideRouter(routes, withPreloading(...))` | Router Angular + préchargement des routes | Navigation absente |

Options utiles de `provideIonicAngular(config)` :

```ts
provideIonicAngular({
  mode: 'ios',            // force le rendu (par défaut : auto iOS/Android)
  animated: true,         // false = désactiver toutes les transitions (app très lente)
  rippleEffect: true,     // effet Material au tap
  innerHTMLTemplatesEnabled: false, // sécurité : pas d'HTML custom dans les overlays
})
```

## 4. La coquille de l'app : deux balises, pas plus

```html
<!-- app.component.html — minimal et définitif -->
<ion-app>
  <ion-router-outlet></ion-router-outlet>
</ion-app>
```

- `ion-app` : racine obligatoire. Gère les safe areas, le fond, les transitions, le menu.
- `ion-router-outlet` : **un seul outlet racine** (dans `ion-app`). Il transforme la navigation Angular en pile visuelle avec transition + swipe-back.
- Une page (ex. `tab1.page.html`) contient alors `ion-header` / `ion-content` (et éventuellement `ion-footer`) — voir fiche 03.

## 5. Ajouter un écran en 4 commandes

```bash
ionic g page tabs/gallery            # 1. génère src/app/tabs/gallery/
# 2. la route est enregistrée dans tabs.routes.ts (lazy: loadComponent)
# 3. ajoute <ion-tab-button tab="gallery" href="/tabs/gallery"> dans tabs.page.html
# 4. npm start  →  l'onglet apparaît et se sélectionne au clic
```

Le bout de route généré (et la seule forme à écrire à la main) :

```ts
{
  path: 'gallery',
  loadComponent: () => import('../tabs/gallery/gallery.page').then((m) => m.GalleryPage),
}
```

> **Ionic 9** : dans un composant *lazy*, importe les composants Ionic depuis `@ionic/angular/lazy` (pas `@ionic/angular`) — bundle plus petit. Voir `91-pieges-v9.md`.

## ⚠️ Les 5 erreurs de démarrage les plus fréquentes

| Symptôme | Cause | Fix |
|---|---|---|
| Page blanche, console pleine d'erreurs `ion-*` | composants non importés dans `imports: []` du composant standalone | chaque `ion-*` utilisé figure dans `imports` |
| Styles absents | `global.scss` n'importe pas les `@ionic/angular/css/core.css` | voir fiche 05 |
| Rechargement complet à chaque navigation | `IonicRouteStrategy` manquant | provider ① |
| `undefined is not an object (ion-...)` | `defineCustomElements(window)` non appelé et plugin web utilisé | appel avant `bootstrapApplication` |
| Bande noire / contenu sous l'encoche | `viewport-fit=cover` manquant dans `index.html` | ajouter le meta viewport |
