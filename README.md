# Fiche Ellingsen — compte et révision multilingue

L’accès passe désormais par la création d’un compte ou la connexion à un compte existant, avec email/mot de passe ou Google. Après la première connexion, une courte page propose la langue de compréhension et le mode de préparation. Les comptes existants passent aussi par ce choix une seule fois.

Trois modes sont disponibles :

| Mode | Cours | Questions et recto des cartes | Explications |
| --- | --- | --- | --- |
| Tout dans ma langue | Langue choisie | Langue choisie | Langue choisie |
| Bilingue guidé | Texte dans la langue choisie ; titres, questions centrales et notions en anglais | Anglais | Langue choisie |
| Préparation à l’examen en anglais | Anglais | Anglais | Encadrés explicatifs, pièges à éviter, corrections du quiz et verso des cartes dans la langue choisie |

La langue choisie peut être le français, l’anglais ou l’ukrainien. Les citations anglaises, noms propres, formules et sigles restent conservés. Le lexique garde sa colonne de référence anglaise. Les boutons EN / UK donnent toujours une aide ponctuelle sans modifier les préférences générales. La page de connexion reprend le logo Google multicolore du Micro Lab et propose Google en premier, avec email/mot de passe en alternative. Son formulaire est adapté aux écrans mobiles et au thème sombre. Le bouton **Préférences** permet de changer le mode ; FR / EN / UK change la langue de compréhension. Ces modifications conservent la progression, la question de quiz et les réglages du micro-lab.

## Configuration Firebase active

