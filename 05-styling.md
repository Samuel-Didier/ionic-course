# 05 — Styles & thème (10 min)

> **Checkpoint** : tu changes la couleur primaire + le mode sombre + les rayons via `variables.scss` uniquement (zéro CSS de composant), et l'app reste correcte sur iOS et Android.

## Ordre de priorité des styles (à retenir, ça évite 90 % des conflits)

```
1. Variables CSS d'un composant (--ion-color-primary, …)   ← le bon niveau
2. src/theme/variables.scss  →  :root / .ion-palette-dark  ← thème de l'app
3. src/global.scss           →  utilitaires, resets
4. SCSS du composant Angular  →  mise en page locale (jamais de couleur Ionic ici)
5. Attributs du composant     →  ion-button[color="primary"], shape="round"
```

## 1. `global.scss` : le socle obligatoire

```scss
@import "@ionic/angular/css/core.css";       // obligatoire : display flex, safe areas
@import "@ionic/angular/css/normalize.css";  // reset
@import "@ionic/angular/css/structure.css";
@import "@ionic/angular/css/typography.css";
@import "@ionic/angular/css/display.css";

// utilitaires : à activer si besoin (c'est commented dans le starter)
/* @import "@ionic/angular/css/padding.css"; */
/* @import "@ionic/angular/css/text-alignment.css"; */
/* @import "@ionic/angular/css/flex-utils.css"; */

// thème sombre : 3 stratégies possibles (une seule active)
@import "@ionic/angular/css/palettes/dark.system.css";  // suit l'OS
/* @import "@ionic/angular/css/palettes/dark.class.css"; */  // toggle classe .ion-palette-dark
/* @import "@ionic/angular/css/palettes/dark.always.css"; */ // toujours sombre
```

> Sans `core.css`, les composants n'ont ni layout ni safe areas. En Ionic 9, plus de préfixe `~` dans les `@import`.

## 2. `theme/variables.scss` : le fichier qui définit ton produit

```scss
/* Couleurs — une seule source de vérité */
:root {
  --ion-color-primary: #3880ff;
  --ion-color-primary-rgb: 56, 128, 255;
  --ion-color-primary-contrast: #ffffff;
  --ion-color-primary-contrast-rgb: 255, 255, 255;
  --ion-color-primary-shade: #3171e0;
  --ion-color-primary-tint: #4c8dff;

  --ion-color-secondary: #3dc2ff;
  --ion-color-danger: #eb445a;

  /* Rayons : en Ionic 9, button/card/chip ont des rayons conformes aux guidelines */
  --ion-border-radius: 10px;
  --ion-min-height: 44px;              /* cible tactile minimale */
}

/* Thème sombre explicite (si tu utilises dark.class.css) */
.ion-palette-dark {
  --ion-color-primary: #4c8dff;
  --ion-background-color: #121212;
  --ion-text-color: #ffffff;
}
```

| Variable | Effet |
|---|---|
| `--ion-color-*` (+ `-rgb`, `-contrast`, `-shade`, `-tint`) | toute la palette, y compris focus, ripples, segments |
| `--ion-background-color` / `--ion-text-color` | fonds et textes globaux |
| `--ion-font-family` | typographie de l'app |
| `--ion-item-background`, `--ion-toolbar-background` | surcouche de composants courants |
| `--ion-safe-area-top/bottom` | marges système (utiles pour du custom hors `ion-header/footer`) |
| `--ion-padding`, `--ion-margin` | pas de l'échelle d'espacement |

Générer une palette complète : `npx @ionic/cli palette primary #ff6b35` (ou `ionic palette generate`).

## 3. `mode` : iOS ou Material ?

- Par défaut Ionic choisit selon l'OS : `ios` sur iOS/macOS, `md` ailleurs.
- Forcer pour comparer : `provideIonicAngular({ mode: 'ios' })`.
- Forcer localement sur **un** composant : `<ion-button mode="md">` — utile pour une exception ponctuelle.

| Différence visible | `ios` | `md` |
|---|---|---|
| Boutons | translucide, texte capitalisé | ripple, fond plein |
| Back swipe | activé | désactivé (`[swipeGesture]`) |
| Select | overlay qui pousse depuis le bas | popover plein écran |
| Sliders / toggles | Cupertino | Material |

