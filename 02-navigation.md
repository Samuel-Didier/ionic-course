# 02 — Navigation : qui possède la pile (10 min)

> **Checkpoint** : tu ouvres un écran depuis la liste, tu fais deux `back`, le bouton retour **matériel** Android fait le même, et `ionViewWillEnter` se déclenche à chaque retour.

## Le modèle en une phrase

**Le Router Angular décide ; `IonRouterOutlet` dessine.** Ionic n'a pas de router : il *matérialise* la navigation Angular en pile animée (avec swipe-back), et y ajoute des hooks de vue.

```
AppComponent : <ion-router-outlet>
        │
        ├─ /tabs            → TabsPage        (pile: [tabs])
        │     ├─ /tabs/tab1 → Tab1Page        (pile: [tabs, tab1])
        │     └─ /tabs/tab2 → Tab2Page        (pile: [tabs, tab2])
        └─ /photo/:id       → PhotoDetailPage (pile: [tabs, photo/3])
                                 ↑
                    outlets imbriqués = piles imbriquées
```

## 1. Routes : params, guards, lazy

```ts
// app.routes.ts
export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes), // 1 outlet pour tout le tabs
  },
  {
    path: 'photo/:id',
    loadComponent: () => import('./app/photo-detail/photo-detail.page')
      .then((m) => m.PhotoDetailPage),
    canActivate: [authGuard],           // redirection avant création de la page
  },
  { path: '**', redirectTo: '', pathMatch: 'full' },
];
```

```ts
// lecture du paramètre + navigation
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NavController } from '@ionic/angular';

export class PhotoDetailPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private nav = inject(NavController);

  id = '';   // ⚠️ Angular 22 : OnPush + zoneless → un champ simple n'est pas re-rendu.
              //    Utilise un signal : id = toSignal(this.route.paramMap.pipe(map(p => p.get('id')!)), {initialValue: ''});
              //    ... ou ngOnInit + signal. Voir fiche 06.

  goBack() { this.nav.back(); }                       // remonte la pile Ion (transition animée)
  goTab()  { this.router.navigateByUrl('/tabs/tab1', { replaceUrl: true }); }
}
```

| Besoin | API |
|---|---|
| Empiler (aller-retour possible) | `nav.navigateForward('/x')`, `nav.back()` |
| Remplacer l'écran courant | `nav.navigateForward('/x', { animated: false })` ou `router.navigateByUrl('/x', { replaceUrl: true })` |
| Réinitialiser toute la pile | `router.navigateByUrl('/tabs/tab1', { replaceUrl: true })` |
| Rediriger | `router.navigateByUrl('/login')` |
| Params | `route.paramMap` (Observable) → `input()` si tu passes par `withComponentInputBinding()` |

**Erreur classique** : navigation vers une page *déjà dans la pile* sans `replaceUrl` → empilement infini et « back » qui ne sort pas.

## 2. Les hooks de vue (le vrai avantage d'Ionic)

`ngOnInit` ne se ré-exécute pas au retour : la page est **conservée** en pile. Les hooks Ionic, si.

```ts
import type { ViewWillEnter, ViewDidEnter, ViewWillLeave, ViewDidLeave } from '@ionic/angular';

@Component({ /* ... */ })
export class GalleryPage implements ViewWillEnter, ViewDidLeave {
  private photos = inject(PhotoService);

   ionViewWillEnter() { this.photos.loadSaved(); }   // à chaque retour sur la page → on relit
  ionViewDidLeave()  { /* on quitte la page */ }
}
```

| Hook | Quand | Usage typique |
|---|---|---|
| `ionViewWillEnter` | avant l'apparition | recharger des données (voir fiche 06 : **via un signal**) |
| `ionViewDidEnter` | apparition terminée | démarrer une animation, mesurer une taille |
| `ionViewWillLeave` | avant disparition | stopper un timer, un `ionInfiniteScroll` |
| `ionViewDidLeave` | disparition terminée | libérer des ressources (`ion-refresher`, `ion-slides`) |

