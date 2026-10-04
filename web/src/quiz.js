/* Quiz du cours — données (window.QUIZ) */
window.QUIZ = [
  {
    id: 'q1',
    q: 'Qui décide de la pile d\'écrans (d\'où vient le « back ») ?',
    options: [
      'Le routeur Ionic (IonRouter)',
      'Le Router Angular, rendu et animé par IonRouterOutlet',
      'ion-tabs, qui maintient une pile par onglet',
      'Le navigateur (historique HTML5), répliqué par Ionic'
    ],
    answer: 1,
    explain: "Ionic n'a pas de routeur : le Router Angular reste la source de vérité, IonRouterOutlet transforme la navigation en pile visuelle (transitions + swipe-back). ion-tabs fournit seulement une pile imbriquée par onglet.",
    ref: '#/02-navigation'
  },
  {
    id: 'q2',
    q: 'Un composant chargé en lazy importe ses composants Ionic depuis…',
    options: [
      '@ionic/angular',
      '@ionic/angular/standalone',
      '@ionic/angular/lazy',
      '@ionic/core/components'
    ],
    answer: 2,
    explain: "Depuis Ionic 9, le chemin par défaut est @ionic/angular (standalone) ; pour les composants lazy on utilise @ionic/angular/lazy, qui évite de tirer le bundle complet dans chaque chunk. @ionic/core ne s'importe jamais directement en Angular.",
    ref: '#/91-pieges-v9'
  },
  {
    id: 'q3',
    q: 'Dans Ionic 9 + Angular 22, pourquoi `ionViewWillEnter() { this.items = await load(); }` ne rafraîchit-il rien ?',
    options: [
      'ionViewWillEnter n\'est pas appelé en zoneless',
      'La navigation est trop rapide pour le rendu',
      'Zoneless + OnPush par défaut : il faut écrire dans un signal',
      'Il fautObservable pour notifier Angular'
    ],
    answer: 2,
    explain: "Angular 21+ est zoneless et Angular 22 rend OnPush par défaut : seule une écriture dans un signal (ou un event binding) déclenche le rendu. Le pattern correct : items = signal([]) puis items.set(...).",
    ref: '#/06-donnees'
  },
  {
    id: 'q4',
    q: 'Quel overlay pour « choisis une action parmi 3 » ?',
    options: [
      'ion-alert avec inputs radio',
      'ion-action-sheet',
      'ion-popover',
      'ion-toast'
    ],
    answer: 1,
    explain: "2 à 6 actions → ion-action-sheet (le rôle du bouton est renvoyé). Un seul choix parmi des valeurs → ion-alert + inputs. Un toast n'est pas interactif ; un popover est ancré à un élément.",
    ref: '#/04-overlays'
  },
  {
    id: 'q5',
    q: 'Après un pull-to-refresh, l\'appel indispensable est…',
    options: [
      'ev.target.complete()',
      'ionRefresher.refresh()',
      'content.scrollToTop()',
      'complete() sur le ion-content'
    ],
    answer: 0,
    explain: "Sans complete(), le spinner reste en rotation et l'événement peut se rejouer en boucle. À faire dans un finally pour couvrir aussi le chemin d'erreur.",
    ref: '#/03-composants'
  },
  {
    id: 'q6',
    q: 'Comment afficher une image `file://` dans la WebView native ?',
    options: [
      'img.src = uri directement',
      'Capacitor.convertFileSrc(uri)',
      'Filesystem.readFile() puis base64, toujours',
      'convertFileSrc() uniquement sur iOS'
    ],
    answer: 1,
    explain: "La WebView bloque les URL file:// ; convertFileSrc() les réécrit pour le protocole http du pont Capacitor. Sur le web (pas de natif), les fichiers stockés doivent être relus en base64 au moment du rendu.",
    ref: '#/07-capacitor'
  },
  {
    id: 'q7',
    q: 'Avec ion-tabs en Ionic 9, faut-il écrire <ion-router-outlet> dans le template ?',
    options: [
      'Oui, avant ion-tab-bar',
      'Oui, après ion-tab-bar',
      'Non : ion-tabs fournit son propre outlet',
      'Seulement si les onglets sont lazy'
    ],
    answer: 2,
    explain: "Le composant IonTabs d'Ionic 9 injecte lui-même un <ion-router-outlet> quand aucun ion-tab enfant n'est déclaré. Les tutoriels plus anciens montrent encore l'outlet explicite : c'est devenu inutile (et redondant).",
    ref: '#/02-navigation'
  },
  {
    id: 'q8',
    q: 'Je veux styler l\'intérieur d\'un ion-input depuis mon CSS de composant. La bonne approche ?',
    options: [
      'ion-input .input-wrapper { border: 2px solid red }',
      'ion-input::deep(.input-wrapper) { … }',
      'Variables CSS et/ou ::part() (shadow parts)',
      'ion-input !important { … }'
    ],
    answer: 2,
    explain: "Shadow DOM : l'intérieur du composant est encapsulé. On passe par les variables CSS documentées, les shadow parts (ex. ::part(label)), ou le style du slot que l'on écrit. ::deep() et !important ne sont pas des solutions — c'est une dette.",
    ref: '#/05-styling'
  },
  {
    id: 'q9',
    q: 'Quel provider évite un rechargement complet du document à chaque navigation ?',
    options: [
      'provideZonelessChangeDetection()',
      'IonicRouteStrategy',
      'provideIonicAngular({ animated: false })',
      'withPreloading(PreloadAllModules)'
    ],
    answer: 1,
    explain: "IonicRouteStrategy (fourni comme RouteReuseStrategy) ne recharge le document qu'au rafraîchissement d'une URL profonde. Sans lui, chaque navigation recharge la page : animations et état perdus. Le preloading, lui, précharge les chunks.",
    ref: '#/01-demarrage'
  },
  {
    id: 'q10',
    q: 'Quel couple est correct pour une galerie photo qui doit survivre au redémarrage ?',
    options: [
      'Filesystem pour les images, Preferences (JSON) pour les chemins',
      'Preferences pour tout (base64 inclus)',
      'localStorage pour tout, même en natif',
      'Le signal du service : il est persisté nativement'
    ],
    answer: 0,
    explain: "Les blobs en base64 dans Preferences saturent le stockage et la RAM : on écrit les fichiers avec Filesystem (Directory.Data) et on ne stocke que les métadonnées/chemins. Les signaux ne survivent pas au redémarrage, par construction.",
    ref: '#/07-capacitor'
  }
];
