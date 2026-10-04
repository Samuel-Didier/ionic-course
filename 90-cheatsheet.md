# 90 — Cheatsheet (à garder sous la main)

## Commandes

```bash
npm start                                   # ng serve (dev + HMR)
npm run build                               # build prod → www/
npm run watch                               # build dev continu (pour cap copy)
npm test                                    # tests (karma/vitest)
npm run lint                                # ESLint
ionic g page tabs/gallery                   # génère page + route
ionic g component shared/photo-card         # génère composant

npx cap init "Nom" io.x.y --web-dir=www
npx cap add android|ios
npx cap sync                               # plugins + web → natif
npx cap copy                               # web → natif (après build)
npx cap run android --live-reload
npx cap open android                       # Android Studio
npx cap doctor
npx @ionic/migrate --dry-run               # migration v8 → v9
```

## Bootstrap (main.ts)

```ts
defineCustomElements(window);
bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular({ mode: 'ios', animated: true, rippleEffect: true }),
    provideRouter(routes, withPreloading(PreloadAllModules), withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
});
```

```html
<!-- app.component.html -->
<ion-app>
  <ion-router-outlet></ion-router-outlet>
</ion-app>
```

## Imports

```ts
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton,
         ModalController, NavController, Platform, Config } from '@ionic/angular';
import type { ViewWillEnter, ModalOptions } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { camera, trash } from 'ionicons/icons';
import { IonModal } from '@ionic/angular';         // composant inline (standalone)
```
Ionic 9 : dans un composant **lazy** → importer depuis `@ionic/angular/lazy`.

## Squelette de page

```html
<ion-header [translucent]="true">
  <ion-toolbar>
    <ion-buttons slot="start"><ion-back-button defaultHref="/tabs/tab1"></ion-back-button></ion-buttons>
    <ion-title>Photos</ion-title>
    <ion-buttons slot="end"><ion-button (click)="add()"><ion-icon slot="icon-only" name="add"></ion-icon></ion-button></ion-buttons>
  </ion-toolbar>
</ion-header>

<ion-content [fullscreen]="true">
  <ion-refresher slot="fixed" (ionRefresh)="refresh($event)"><ion-refresher-content></ion-refresher-content></ion-refresher>
  <ion-list>
    @for (p of photos.photos(); track p.filepath) {
      <ion-item-sliding>
        <ion-item button [routerLink]="['/photo', p.id]">
          <img slot="start" [src]="p.webviewPath" [alt]="p.title" loading="lazy" />
          <ion-label>{{ p.title }}</ion-label>
        </ion-item>
        <ion-item-options side="end"><ion-item-option color="danger" (click)="remove(p)">Supprimer</ion-item-option></ion-item-options>
      </ion-item-sliding>
    } @empty { <ion-text color="medium">Vide</ion-text> }
  </ion-list>
  <ion-fab slot="fixed" vertical="bottom" horizontal="end"><ion-fab-button (click)="add()"><ion-icon name="camera"></ion-icon></ion-fab-button></ion-fab>
  <ion-infinite-scroll [disabled]="!hasMore()" (ionInfinite)="more($event)"><ion-infinite-scroll-content loadingSpinner="dots"></ion-infinite-scroll-content></ion-infinite-scroll>
</ion-content>
```

## Événements utiles

| Je veux | Binding |
|---|---|
| Frappe clavier | `(ionInput)` |
| Champ validé | `(ionChange)` |
| Perte de focus | `(ionBlur)` |
| Refresh pull | `(ionRefresh)` + `ev.target.complete()` |
| Pagination | `(ionInfinite)` + `ev.target.complete()` |
| Valeur d'un select/toggle/datetime | `($any($event).detail.value)` |
| Seuil de scroll | `[fixed]="true"` + `[disabled]` |

## Overlays

```ts
const t = await toastCtrl.create({ message: 'OK', duration: 2000 }); await t.present();

const l = await loadingCtrl.create({ message: '…' }); await l.present(); try { /* job */ } finally { await l.dismiss(); }

const a = await alertCtrl.create({ header: '?', buttons: [{ text: 'Non', role: 'cancel' }, { text: 'Oui', handler: () => go() }] }); await a.present();

const s = await actionSheetCtrl.create({ header: 'Choisir', buttons: [{ text: 'A' }, { text: 'B', role: 'destructive' }] }); await s.present();

const m = await modalCtrl.create({ component: DetailModal, componentProps: { id }, dismissOnPageChange: true }); await m.present();
const { data } = await m.onWillDismiss<{ saved: boolean }>();
```
Inline : `<ion-modal [isOpen]="open()" (didDismiss)="close()"><ng-template>…</ng-template></ion-modal>`

## Variables CSS du jour

```css
--ion-color-primary / -shade / -tint / -contrast / -rgb
--ion-background-color / --ion-text-color / --ion-item-background / --ion-toolbar-background
--ion-border-radius / --ion-padding / --ion-min-height
--ion-safe-area-top / --ion-safe-area-bottom
```
Thème : `src/theme/variables.scss` (`:root` + `.ion-palette-dark`). Socle : `@import "@ionic/angular/css/core.css"`.

## Plateforme & natif

```ts
Capacitor.isNativePlatform();  platform.is('hybrid' | 'ios' | 'android' | 'web' | 'tablet' | 'desktop');
await Camera.getPhoto({ quality: 80, resultType: CameraResultType.Uri });
await Filesystem.writeFile({ path, data, directory: Directory.Data });
await Preferences.set({ key: 'k', value: JSON.stringify(v) });
img.src = Capacitor.convertFileSrc(uri);
```

## Cycle de vie de page

```ts
ngOnInit                       // 1re instanciation uniquement
ionViewWillEnter()             // chaque apparition  → recharger les données
ionViewDidEnter()              // chaque apparition terminée
ionViewWillLeave() / ionViewDidLeave()  // nettoyage
```

## 6 réflexes de débug

1. `mode: 'ios'` **puis** `'md'` : 80 % des « bugs visuels » sont des différences de rendu.
2. Commenter le `imports: []` du composant : un `ion-*` manquant ne fait rien de visible.
3. Chercher « est-ce un signal ? » : hors signal, pas de rendu (zoneless).
4. `npx cap sync` après chaque plugin ajouté.
5. DevTools mobile :+iPhone avec encoche, et 375 px de large.
6. Console native : `chrome://inspect` (Android) / Web Inspector (iOS).