## 4. Shadow DOM : pourquoi `ion-input` résiste à ton CSS

Les composants encapsulent leur DOM. Depuis l'extérieur tu peux seulement :
1. utiliser les **variables CSS** ;
2. cibler le **slot** (le contenu que *tu* fournis) ;
3. (v9) cibler les **shadow parts** documentées pour les composants passés en Shadow DOM.

```css
/* autorisé : ce que TU écris dans le slot */
ion-input::part(label) { letter-spacing: .02em; }   /* ion-input expose 'label', 'native', 'icon'… */

/* interdit : chercher .input-wrapper natif à l'intérieur */
ion-input .input-wrapper { border: 2px solid red; }  /* ✗ ne marche pas */
```

En Ionic 9, `ion-textarea`, `ion-radio-group`, `ion-input-otp`, `ion-card-content` sont passés en Shadow DOM :
- `ion-textarea` → parts `wrapper`, `container`, `label`, `native`, `supporting-text`, `helper-text`, `error-text`, `counter`, `bottom`.
- `ion-radio-group` → parts `supporting-text`, `helper-text`, `error-text` ; le `<div radio-group-wrapper>` a disparu (les `ion-radio` sont des enfants directs).
- `ion-card-content` → plus de styles par défaut sur `h1..h6` → si tu relies des titres, **écris-les** :

```css
ion-card-content h2 { margin: 2px 0; font-size: 1rem; }
```

## 5. Safe areas et « contenu sous l'encoche »

```html
<!-- index.html -->
<meta name="viewport" content="viewport-fit=cover, width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
```

`viewport-fit=cover` autorise l'app à aller sous l'encoche. C'est alors à Ionic de réagir :
`ion-app` / `ion-header` / `ion-footer` gèrent les marges **seulement s'ils sont collés aux bords**.

```css
/* barre custom collée au fond : elle, elle doit se décaler */
.ion-padding-bottom { padding-bottom: calc(16px + env(safe-area-inset-bottom)); }
```

| Symptôme | Cause | Fix |
|---|---|---|
| Titre masqué par l'encoche | pas de `ion-header` en haut | Structure avec `ion-header` |
| Barre d'action sous le gesture bar iOS | barre absolute sans marge | `env(safe-area-inset-bottom)` |
| Bande blanche en bas (iOS) | `body` sans couleur de fond | `--ion-background-color` + `.ion-page { background: … }` |

## 6. Layout : les 6 recettes qui couvrent 95 % des écrans

```css
/* a. Deux colonnes 50/50 */
ion-grid { padding: 0; }
ion-col[size-md="6"] { … }

/* b. Conteneur sticky sous un header fixe : tu ne scrolles QUE ion-content */
.sticky-header { position: sticky; top: 0; z-index: 10; }

/* c. Footer fixe quand le contenu est court */
ion-footer { position: absolute; bottom: 0; width: 100%; }

/* d. Plein écran sans scroll parasite */
.fullpage { height: 100%; }          /* pas 100vh */

/* e. Espacement */
ion-item { --padding-start: 16px; }  /* toujours via variables */

/* f. Ombre / transparence (v9) */
.glass { background: rgba(255,255,255,.7); backdrop-filter: blur(12px); }
```

`shape` (Ionic 9) : `ion-button[shape="soft"]`, `ion-card[shape="round"]`… permettent de retrouver les anciens rayons sans CSS.

## Checkpoint

1. Change `--ion-color-primary` (et ses variantes) : boutons, tabs, focus, ripples suivent partout, sans CSS de composant.
2. Bascule le thème sombre via `dark.system.css` puis via `.ion-palette-dark` :compare les deux.
3. Force `mode: 'ios'` puis `mode: 'md'` : listes, boutons, back-swipe changent, **la structure reste valide**.
4. Simule une encoche (Chrome DevTools →>iPhone notch) : rien n'est caché.
5. Retire `core.css` de `global.scss` : tu sais expliquer en une phrase ce qui casse (layout + safe areas).
