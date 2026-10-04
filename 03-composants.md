# 03 — Composants : quel composant, quel usage (12 min)

> **Checkpoint** : une page `ion-content` avec un `ion-searchbar` filtrant une `@for` de `ion-item`, un swipe latéral (`ion-item-sliding`) et un `ion-input` relié à un formulaire. Zéro CSS custom obligatoire.

## Anatomie d'une page (le layout Ionic par défaut)

```
┌───────────────────────────┐  ← ion-header  (fixe, flou si [translucent])
│ ion-toolbar               │
├───────────────────────────┤
│ ▓▓▓ ion-content           │  ← SEUL conteneur scrollable de la page
│   (scroll + refresh +     │     hauteur = 100% − header − footer
│    infinite-scroll)       │
├───────────────────────────┤  ← ion-footer (fixe, ex. barre d'action)
│ ion-toolbar               │
└───────────────────────────┘
```

- Un `ion-content` **obligatoire** par page : il gère le scroll natif, le pull-to-refresh, le scroll-padding des inputs, et l'animation de header.
- Jamais de `<div style="height:100vh">` : casse les safe areas et les transitions.
- `[fullscreen]="true"` + `collapse="condense"` = le header shrinks au scroll (pattern du starter, `tab1.page.html`).

## Table de décision : besoin → composant

| Besoin | Composant | Piège à connaître |
|---|---|---|
| Bouton | `ion-button` (`fill`, `color`, `size`, `expand`, `shape`) | `expand` = largeur ; pas de `width` pour un bouton pleine largeur |
| Liste / lignes | `ion-list` + `ion-item` (`button`, `detail`, `lines`, `routerLink`) | `[routerLink]` sur `ion-item button` + `routerDirection` |
| Liste avec actions au swipe | `ion-item-sliding` > `ion-item-options side="end"` > `ion-item-option` | le swipe est un geste natif : ne pas le recoder |
| Groupe d'items / champs | `ion-item-group` + `ion-item` (`input`, `label`, `helper`, `error`) | `ion-label position="stacked"` pour les formulaires aérés |
| Champ texte | `ion-input` (`label`, `labelPlacement`, `fill`, `clearInput`, `counter`, `errorText`) | `ionChange` ≠ `ionInput` (voir ci-dessous) |
| Champ multi-lignes | `ion-textarea` (`autoGrow`, `rows`, `counter`) | min-height changed en v9 |
| Choix unique | `ion-select` + `ion-select-option`, ou `ion-radio-group` + `ion-radio` | `ion-radio-group` est passé en Shadow DOM en v9 |
| Choix multiple | `ion-checkbox` + `ion-label` | `ion-item` avec `checkbox` + slot `start` |
| Basculer | `ion-toggle` | `enableOnOffLabels` pour afficher On/Off |
| Date / heure | `ion-datetime` (`presentation`, `valueFormat`, `preferWheel`, `multiple`) | v9 : pas de `ion-buttons` dans `slot="buttons"`, utiliser un `<div>` |
| Recherche | `ion-searchbar` (`debounce`, `ionInput`) | filtrer côté service, pas dans le template |
| Filtre segmenté | `ion-segment` + `ion-segment-button` (`value`) | pour 2–5 options, au-delà : `ion-select` ou un scroll de chips |
| Chips / tags | `ion-chip` + `ion-label` + `ion-icon` | `shape` : `round` par défaut ; v9 a changé les rayons |
| Contenu enquadré | `ion-card`, `ion-card-header`, `ion-card-title`, `ion-card-content` | v9 : `ion-card-content` en Shadow DOM → plus de styles par défaut sur les `h1..h6` |
| Avatar / image | `ion-avatar`, `<img loading="lazy">` | ⚠️ `ion-img` est **déprécié** en v9 |
| Note / skeleton | `ion-badge`, `ion-progress-bar`, `ion-skeleton-text`, `ion-spinner` | skeleton pendant le chargement = perceived speed |
| Barre d'action flottante | `ion-fab` + `ion-fab-button` (`slot="fixed"`) | `slot="fixed"` pour qu'elle flotte au-dessus du scroll |
| Grille | `ion-grid` + `ion-row` + `ion-col` (`size-md`, `offset-*`) | v9 : `push`/`pull` supprimés → utiliser `order` |
| Pull-to-refresh | `<ion-refresher slot="fixed" (ionRefresh)="...">` | `$event.target.complete()` **obligatoire** sinon ça boucle |
| Pagination | `<ion-infinite-scroll (ionInfinite)="..." [disabled]="done">` | `complete()` + `disabled` quand la page est vide |
| Alerte | `ion-alert`, `ion-action-sheet`, `ion-badge`, `ion-toast`, `ion-modal`, `ion-popover`, `ion-loading` | → fiche 04 |
| Diapositives | `swiper` / `IonicSlides` | `ion-slides` est legacy : préférer Swiper |
| Menu / split | `ion-menu`, `ion-split-pane` | `contentId` obligatoire (fiche 02) |