⚠️ **Piège Angular 22 (Ionic 9)** : zoneless + `OnPush` par défaut ⇒ écrire `this.photos = await load()` dans `ionViewWillEnter` **ne rafraîchit pas la vue**. Il faut écrire dans un signal (`this.photos.set(...)`), qui notifie Angular. Détail et fix dans la fiche 06.

## 3. Les onglets (`ion-tabs`)

```html
<!-- tabs.page.html — v9 : PAS de <ion-router-outlet> à écrire, ion-tabs l'injecte -->
<ion-tabs>
  <ion-tab-bar slot="bottom">
    <ion-tab-button tab="tab1" href="/tabs/tab1">
      <ion-icon aria-hidden="true" name="images"></ion-icon>
      <ion-label>Photos</ion-label>
    </ion-tab-button>
    <ion-tab-button tab="settings" href="/tabs/settings">
      <ion-icon name="settings-outline"></ion-icon>
      <ion-label>Réglages</ion-label>
    </ion-tab-button>
  </ion-tab-bar>
</ion-tabs>
```

```ts
// tabs.routes.ts — les enfants become le contenu de ion-tabs
{
  path: 'tabs',
  component: TabsPage,
  children: [
    { path: 'tab1',    loadComponent: () => import('../tab1/tab1.page').then((m) => m.Tab1Page) },
    { path: 'settings',loadComponent: () => import('../settings/settings.page').then((m) => m.SettingsPage) },
    { path: '',        redirectTo: '/tabs/tab1', pathMatch: 'full' },
  ],
}
```

- `href` = navigation **réelle** (URL partageable, deep-link, bouton retour système cohérent).
- Chaque onglet est un outlet → sa **propre pile** : `tab1 → détail → retour` ne touche pas `tab2`.
- Icônes : `addIcons({ images, settingsOutline })` dans le **constructeur** du composant (voir `tabs.page.ts` du projet).

## 4. Menu latéral

```html
<!-- app.component.html -->
<ion-app>
  <ion-menu contentId="main-content" type="overlay">
    <ion-header><ion-toolbar><ion-title>Menu</ion-title></ion-toolbar></ion-header>
    <ion-content>
      <ion-list>
        <ion-item button [routerLink]="['/tabs/tab1']" routerDirection="root">
          <ion-icon slot="start" name="images"></ion-icon><ion-label>Galerie</ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-menu>
  <ion-router-outlet id="main-content"></ion-router-outlet>
</ion-app>
```

- `contentId` doit désigner l'outlet (`id="main-content"`).
- `routerDirection="root"` : vide la pile en naviguant (indispensable pour un menu).
- Par code : `menuController.open('menuId')` / `.toggle()` ; au sein d'une page : `<ion-menu-button></ion-menu-button>`.

## 5. Bouton retour

```html
<ion-toolbar>
  <ion-buttons slot="start">
    <ion-back-button defaultHref="/tabs/tab1" text=""></ion-back-button>
  </ion-buttons>
  <ion-title>Détail</ion-title>
</ion-toolbar>
```

- `defaultHref` = destination si l'écran a été atteint par deep-link (sinon le bouton ne fait rien).
- Ionic gère le **retour matériel Android** (`hardwareBackButton`) et pop l'overlay ouvert en priorité.
- Swipe-back : actif par défaut en mode `ios`, désactivable par outlet avec `<ion-router-outlet [swipeGesture]="false">` (Ionic 9).

## Checkpoint

1. Depuis `tab1`, clique sur un item → `PhotoDetailPage` avec `:id` dans l'URL.
2. Deux navigations avant, puis deux `ion-back-button` → tu retrouves exactement ta pile.
3. Rafraîchis la page sur `/tabs/tab1` → l'app redémarre **sur** cet onglet (grâce à `IonicRouteStrategy`).
4. Ajoute un `console.log` dans `ionViewWillEnter` : il passe à chaque retour, pas à chaque premier chargement seulement.
