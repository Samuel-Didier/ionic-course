# 00 — Modèle mental (5 min)

> **Checkpoint** : expliquer en 60 secondes, sans schéma, ce qu'est Ionic, ce qu'est Capacitor, et qui décide du scroll.

## La pile, une seule fois pour toutes

```
┌──────────────────────────────────────────────────────────────┐
│ TON CODE : composants Angular, signaux, routes, services     │  ← logique métier
├──────────────────────────────────────────────────────────────┤
│ @ionic/angular 9   wrappers Angular (inputs/outputs, DI,     │  ← adaptateur
│ @ionic/core        lazy, controllers d'overlays)             │
│                    = composants Web (Web Components Stencil)  │
├──────────────────────────────────────────────────────────────┤
│ Capacitor 8  → plugins natifs (caméra, fichiers, haptique)   │  ← pont vers l'OS
├──────────────────────────────────────────────────────────────┤
│ Navigateur (Chrome/Firefox/Safari)  ⟷  WebView (Android/iOS)│  ← même code
└──────────────────────────────────────────────────────────────┘
        version 1 : SPA web          version 2 : app native
```

## 4 métaphores (mémorise-les, elles répondent à tout)

| Couche | Métaphore | Conséquence pratique |
|---|---|---|
| `@ionic/core` | Une **bibliothèque de composants Web natifs** (comme `<dialog>` mais avec le design system iOS + Material) | Ils fonctionnent sans Ionic, sans framework. Ionic = l'assemblage cohérent + le theming |
| `@ionic/angular` | Un **traducteur** (Web Component ↔ décorateur Angular, DI, lazy loading) | Tu n'importes jamais `@ionic/core` directement, seulement `@ionic/angular` |
| Capacitor | Un **standard de prise électrique** (même prise sur Android et iOS) | Un plugin = une API unique, implémentée des deux côtés, avec un fallback web |
| Ionic ≠ framework JS | Ionic est une **couche de design + plateforme**, au-dessus d'un vrai framework | La logique reste du Angular pur. Ionic ne remplace ni le router, ni les formulaires, ni les tests |

## Les 3 invariants (ils expliquent 95 % des bugs)

1. **Une app Ionic est d'abord une SPA web.** Si ça marche pas dans `ng serve`, ça marchera pas sur mobile : le natif n'ajoute que des *capacités*, jamais du rendu.
2. **Le natif est un enhancement, pas une dépendance.** Chaque plugin a un comportement web dégradé (caméra → `<input type=file>`, fichiers → IndexedDB). Teste les deux branches (fiche 07).
3. **Il y a deux rendus : `ios` et `md`.** Ionic choisit selon l'OS. Ton layout doit survivre aux deux ; si tu forces `mode`, c'est pour comparer, pas pour tricher.

## Où se règle quoi ? (table de décision)

| Je veux… | Je règle ça dans | Fiche |
|---|---|---|
| Afficher une liste de données | Template + `@for` Angular | 03 |
| Charger/rafraîchir des données | Service + signaux + `ionViewWillEnter` | 06 |
| Naviguer vers un écran | `Router` Angular + `IonRouterOutlet` | 02 |
| Ouvrir une modale | `ModalController` ou `<ion-modal>` inline | 04 |
| Accéder caméra / fichiers / vibration | Plugin Capacitor | 07 |
| Changer les couleurs / le mode | `src/theme/variables.scss` + variables CSS | 05 |
| Animer une transition | `createAnimation` (Ionic) ou CSS | 05/04 |
| Persister des données | `Preferences` (natif) / `localStorage` (web) | 06/07 |

## Test d'appartenance en 3 questions

Pour chaque ligne de code que tu t'apprêtes à écrire, pose-toi :

1. **Est-ce un contrôleur ou un composant `ion-*` dans une template ?** → ça va dans la vue (composant Angular).
2. **Est-ce de l'état qui survit au changement d'écran ?** → ça va dans un service.
3. **Est-ce une API du système (caméra, GPS, fichiers, partage) ?** → ça va dans un service qui isole le plugin Capacitor.

Si les trois réponses sont « non », c'est probablement du CSS ou du TypeScript pur. Tu as la réponse sans jamais chercher dans la doc.

## Le vocabulaire minimum (8 mots)

- **Web Component** : balise HTML avec son propre état et son encapsulation (`ion-button`).
- **Shadow DOM** : encapsulation CSS du composant ; on ne style pas l'intérieur depuis l'extérieur, on utilise les *shadow parts* et variables CSS (fiche 05).
- **Overlay** : couche flottante au-dessus de l'écran (modal, alert, toast, loading, popover, action-sheet) — fiche 04.
- **Page** : un composant routé qui contient `ion-header` / `ion-content` / `ion-footer`.
- **Mode** : `ios` ou `md`, pilote l'apparence et certains comportements.
- **Capacitor / plugin** : pont vers une API native.
- **Lazy loading** : le code d'un écran n'est chargé qu'à la première visite.
- **Signal** : valeur réactive Angular qui déclenche le re-rendu de façon fine et prévisible (fiche 06).
