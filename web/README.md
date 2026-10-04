# Site interactif du cours Ionic 9

Transforme les fiches Markdown du cours (`course/*.md`) en **web app statique** : navigation, recherche plein texte, checklists de validation, quiz, suivi de progression. Aucun CDN, aucun runtime serveur, aucun framework : `index.html` + `styles.css` + `app.js` + `content.js`.

## Démarrer

```bash
cd course/web
npm install
npm start          # build + serveur sur http://localhost:4173
```

| Script | Effet |
|---|---|
| `npm run build` | génère `site/` (à commit ou à publier) |
| `npm run watch` | rebuild automatique à chaque `.md` modifié |
| `npm start` | build + serveur local |
| `npm run serve` | sert `site/` déjà construit (port 4173, `PORT=8080 npm run serve`) |
| `npm run smoke` | test de fumée headless (26 vérifications : navigation, quiz, recherche, mobile, persistance) — nécessite Chrome (`CHROME_PATH` pour un autre binaire) |
| `npm run smoke:shots` | idem + captures d'écran dans `scripts/.shots/` |
| `npm run deploy` | build + `git subtree push` du dossier `site/` vers la branche `gh-pages` |

## Ce que le site apporte (vs. les .md)

| Fonction | Détail |
|---|---|
| Progression | chaque fiche cochée (auto à 97 % de scroll ou touche `m`) + checkpoints cochables, anneau de progression dans la sidebar, tout en `localStorage` |
| Recherche | `Ctrl+K` ou `/` : plein texte sur 13 fiches, extrait surligné, `↵` ouvre **et** surligne le terme dans la page |
| Filtre de tableaux | chaque table de décision (> 6 lignes) a son champ de filtre : « modale », « signal », `Directory.Data`… |
| Quiz | 10 questions, explication immédiate, liens vers la fiche, score persistant |
| Navigation | hash-routing (`#/03-composants`) : fonctionne dans n'importe quel sous-chemin de Pages, et même en `file://` |
| Ergonomie | TOC par fiche avec scrollspy, bouton « copier » sur chaque bloc de code, thème clair/sombre, tiroir mobile, `←`/`→` entre fiches, feuille de style print |
| Deep-link | les liens `fiche.md` du Markdown deviennent des routes internes automatiquement |

Raccourcis : `/` ou `Ctrl+K` recherche · `←` `→` navigation · `m` marquer lue · `f` filtrer les tables · `t` thème · `p` imprimer · `?` aide.

## Structure

```
web/
├── build.mjs          markdown-it → HTML, extraction TOC/checkpoints/recherche → site/content.js
├── src/               sources copiées telles quelles dans site/
│   ├── index.html     coquille + script anti-FOUC pour le thème
│   ├── styles.css     design system (tokens, layout, markdown, quiz, print, responsive)
│   ├── app.js         routeur, progression, recherche, filtres, quiz, raccourcis
│   ├── quiz.js        données du quiz (window.QUIZ)
│   └── favicon.svg
├── scripts/serve.mjs  serveur statique de dev
├── scripts/smoke.mjs  test de fumée headless Chrome
├── site/              ⬅️ sortie : c'est ce dossier que tu publies
└── deploy.yml         workflow à copier dans .github/workflows/
```

`build.mjs` ne fait **que** transformer le Markdown ; tout le comportement vit dans `src/`. Modifier une fiche `.md` et relancer `npm run build` suffit.

## Déploiement sur GitHub Pages

### Option A — GitHub Actions (recommandé)

1. Crée un dépôt, pousse le cours (`course/` y compris).
2. `mkdir -p .github/workflows && cp course/web/deploy.yml .github/workflows/deploy.yml`
3. Dans **Settings → Pages → Source**, choisis **GitHub Actions**.
4. Adapte `working-directory: course/web` et `path: course/web/site` si l'arborescence diffère.

Le workflow installe, construit, lance le test de fumée et publie `site/`. Tu peux alors **ne pas versionner** `site/` (décommente `site/` dans `.gitignore`).

### Option B — branche `gh-pages` (sans Actions)

```bash
cd course/web
npm run build
git add site                       # site/ doit être versionné
git commit -m "build: site statique du cours"
npm run deploy                     # git subtree push --prefix site origin gh-pages
```

Puis **Settings → Pages → Source → branche `gh-pages`, dossier `/ (root)`**. L'URL sera `https://<user>.github.io/<repo>/` — le site fonctionne tel quel (hash-routing + chemins relatifs).

### Option C — n'importe quel hébergeur statique

`site/` est autonome : dépose le dossier chez Netlify, Vercel, Cloudflare Pages, `nginx`…
Seul réglage parfois nécessaire côté hébergeur : servir `404.html` en fallback (déjà fourni).

## Personnaliser

| Besoin | Où |
|---|---|
| Couleur / typographie du site | `:root` dans `src/styles.css` (tokens `--primary`, `--accent`, …) |
| Logo / favicon | `src/favicon.svg` |
| Questions du quiz | `src/quiz.js` (4 champs : `q`, `options`, `answer`, `explain`, `ref`) |
| Durée affichée, ordre des fiches | tableau `ORDER` en tête de `build.mjs` |
| Écriture du contenu | les `.md` de `course/`, comme le cours lui-même |

## Limites assumées

- `content.js` (~230 ko, ~60 ko gzip) est chargé en une fois : le cours reste entièrement disponible hors-ligne, au prix d'un aller-retour initial. Un chargement par fiche n'est pas nécessaire à cette échelle.
- Le suivi de progression est **local au navigateur** (pas de compte, rien n'est envoyé) : changer de navigateur = repartir de zéro.
- Aucune recherche serveur : l'index est embarqué, ce qui convient à 13 fiches (au-delà, il faudrait un index segmenté).
