# 04 — Overlays : modale, alert, action sheet, popover, toast, loading (12 min)

> **Checkpoint** : une modale **inline** qui présente un `ion-input`, se ferme par `ion-backdrop`, et **renvoie sa valeur** à la page appelante. Plus un toast d'erreur.

## Table de décision (la seule à mémoriser)

| Intention de l'utilisateur | Overlay | Renvoie une donnée ? |
|---|---|---|
| « Je dois saisir quelque chose » (formulaire complet) | **`ion-modal`** | oui (`onDidDismiss` → `data`) |
| « Je dois choisir UNE option » (select, choix court) | `ion-alert` avec `inputs: [{type:'radio'}]` | oui (index) |
| « Je dois confirmer / supprimer » | `ion-alert` (boutons) | oui (`role`) |
| « Je dois choisir PARMIQUOI ? » (2–6 actions) | `ion-action-sheet` | oui (`role`) |
| « Ce menu est lié à UN élément » | `ion-popover` (`event: 'click'`) | non (contexte) |
| « C'est fait / c'est échoué » (non bloquant) | `ion-toast` | non |
| « Patiente » (opération en cours) | `ion-loading` | non |

> Règle : **une modale = une tâche**. Si l'utilisateur doit « annuler ou valider », c'est un formulaire → modale. S'il doit « choisir A ou B », c'est un `ion-alert`.

## 1. Modale déclarative (inline) — la plus simple, la plus testable

```html
<!-- gallery.page.html -->
<ion-content>
  <ion-button (click)="open = true">Nouvelle photo</ion-button>

  <ion-modal [isOpen]="open" (didDismiss)="onClosed($event)">
    <ng-template>
      <ion-header><ion-toolbar>
        <ion-title>Légende</ion-title>
        <ion-buttons slot="start">
          <ion-button (click)="open = false">Annuler</ion-button>
        </ion-buttons>
      </ion-toolbar></ion-header>

      <ion-content class="ion-padding">
        <ion-input label="Titre" fill="outline" [(ngModel)]="draftTitle" name="draftTitle"></ion-input>
        <ion-textarea label="Description" fill="outline" [autoGrow]="true" [(ngModel)]="draftNote" name="draftNote"></ion-textarea>
        <ion-button expand="block" (click)="save()">Enregistrer</ion-button>
      </ion-content>
    </ng-template>
  </ion-modal>
</ion-content>
```

```ts
readonly open = signal(false);
readonly draftTitle = signal('');
private photos = inject(PhotoService);

save() {
  this.photos.add({ title: this.draftTitle() });   // service, pas de view-controller ici
  this.open.set(false);
}
onClosed(ev: CustomEvent) {
  if (ev.detail.role === 'cancel') this.draftTitle.set('');  // rejet explicite
}
```

Points clés :
- Contenu dans `<ng-template>` : il n'est **instancié qu'à l'ouverture** (performance, et `*ngIf` inutile).
- `[isOpen]` **et** `(didDismiss)` : c'est la paire gagnante en Angular standalone. Fermer = écrire dans le signal.
- `ion-modal` est `breakpoint`-able (`[breakpoints]="[0, 0.5, 1]"`) pour une feuille qui se déploie. La poignée (handle) est **cyclable par défaut en v9** (`handleBehavior="cycle"`) → accessibilité clavier conservée.

## 2. Modale impérative (controller) — quand le composant doit être dynamique

```ts
import { ModalController } from '@ionic/angular';
import type { ModalOptions } from '@ionic/angular';

@Component({ /* standalone, petite modale de détail */ })
export class PhotoDetailModal {
  constructor() {
    inject(IonModalToken);   // accès aux données passées par componentProps
  }
}

async openDetail() {
  const modal = await this.modalCtrl.create({
    component: PhotoDetailModal,
    componentProps: { id: 42 },                 // @Input() de la modale
    breakpoints: [0, 0.8],
    initialBreakpoint: 0.8,
    cssClass: 'my-modal',
    presentingEl: await this.el.nativeElement,   // ancre iOS
    dismissOnPageChange: true,
  });
  await modal.present();

  const { data } = await modal.onWillDismiss<{ saved: boolean }>();
  if (data?.saved) this.toast('Enregistré', 'success');
}
```

