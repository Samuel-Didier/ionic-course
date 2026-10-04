# 06 — Données, signaux et formulaires (12 min)

> **Checkpoint** : `PhotoService` expose des **signaux** ; `ionViewWillEnter` déclenche un rechargement qui **rafraîchit réellement l'écran** ; un formulaire `FormGroup` valide et affiche une erreur.

## Le mode de rendu par défaut d'Ionic 9 + Angular 22 (à intérioriser)

| Régression | Conséquence |
|---|---|
| **Zoneless par défaut** (`polyfills: []`, plus de `zone.js`) | aucune détection « automatique » : seul ce qui est **signal / event binding / `markForCheck` / `ChangeDetectorRef`** déclenche un rendu |
| **`OnPush` par défaut sur les composants** (Angular 22) | même avec Zone.js, muter un champ simple ne rend rien |

Corollaire n°1 des apps Ionic 9 : **les signaux sont le canal d'état par défaut.** Le `PhotoService` du projet est déjà écrit dans ce style :

```ts
@Injectable({ providedIn: 'root' })
export class PhotoService {
  public photos = signal<UserPhoto[]>([]);          // source de vérité unique
  readonly count = computed(() => this.photos().length);
  readonly first = computed(() => this.photos()[0] ?? null);

  add(photo: UserPhoto) {
    this.photos.update((list) => [photo, ...list]); // immuable : les @for se recalculent
    void this.persist();                             // @ionic/preferences
  }
}
```

Template (lecture = appel du signal) :

```html
@for (p of photos.photos(); track p.filepath) {
  <ion-item-sliding>
    <ion-item [routerLink]="['/photo', p.id]">
      <img slot="start" [src]="p.webviewPath" [alt]="p.title" loading="lazy" />
      <ion-label>{{ p.title }}</ion-label>
    </ion-item>
    <ion-item-options side="end"><ion-item-option color="danger" (click)="photos.deletePhoto(p)">Supprimer</ion-item-option></ion-item-options>
  </ion-item-sliding>
} @empty {
  <ion-text color="medium">Aucune photo. Touchez + pour en ajouter.</ion-text>
}
```

`@for` + `track` : **obligatoire** pour les lists Ionic (sinon DOM recréé à chaque rendu, perfs + animations cassées).

## Charger des données : le motif « signal + hook de vue »

```ts
import { Component, inject, signal } from '@angular/core';
import type { ViewWillEnter } from '@ionic/angular';

@Component({
  selector: 'app-gallery',
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonRefresher, IonRefresherContent, IonItemSliding, IonItem, IonItemOptions, IonItemOption, IonLabel],
  templateUrl: './gallery.page.html',
})
export class GalleryPage implements ViewWillEnter {
  private photoService = inject(PhotoService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  ionViewWillEnter() { void this.reload(); }   // déclenché à chaque retour sur la page

  private async reload() {
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.photoService.loadSaved();     // écrit dans this.photos (signal) → UI à jour
    } catch {
      this.error.set('Impossible de lire la galerie.');
    } finally {
      this.loading.set(false);
    }
  }

  async doRefresh(ev: CustomEvent) {           // pull-to-refresh
    await this.reload();
    ev.target.complete();                      // obligatoire, sinon ça reste en rotation
  }
}
```

Les 3 questions à te poser pour chaque source de données :

| Source | Quand charger | Écriture dans l'écran |
|---|---|---|
|Préférences / Preferences / fichiers | `ionViewWillEnter` (à chaque retour) | `signal.update()` |
| API HTTP | `ionViewWillEnter` + enums de refresh + après mutation | `signal` |
| Paramètre de route | à la création de la page | `input()` ou `signal` via `toSignal(route.paramMap)` |
| Temps réel (WebSocket, push) | abonnement dans le service | `signal` |

## API HTTP : le trio

```ts
// main.ts
provideHttpClient(withInterceptors([authInterceptor]));

// service
private http = inject(HttpClient);

readonly users = signal<User[]>([]);
load() {
  this.http.get<User[]>('/api/photos').subscribe({
    next: (users) => this.users.set(users),
    error: () => this.error.set('Réseau indisponible'),
  });
}
```

