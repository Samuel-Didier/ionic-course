# 92 — Atelier fil rouge (Photo Gallery)

10 ateliers, du premier écran au déploiement. Chaque atelier a une **durée**, une **difficulté** et un **critère de validation binaire** (« ça marche » n'est pas un critère). Travaille dans `../sam_app`.

| # | Atelier | Difficulté | Durée | Fiche |
|---|---------|-----------|-------|-------|
| 1 | Anatomie de l'existant | ★☆☆ | 10 min | 01 |
| 2 | 4ᵉ onglet « Réglages » | ★☆☆ | 10 min | 02 |
| 3 | Grille + suppression par swipe | ★★☆ | 25 min | 03 |
| 4 | Recherche avec debounce | ★★☆ | 25 min | 03/06 |
| 5 | Modale d'édition + retour de donnée | ★★☆ | 25 min | 04 |
| 6 | Thème sombre + identité visuelle | ★☆☆ | 15 min | 05 |
| 7 | Persistance & résilience | ★★☆ | 25 min | 06 |
| 8 | Caméra native + fallback web | ★★★ | 40 min | 07 |
| 9 | Tests de service | ★★☆ | 20 min | 08 |
| 10 | Build & checklist livraison | ★★☆ | 20 min | 08 |

---

## 1. Anatomie de l'existant ★☆☆

**Fais** : ouvrir `main.ts`, `app.component.html`, `tabs/tabs.routes.ts`, `photo.service.ts`. Identifier : providers, outlet racine, routes enfants, signal `photos`, clé de stockage.
**Critère** : tu sais expliquer à voix haute le trajet d'un clic sur l'onglet « Photos » jusqu'à `photos.set(...)`.

## 2. Onglet « Réglages » ★☆☆

**Fais** : `ionic g page tabs/settings` + `ion-tab-button` dans `tabs.page.html` (icône `settings-outline`) + `SettingsPage` avec `ion-list` de `ion-item`.
**Critère** : les 4 onglets naviguent, l'URL profonde `/tabs/settings` fonctionne au refresh, et `ionViewWillEnter` s'y déclenche.

## 3. Grille photo + swipe pour supprimer ★★☆

**Fais** : sur l'onglet Photos, remplacer le contenu de démonstration par les vraies photos du service ; chaque `ion-item` devient une carte (`img`, `title`, `favorite` au badge) ; swipe-gauche = "Favori", swipe-droite = "Supprimer" (avec `ion-alert` de confirmation).
**Critère** : une photo supprimée disparaît de la grille **et** du stockage ; après rechargement de l'app, elle ne revient pas ; `@for` avec `track`.

## 4. Recherche avec debounce ★★☆

**Fais** : `ion-searchbar` → `signal` → `toSignal(toObservable(query).pipe(debounceTime(300), switchMap(...)))` sur les titres.
**Critère** : une seule requête par frappe de 300 ms (compteur de requêtes affiché dans la console) ; résultat vide → message « aucun résultat », pas un écran blanc.

## 5. Modale d'édition ★★☆

**Fais** : `ion-modal` inline avec titre, description, `favorite` (toggle) et `ion-datetime`. Boutons Annuler / Enregistrer ; `didDismiss` avec `role: 'cancel'` → on jette le brouillon.
**Critère** : les modifications se voient immédiatement dans la grille (signal), un toast confirme, et le bouton retour matériel ferme la modale sans enregistrer.

## 6. Thème sombre + identité ★☆☆

**Fais** : palette `--ion-color-primary` (et `-shade`/`-tint`/`-contrast`) dans `variables.scss` ; `dark.class.css` + un `ion-toggle` « Mode sombre » qui bascule `.ion-palette-dark` sur `document.documentElement`.
**Critère** : bascule instantanée sans rechargement ; les boutons, onglets et champs restent lisibles ; aucune règle de couleur écrite dans un SCSS de composant.

## 7. Persistance & résilience ★★☆

**Fais** : charger au `ionViewWillEnter`, persister après chaque mutation (`Preferences`), message d'erreur + bouton « Réessayer » si le stockage est indisponible ; `ion-refresher` pour recharger.
**Critère** : (a) les photos persistent après redémarrage ; (b) avec un `Preferences.get` qui renvoie un JSON corrompu, l'app démarre quand même sur un état vide ; (c) le refresh se termine (`complete()`).

## 8. Caméra + fallback web ★★★

**Fais** : bouton FAB → `Camera.getPhoto({ resultType: Uri })` → copie dans `Directory.Data` → chemin stocké dans `Preferences` → affichage via `convertFileSrc` (natif) ou relecture base64 (web). Permission refusée → message d'explication + « Ouvrir les réglages ».
**Critère** : (a) natif : la photo persiste après avoir quitté et relancé l'app ; (b) web : la même action passe par PWA Elements sans planter ; (c) `npx cap doctor` ne signale rien.

## 9. Tests de service ★★☆

**Fais** : 4 tests sur `PhotoService` — ajout en tête, suppression, persistance (mock `Preferences`), résilience JSON corrompu. Plus un test de composant : état vide affiché.
**Critère** : `npm test` au vert, aucun test ne dépend du rendu d'un `ion-*` interne.

## 10. Build & livraison ★★☆

**Fais** : `npm run build` (note la taille du bundle), corriger les warnings de budget, `npx cap copy android`, cocher la checklist des 12 points de la fiche 08.
**Critère** : build sans warning, checklist validée, taille de bundle notée (avant / après).

---

## Défi final — « Liste de rappels » (2 h, seul, sans fiche)

Objectif : vérifier que le cours est intégré, pas mémorisé.

1. **Nouvel écran** « Rappels » : route `/tabs/reminders`, une liste `ion-item` avec `ion-datetime`, une modale de création, `ion-reorder-group` pour réordonner, persistance `Preferences`, notification de rappel simulée (`ion-toast`).
2. **Contraintes** :
   - zéro champ d'état non-signal dans un composant ;
   - zéro CSS de couleur Ionic hors `variables.scss` ;
   - chaque écran a un état vide **et** un état d'erreur ;
   - fonctionnent en `mode: 'ios'` et `'md'` ;
   - le service ne connaît **ni** `ion-*`, **ni** `ModalController`.
3. **Grille d'évaluation** (10 points, 1 chacun) : structure de page correcte · navigation et pile correctes · formulaire validé · overlay qui renvoie une donnée · persistance · thème sombre · compatibilité 2 modes · tests passent · build propre · checklist 12 points.
4. **Bonus** : rendre l'app installable (PWA) avec un `manifest.webmanifest` cohérent avec `variables.scss`.

**Seuil de réussite : 8/10.** En dessous, reprends les fiches 02, 04 et 06 — ce sont elles qui portent 60 % des points.

---

## Auto-évaluation express (5 questions, 10 s chacune)

1. Qui gère la pile d'écrans ? → **Le Router Angular**, rendu par `IonRouterOutlet`.
2. Pourquoi ma modale inline ne s'affiche pas ? → **`<ng-template>` manquant**, `IonModal` pas dans `imports`, ou signal non écrit.
3. Pourquoi mon champ ne se met pas à jour après un `await` ? → **Zoneless + OnPush** : il faut un **signal**.
4. Quel overlay pour « choisir entre 3 actions » ? → **`ion-action-sheet`**.
5. Comment afficher une image `file://` dans la WebView ? → **`Capacitor.convertFileSrc(uri)`**.

4/5 ou plus : le cours est acquis. Moins : relis `91-pieges-v9.md` puis refais le défi final.