## Événements : `ionInput` vs `ionChange` (l'erreur n°1 des formulaires)

| Événement | Déclenché | Usage |
|---|---|---|
| `(ionInput)` | à chaque frappe | recherche live, validation en continu, compteur de caractères |
| `(ionChange)` | à la validation (blur / validation / "done") | sauvegarde serveur, `ngModel` sur un champ fini |
| `(ionBlur)` | perte de focus | masquer une erreur |
| `(ionRefresh)` | pull-to-refresh | recharger la liste |
| `(ionInfinite)` | seuil de scroll atteint | charger la page suivante |
| `(ionChange)` sur `ion-select`/`ion-toggle`/`ion-datetime` | changement de valeur | toujours lisible : la valeur est dans `event.detail.value` |

```html
<ion-searchbar debounce="300" (ionInput)="query.set($any($event).target.value ?? '')"
               placeholder="Rechercher"></ion-searchbar>
```

## Valeurs et formulaires : 3 voies, une seule bonne

```html
<!-- 1. Template-driven : le plus rapide, peu de logique -->
<ion-input [(ngModel)]="name" name="name" label="Nom" fill="outline"></ion-input>

<!-- 2. Reactive (recommandé dès qu'il y a validation ou async) -->
<ion-input [formControl]="nameCtrl" label="Nom" fill="outline"
           [errorText]="'Champ obligatoire'"></ion-input>
```

```ts
readonly nameCtrl = new FormControl('', { nonNullable: true, validators: [Validators.required] });
```

- Un `ion-*` qui émet `ionChange` et qui est dans un `FormGroup` : mets **directement** `formControlName="nameCtrl"`. Les value accessors d'Ionic (`@ionic/angular/lazy`) font le lien.
- Validation visible : `Validators.required/minLength/email` + `[errorText]`. Pas de `<div class="error">` maison.
- `[(ngModel)]` dans un composant **sans** `FormsModule` importé = valeur qui ne se met plus à jour. Cause n°1 de « mon input ne marche pas ».

## Slots : la place de l'intention

| Slot | Usage |
|---|---|
| `start` / `end` (item) | icône, avatar, badge, bouton à droite |
| `icon-only`, `icon-start`, `icon-end` (button) | bouton icône |
| `primary`, `secondary` (modal/toolbar) | boutons d'action d'un overlay |
| `fixed` | refresher, infinite-scroll, fab : hors du flux de scroll |
| `bottom` (tab-bar) / `top` (tabs) | placement de la barre |

## Checkpoint

Sur `tab1.page.html` :
1. Un `ion-searchbar` qui filtre la liste des photos par nom (signal + `computed`).
2. Chaque `ion-item` en `ion-item-sliding` avec une option « Supprimer » qui appelle `deletePhoto()`.
3. Un `ion-input` "note" (1–5) relié à un `FormControl` avec validation.
4. Vérifie `mode` iOS **et** md : rien ne doit être coupé.
