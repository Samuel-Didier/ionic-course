# 07 — Le natif avec Capacitor (12 min)

> **Checkpoint** : `npx cap add android` fonctionne, une photo prise au natif est **persistée sur disque** puis relue au redémarrage de l'app — et le même code fonctionne dans le navigateur.

## Le modèle en 3 lignes

```
Ton service TS ──appel API du plugin──▶ @capacitor/camera ──pont──▶ code natif Android/iOS
        │                                        │
        └── si pas de natif : fallback web ◀───────┘  (ex. <input type="file">)
```

Un plugin = **une API unique, deux implémentations** (natif + web). Ionic 9 exige Capacitor 7+ ; le projet est en 8.

## 1. Mise en place

```bash
npm i @capacitor/core @capacitor/cli          # CLI en devDependency
npx cap init "Photo Gallery" io.mon.app.gallery --web-dir=www
npx cap add android                           # génère android/ (Gradle) — idem ios
npm i @capacitor/camera @capacitor/filesystem @capacitor/preferences @capacitor/haptics
npx cap sync android                          # après CHAQUE install/retrait de plugin
```

| Commande | Quand | Effet |
|---|---|---|
| `npx cap sync` | après `npm i`/`npm i -D` d'un plugin | copie les plugins + le web `www/` dans le projet natif |
| `npx cap copy` | après un `npm run build` sans changement de plugin | copie seulement le web |
| `npx cap run android` | build + install + launch sur l'appareil/émulateur | |
| `npx cap run android --live-reload` | rebuild à chaque changement de code | beaucoup plus rapide ; désactive `prebundle` de `@ionic/pwa-elements` si besoin |
| `npx cap open android` | ouvre Android Studio | debug natif, émulateur,ystore |
| `npx cap doctor` | diagnostic | vérifie la cohérence plugins/`package.json` |

`capacitor.config.ts` :

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.mon.app.gallery',     // identifiant immuable (change = nouvelle app stores)
  appName: 'Photo Gallery',
  webDir: 'www',                   // = sortie de `ng build`
  plugins: {
    SplashScreen: { launchAutoHide: false, backgroundColor: '#3880ff' },
  },
  android: { backgroundColor: '#ffffff' },
};
export default config;
```

## 2. Les plugins utiles (tableau de choix)

| Besoin | Plugin | Notes web |
|---|---|---|
| Caméra / galerie | `@capacitor/camera` | exige `@ionic/pwa-elements` (`defineCustomElements`) |
| Fichiers | `@capacitor/filesystem` | IndexedDB / OPFS |
| Préférences | `@capacitor/preferences` | `localStorage` |
| Retour haptique | `@capacitor/haptics` | vibration API |
| Clavier | `@capacitor/keyboard` | ajuste le layout |
| Barre d'état | `@capacitor/status-bar` | couleur/overlay |
| Partage | `@capacitor/share` | Web Share API |
| App / navigation | `@capacitor/app` | `minimize`, listeners `appStateChange` |
| Splash | `@capacitor/splash-screen` | masqué à froid |
| Géolocalisation, notifications, Contacts… | `capacitorjs.com/docs/apis` | — |

## 3. Détecter la plateforme

```ts
import { Capacitor } from '@capacitor/core';
import { Platform } from '@ionic/angular';

const platform = inject(Platform);

Capacitor.isNativePlatform();      // vrai dans le WebView natif (bridge chargée)
platform.is('hybrid');             // Ionic : natif OU PWA installée
platform.is('ios'); platform.is('android'); platform.is('web');
platform.is('desktop'); platform.is('tablet');
```

⚠️ Ionic 9 : plus de repli sur l'ancien `isNative` de Capacitor 2. Utilise `Capacitor.isNativePlatform()` ou `platform.is('hybrid')`.

## 4. Photo : le motif « natif ou web » (extrait condensé de `photo.service.ts`)

```ts
public async addNewToGallery() {
  const captured = await Camera.getPhoto({
    quality: 80,
    allowEditing: true,
    resultType: CameraResultType.Uri,   // on veut un FICHIER, pas du base64 en RAM
    source: CameraSource.Camera,
  });

  const saved = await this.savePicture(captured);
  this.photos.update((list) => [saved, ...list]);   // signal → UI
  await Preferences.set({ key: this.PHOTO_STORAGE, value: JSON.stringify(this.photos()) });
}