Le site utilise désormais le projet [Global challenges](https://console.firebase.google.com/project/global-challenges-a04c4/overview), ID `global-challenges-a04c4`. L’application Web est **Ellingsen Study Guide**. Google et email/mot de passe sont activés ; `localhost` est autorisé. La base Firestore `(default)` est en édition Standard, région **Stockholm (`europe-north2`)**, avec le quota gratuit. Les règles de `firestore.rules` ont été publiées. Le site lui-même n’est pas hébergé publiquement.

`firebase-config.js` contient la configuration Web publique réelle. Le modèle vide à remplir pour un autre projet est conservé dans `firebase-config.example.js`. Aucun secret administrateur ni compte de service n’est nécessaire.

## Configurer un autre projet Firebase

1. Dans la [console Firebase](https://console.firebase.google.com/), créer un projet et ajouter une application **Web**.
2. Dans **Authentication → Sign-in method**, activer **Email/Password** et **Google**. Pour Google, choisir l’adresse d’assistance.
3. Dans **Authentication → Settings → Authorized domains**, ajouter le domaine du site et explicitement `localhost` pour les essais locaux.
4. Créer une base **Cloud Firestore** en mode production, puis choisir sa région.
5. Copier la configuration Web dans `firebase-config.js`, en renseignant au minimum `apiKey`, `authDomain`, `projectId` et `appId`.
6. Publier le contenu de `firestore.rules` dans **Firestore Database → Rules**. Une seule autorisation y figure :

   ```text
   allow read, write: if request.auth != null && request.auth.uid == userId;
   ```

Le SDK Web modulaire est épinglé à **12.19.0**, chargé depuis `https://www.gstatic.com/firebasejs/12.19.0/`. Les clés de configuration Web sont publiques. Ne jamais ajouter de compte de service, de clé privée ni de secret administrateur au dépôt. Voir les documentations officielles [installation Web](https://firebase.google.com/docs/web/setup), [Google](https://firebase.google.com/docs/auth/web/google-signin) et [règles par utilisateur](https://firebase.google.com/docs/rules/rules-and-auth).

## Démarrer le site avec un accès réellement protégé

L’interface reste en HTML/CSS/JS sans build. **Un serveur est maintenant nécessaire pour contrôler l’accès au contenu.** Depuis ce dossier, avec Node.js 22 ou supérieur :

```sh
npm ci --ignore-scripts --omit=optional
npm start
```

Ouvrir [le site local](http://localhost:8000/). La première commande installe les dépendances du serveur ; la seconde lance `server.mjs`, lié par défaut à `127.0.0.1`.

Le serveur ne livre `ellingsen.html` et les catalogues EN/UK qu’après validation d’un jeton Firebase signé, pour le projet configuré. Sans session, il redirige vers `login.html` ; les catalogues renvoient 401. Seuls la page de compte et le modèle de configuration Web sont publics. Les extractions, sources serveur, dépendances, tests et fichiers Git ne sont jamais servis.

Le serveur utilise **firebase-admin 13.6.0**, uniquement pour [vérifier les jetons d’identité](https://firebase.google.com/docs/auth/admin/verify-id-tokens) avec les certificats publics Firebase et le `projectId`. Il ne lit ni n’écrit Firestore et n’utilise aucune clé de compte de service. Le cookie de session est `HttpOnly`, `SameSite=Strict`, `Secure` en HTTPS, et expire avec le jeton, au plus après une heure. Le client actualise ce cookie lorsque Firebase renouvelle le jeton. La signature, le projet et l’expiration sont vérifiés à chaque requête protégée ; la révocation administrative immédiate n’est pas interrogée. La déconnexion efface le cookie du navigateur. Les réponses privées ne sont pas mises en cache, et les opérations de session refusent les origines différentes.

Pour un hébergement, déployer **ce serveur Node** derrière HTTPS, avec l’origine exacte, par exemple :

```sh
HOST=0.0.0.0 PORT=8000 APP_ORIGIN=https://revision.example.org npm start
```

Le proxy HTTPS doit transmettre `/`, `/login.html`, `/session`, `/ellingsen.html`, `/firebase-config.js` et `/i18n/*` à ce serveur. Ne pas publier parallèlement les fichiers comme ressources statiques publiques : cela contournerait le contrôle d’accès. `APP_ORIGIN` doit correspondre exactement à l’origine du navigateur ; le serveur refuse une origine HTTP distante.

Un simple `python3 -m http.server`, un hébergement exclusivement statique ou `file://` ne peut pas protéger la source d’un fichier HTML. L’ouverture directe du fichier affiche désormais l’écran de compte et laisse la fiche verrouillée, sans erreur JavaScript ; la connexion demande le serveur. Une configuration Firebase vide laisse également l’accès verrouillé avec une explication. Aucun contournement invité n’est proposé.

## Profil et progression

Le document `users/{uid}` contient :

```js
{
  studied: { "1": true },
  cards: { "c:question originale": 1, "v:terme anglais": 2 },
  lang: "uk", // fr, en ou uk : langue de compréhension
  studyMode: "guided", // full, guided ou exam
  preferencesSet: true,
  updatedAt: serverTimestamp()
}
```

La fiche s’ouvre seulement une fois le profil chargé et les préférences enregistrées. En cas d’échec de lecture ou de sauvegarde initiale, l’écran reste verrouillé et propose de réessayer. À la reconnexion, les préférences et la progression sont restaurées ; le choix initial n’est pas redemandé. Un échec de sauvegarde de progression conserve les changements en attente et affiche un bouton de reprise.

Les anciennes clés `ioe-done` et `ioe-cards` sont conservées pour importer une progression créée avant l’obligation de compte. Une empreinte empêche de réimporter les mêmes données dans plusieurs comptes. Les nouvelles progressions passent exclusivement par Firestore. `ioe-lang` mémorise la langue d’interface du navigateur ; le profil connecté fait autorité. Tous les accès à localStorage sont protégés par `try/catch`.

Les règles peuvent être republiées depuis ce dossier avec une CLI Firebase authentifiée :

```sh
firebase deploy --only firestore:rules --project global-challenges-a04c4
```

`firebase.json` ne contient que le déploiement des règles, et `.firebaserc` pointe sur ce projet. Cette commande ne publie aucun fichier du site.

Les identifiants des cartes restent fondés sur leurs questions ou termes de référence d’origine. Les modes de révision changent uniquement l’affichage, sans modifier les scores ni les données des jeux.

## Vérifications

```sh
npm test
```

Les tests serveur vérifient les accès anonymes, les catalogues privés, les fichiers non servis, les jetons invalides/expirés, l’origine des opérations de session, les cookies et les réponses authentifiées. Le vérificateur Firebase y est simulé pour des tests déterministes.

Les contrôles navigateur ont couvert l’accès obligatoire, l’inscription et Google simulés, les préférences, leur restauration, les trois modes, les treize chapitres dans les trois langues, les corrections du quiz, le maintien de l’état des outils, les erreurs Firestore et les écrans mobile/ordinateur. La configuration réelle a également été vérifiée : Firebase génère une URL de connexion Google (HTTP 200), autorise `localhost`, et Firestore refuse les requêtes anonymes. Le parcours réel Google a également réussi dans le navigateur : création de session protégée, enregistrement des préférences, sauvegarde d’un chapitre étudié dans Firestore et restauration après rechargement. Le chapitre utilisé pour ce contrôle a été remis dans son état initial. Aucun hébergement public du site n’est déployé.

Les traductions restent des objets JavaScript indexés par identifiants numériques, dans deux scripts classiques. Les **1 974 blocs** de l’extraction initiale sont conservés ; les catalogues comptent désormais **3 760 entrées** chacun. Balises, entités, liens, hash et données des matrices/arbres ont été comparés automatiquement. Les outils contiennent **213 termes**, **304 cartes** et **90 questions**.

`i18n/blocks.json` et `i18n/tagged.html` conservent l’extraction initiale pour audit. Ne pas les publier avec un serveur statique. Ne pas renuméroter les blocs ni les cartes sans vérifier les données déjà enregistrées. L’extraction initiale a utilisé :

```sh
python3 -I i18n/extract.py ellingsen.html i18n/tagged.html i18n/blocks.json
```

Le texte distingue les chapitres 1–10 du livre et la reconstruction des chapitres 11–13 depuis les supports de cours. Les indications d’incertitude et les formules originales sont conservées, y compris le libellé du triangle au chapitre 7 (`u1 + u2 = 2` pour la frontière, l’intérieur satisfaisant `≤ 2`).

Le projet est versionné dans le dépôt privé [derka1385/ellingsen-study-guide](https://github.com/derka1385/ellingsen-study-guide). Les commits locaux ont été poussés sur `main` avec l’autorisation de l’utilisateur. Ce dépôt contient le code source ; aucun hébergement du site n’est encore déployé. La connexion Google est maintenant activée dans le projet Firebase Global challenges. Pour l’utiliser, lancer le serveur local ci-dessus ou héberger ce serveur derrière HTTPS ; une page GitHub de code source ne sert pas le site.
