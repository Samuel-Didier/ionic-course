# Ionic 9 — cours express

**Durée : ~2 h · 9 fiches · 1 fil rouge · 0 théorie pure**
Cible : **Ionic 9 · Angular 22 (zoneless + OnPush) · Capacitor 8** — exactement les versions du projet `../sam_app`.
Fil rouge : **Photo Gallery**, l'app déjà installée dans `../sam_app`. Chaque notion est appliquée dessus, jamais décrite dans le vide.

## Version web interactive

Ce cours existe aussi en **web app statique** : `web/` (voir `web/README.md`).

```bash
cd web && npm install && npm start      # → http://localhost:4173
```

Au-delà des fiches : progression mémorisée, **checkpoints cliquables**, recherche plein texte (`Ctrl+K`), **filtre sur chaque table de décision**, quiz de 10 questions avec explication, thème clair/sombre, TOC par fiche, lecture sur mobile, et déploiement en un clic sur GitHub Pages (workflow fourni dans `web/deploy.yml`). Le Markdown reste la source unique : `npm run build` régénère le site.


---

## Méthode : 3 temps par fiche

1. **LIRE** la fiche (5–10 min) — tableaux de décision, code minimal.
2. **CODER** l'atelier de la fiche dans `sam_app` (10 min).
3. **VÉRIFIER** le *checkpoint* : un critère observable, pas une impression (« ça marche » ≠ checkpoint).

> Règle anti-paralysie : si tu bloques 5 min sur un détail, passe à la suite. Le checkpoint est le vrai cours, la fiche est l'index.

## Plan

| # | Fiche | La question à laquelle elle répond | Checkpoint |
|---|-------|-----------------------------------|-----------|
| 00 | [Modèle mental](00-modele-mental.md) | Où se règle quoi, dans quelle couche ? | Savoir dire en 60 s ce qu'est Ionic vs Capacitor |
| 01 | [Démarrage](01-demarrage.md) | Comment est bootstrappé une app, et pourquoi ? | `ng serve` affiche 3 onglets qui naviguent |
| 02 | [Navigation](02-navigation.md) | Qui gère la pile d'écrans ? | Pile + lifecycle + retour arrière système |
| 03 | [Composants](03-composants.md) | Quel composant pour quel besoin ? | Liste + item sliding + input dans un formulaire |
| 04 | [Overlays](04-overlays.md) | Modale ? Alert ? Toast ? Popover ? | Modale de formulaire qui renvoie une donnée |
| 05 | [Styling / thème](05-styling.md) | Comment.customiser sans casser le mode natif ? | Thème sombre + variables + safe area |
| 06 | [Données & formulaires](06-donnees.md) | Comment l'état arrive à l'écran (et le reste à jour) ? | Service par signals + `ionViewWillEnter` qui refresh |
| 07 | [Natif / Capacitor](07-capacitor.md) | Comment on accède à la caméra, aux fichiers ? | `cap add android` + photo native persistée |
| 08 | [Tests & livraison](08-tests-et-livraison.md) | Comment on livre sans regret ? | Checklist 12 points validée |

**Annexes** — [Cheatsheet](90-cheatsheet.md) (1 page à imprimer) · [Pièges Ionic 9](91-pieges-v9.md) (ce qui casse) · [Atelier fil rouge](92-atelier-fil-rouge.md) (10 ateliers notés + défi final).

## Prérequis

Node 22+, Angular CLI de préférence (`ng serve` suffit pour 80 % du cours), notions de composants Angular et de `git`.
Pas besoin : Cordova, Objective-C, Gradle, React.

## Les 7 commandements du cours

1. **Rien d'Ionic dans un service métier.** Un service ne connaît ni `ion-content` ni un controller d'overlay ; il expose des signaux.
2. **L'écran ne fait que présenter.** Template = mise en page ; logique = service ; effets natifs = Capacitor.
3. **Signals d'abord.** Ionic 9 + Angular 22 = zoneless + `OnPush` par défaut. Un champ muté dans `ionViewWillEnter` **ne se réaffiche pas** : passer par un signal (fiche 06).
4. **`mode` plutôt que CSS.** Ne jamais fights les composants (`!important` sur un `ion-input`) : on passe par variables CSS et `mode`.
5. **Chaque overlay est awaited et fermé.** Un `await modalController.create(...)` sans `await modal.onDidDismiss()` est une fuite.
6. **Web d'abord.** Toute feature doit fonctionner dans `ng serve` avant d'être branchée sur un plugin natif.
7. **Vérifier sur les deux modes.** Force `mode: 'ios'` puis `'md'` : si l'ergonomie casse, c'est ton template, pas le framework.

## Où aller ensuite

- Besoin d'une API ? `node_modules/@ionic/core/components/*.d.ts` est la référence **locale, à jour, hors-ligne** (`ion-content`, `ion-modal`…).
- Migration v8 → v9 ? `npx @ionic/migrate --dry-run` puis voir [91-pieges-v9.md](91-pieges-v9.md).