- Un `error` par écran est obligatoire (retry + message), pas un `console.error` silencieux.
- `switchMap` dans un `toSignal()` pour un debounce de recherche :

```ts
readonly query = signal('');
readonly results = toSignal(
  toObservable(this.query).pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap((q) => this.http.get<User[]>(`/api/search?q=${q}`)),
  ),
  { initialValue: [] as User[] },
);
```

## Persistance : 3 options, dans l'ordre

| Besoin | Web | Natif |
|---|---|---|
| Clé/valeur simple (préférences utilisateur, thème) | `localStorage` | `Preferences` (Capacitor) |
| Liste de métadonnées (< quelques Mo) | `localStorage` / IndexedDB | `Preferences` + JSON (comme `photo.service.ts`) |
| Vrais fichiers, photos, blobs | IndexedDB / OPFS | `Filesystem` + `Directory.Data` |
| Requêtes, relations, hors-ligne (>= 1000 lignes) | SQLite WASM (wa-sqlite) ou API | SQLite natif via plugin |

Règle : **ne mets jamais d'images en base64 dans `Preferences`** : tu vas saturer le stockage et le RAM. Le projet le fait bien : les photos vont dans `Filesystem`, seul le chemin est stocké.

## Formulaires : le squelette validé

```ts
@Component({
  imports: [ReactiveFormsModule, IonInput, IonTextarea, IonButton, IonItem, IonItemGroup, IonLabel],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()">
      <ion-item-group>
        <ion-item>
          <ion-input label="Titre" formControlName="title" fill="outline"
                     [errorText]="'2 à 60 caractères'" counter [maxlength]="60"></ion-input>
        </ion-item>
        <ion-item>
          <ion-textarea label="Note" formControlName="note" fill="outline" [autoGrow]="true"
                        [autoCounter]="true"></ion-textarea>
        </ion-item>
      </ion-item-group>
      <ion-button expand="block" type="submit" [disabled]="form.invalid">Enregistrer</ion-button>
    </form>
  `,
})
export class PhotoFormPage {
  readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
    note:  new FormControl('', { nonNullable: true }),
  });

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    // … appel service
  }
}
```

| Règle | Détail |
|---|---|
| `formControlName` + `ReactiveFormsModule` importé | `[(ngModel)]` + `FormsModule` ne se mélangent pas |
| `Validators` + `[errorText]` | le message d'erreur vient d'Ionic, pas d'un div maison |
| `markAllAsTouched()` au submit | sinon l'utilisateur ne voit pas pourquoi c'est bloqué |
| `nonNullable: true` | évite `string \| null` dans tout le reste du code |
| Submit = `type="submit"` + `(ngSubmit)` | le clavier mobile « Entrée » déclenche l'action |
| Un `FormGroup` par page, pas par champ | les validations croisées (titre ≠ date) sont alors possibles |

## Tests de service : 20 lignes, valeur immédiate

```ts
describe('PhotoService', () => {
  let service: PhotoService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [PhotoService, { provide: Platform, useValue: mockPlatform }] });
    service = TestBed.inject(PhotoService);
  });

  it('ajoute en tête de liste', () => {
    service.add({ filepath: 'a', webviewPath: 'a' });
    expect(service.photos()[0].filepath).toBe('a');   // on teste le signal, pas le DOM
  });
});
```

Teste les **signaux du service** et les **règles métier**. Le rendu d'un `ion-item` est déjà testé par Ionic : ne le reteste pas.

## Checkpoint

1. `reload()` déclenché par `ionViewWillEnter` : ajoute une photo dans une modale, ferme, **la liste se met à jour sans recharger l'app**.
2. Coupe le réseau (DevTools) : un message d'erreur s'affiche et un bouton « Réessayer » apparaît.
3. Un `ion-searchbar` filtre via `toSignal(debounceTime + switchMap)` sur une fausse API (JSON local) : 1 seule requête par frappe.
4. Formulaire titre/note : `[errorText]` visible au submit, bouton désactivé tant que c'est invalide.
5. Vérifie le rendu après un `await this.reload()` : s'il ne se met pas à jour, tu as muté un champ au lieu d'un signal.