- `create()` → `present()` → **`await onWillDismiss()`** → `data` : les 4 étapes, dans cet ordre. Une modale non dismissée reste dans le DOM et bloque les gestures.
- `component: ModalController` / `AlertController` etc. viennent **d'un service** (`inject(ModalController)`) — jamais instanciés à la main.

## 3. Alert (confirmation et choix)

```ts
async confirmDelete(photo: Photo) {
  const alert = await this.alertCtrl.create({
    header: 'Supprimer ?',
    message: 'Cette action est définitive.',
    buttons: [
      { text: 'Annuler', role: 'cancel' },
      { text: 'Supprimer', role: 'destructive', handler: () => this.photos.deletePhoto(photo) },
    ],
  });
  await alert.present();
}
```

```ts
async pickQuality() {
  const alert = await this.alertCtrl.create({
    header: 'Qualité',
    inputs: [
      { type: 'radio', label: 'Haute', value: 'high' },
      { type: 'radio', label: 'Moyenne', value: 'mid', checked: true },
    ],
    buttons: [
      { text: 'Annuler', role: 'cancel' },
      { text: 'OK', handler: (v: { value: string }) => this.quality.set(v.value) },
    ],
  });
  await alert.present();
}
```

| Champ utile | Rôle |
|---|---|
| `role: 'cancel' / 'backdrop' / 'destructive'` | qui a fermé → indispensable pour décider |
| `inputs[].type` | `text`, `number`, `password`, `radio`, `checkbox` |
| `cssClass` | `ion-alert-danger`… pour le style |

## 4. Toast et Loading

```ts
// feedback non bloquant
private async toast(msg: string, color: 'success' | 'danger' | 'warning' = 'success') {
  const t = await this.toastCtrl.create({ message: msg, duration: 2200, position: 'bottom', color });
  await t.present();
}

// opération longue : bloque, avec message
private async busy<T>(label: string, job: () => Promise<T>): Promise<T> {
  const loading = await this.loadingCtrl.create({ message: label, spinner: 'crescent' });
  await loading.present();
  try { return await job(); }
  finally { await loading.dismiss(); }   // ← toujours dans un finally
}
```

- Un toast par défaut par page maximum ; les erreurs réseau graves méritent un `ion-alert`.
- `innerHTMLTemplatesEnabled: false` (par défaut) : le HTML custom dans alert/toast/loading est désactivé par sécurité.

## 5. Popover (ancre à un élément)

```html
<ion-button (click)="showPopover($event)">Actions</ion-button>
<ion-popover [isOpen]="popoverOpen" (didDismiss)="popoverOpen.set(false)" event="click">
  <ng-template>
    <ion-list style="min-width: 220px">
      <ion-item button (click)="share()">Partager</ion-item>
      <ion-item button (click)="remove()">Supprimer</ion-item>
    </ion-list>
  </ng-template>
</ion-popover>
```

Sur mobile, un popover doit avoir un élément `presentingEl` / sur Ionic 8+, auto-déjà là. Si rien ne s'affiche : vérifie que le popover est dans la même vue que le bouton déclencheur.

## 6. Règles de coexistence (la vraie difficulté)

| Règle | Pourquoi |
|---|---|
| Un seul overlay « bloquant » à la fois | Empile toast/loading/alert → effet fouilli et focus piégé |
| Toujours fermer : `dismiss()` dans un `finally` | Un loading oublié fige l'écran |
| `dismissOnPageChange: true` sur les modales de confirmation | Évite les modales orphelines après navigation |
| Ne **jamais** mettre un `alert` dans une `ion-content` scrollable à 100vh | Il se positionne mal : il se monte dans l'overlay layer |
| Teste le retour matériel Android | Il ferme l'overlay (pop) avant de faire le `back` de la pile : c'est le comportement attendu |

## Checkpoint

1. Modale inline « Nouvelle photo » : titre + description + `photo` → la photo apparaît dans la grille à la fermeture (avec `data` renvoyé ou via le service).
2. `ion-alert` de confirmation avant suppression ; `role: 'cancel'` = rien ne se passe.
3. Toast de succès 2 s après enregistrement ; `ion-loading` pendant un `setTimeout` simulé (try/finally).
4. Le bouton **retour matériel** ferme d'abord l'overlay ouvert, puis navigue.