private async savePicture(photo: Photo) {
  const fileName = `${Date.now()}.jpeg`;
  let base64Data: string | Blob;

  if (Capacitor.isNativePlatform()) {
    // en natif, le fichier existe déjà : on le relit puis on le copie dans Directory.Data
    const file = await Filesystem.readFile({ path: photo.path! });
    base64Data = file.data;
  } else {
    // sur le web, on convertit le blob en base64
    base64Data = await this.base64FromPath(photo.webPath!);
  }

  const written = await Filesystem.writeFile({
    path: fileName, data: base64Data, directory: Directory.Data,
  });

  return Capacitor.isNativePlatform()
    ? { filepath: written.uri, webviewPath: Capacitor.convertFileSrc(written.uri) }  // file:// → http:// pour la WebView
    : { filepath: fileName,    webviewPath: photo.webPath };
}
```

Trois décisions à retenir :
1. `resultType: Uri` : on manipule des **chemins**, pas des images en mémoire.
2. **Une seule fois** la conversion base64, dans la branche web uniquement.
3. `Capacitor.convertFileSrc(...)` : obligatoire pour afficher un `file://` dans une `<img>` d'une WebView.

Et au chargement :

```ts
public async loadSaved() {
  const { value } = await Preferences.get({ key: this.PHOTO_STORAGE });
  const photos = (value ? JSON.parse(value) : []) as UserPhoto[];

  if (!Capacitor.isNativePlatform()) {
    // le web a perdu les fichiers : on relit en base64 pour l'affichage
    for (const p of photos) {
      const f = await Filesystem.readFile({ path: p.filepath, directory: Directory.Data });
      p.webviewPath = `data:image/jpeg;base64,${f.data}`;
    }
  }
  this.photos.set(photos);
}
```

## 5. Permissions

| Contexte | Comment |
|---|---|
| Android | chaque plugin déclare ses permissions ; les analogues iOS dans `ios/App/App/Info.plist` (`NSCameraUsageDescription`…) |
| iOS | Info.plist : **texte obligatoire**, sinon crash au premier appel |
| Web | `navigator.permissions` / PWA Elements ; l'utilisateur peut refuser → gère le refus (message + bouton « Réessayer ») |

```ts
async ensureCamera() {
  const status = await Camera.checkPermissions();               // 'granted' | 'denied' | 'prompt'
  if (status.camera !== 'granted') {
    const asked = await Camera.requestPermissions({ permissions: ['camera'] });
    if (asked.camera !== 'granted') throw new Error('CAMERA_REFUSED');   // → message UI clair
  }
}
```

Toujours **check puis request** au premier usage (pas au démarrage), et toujours prévoir le refus.

## 6. Déboguer le natif

| Besoin | Outil |
|---|---|
| Console JS dans l'app native | Android : `chrome://inspect` ; iOS : Web Inspector (Safari → Develop) |
| Voir les requêtes réseau | idem (Remote DevTools) |
| Rechargement à chaud | `npx cap run android --live-reload` |
| Erreurs natives (Gradle, manifests) | `npx cap open android` + Android Studio |
| Logs serveur d'API | le WebView fait une vraie requête : CORS s'applique, configure `android:usesCleartextTraffic` en dev si HTTP |

## Checkpoint

1. `npx cap add android && npx cap sync` → l'app s'installe, s'ouvre, la galerie web fonctionne toujours.
2. Prends une photo : elle apparaît **immédiatement** (signal) et survit à un `npm start` → relancement (Preferences + Filesystem).
3. Coupe la caméra / refuse la permission → message clair, pas d'écran bloqué.
4. Sur le web (pas de natif), la même action passe par PWA Elements (`defineCustomElements(window)`).
5. `npx cap doctor` : 0 erreur.
