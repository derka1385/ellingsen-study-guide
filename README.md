# Fiche Ellingsen — français, anglais, ukrainien

Ouvrir `ellingsen.html` directement dans un navigateur. Aucun build ni installation n’est nécessaire. Les traductions sont chargées par deux scripts classiques (`i18n/en.js` et `i18n/uk.js`), avec des objets indexés par identifiants numériques. Aucun `fetch` de JSON n’est utilisé : la lecture fonctionne en `file://`.

Le sélecteur FR / EN / UK change la langue de la fiche et des outils. Les petits boutons EN / UK ouvrent la traduction du passage ou du terme sélectionné sans changer la langue générale. Les citations déjà en anglais, les formules et les sigles sont conservés. Le lexique garde une colonne de référence avec les termes anglais du livre.

## Configurer Firebase

1. Dans la [console Firebase](https://console.firebase.google.com/), créer un projet, puis ajouter une application **Web**. Google Analytics est facultatif.
2. Ouvrir **Authentication → Sign-in method**. Activer **Email/Password** et **Google**. Pour Google, sélectionner une adresse d’assistance et enregistrer.
3. Dans **Authentication → Settings → Authorized domains**, ajouter les domaines servant réellement la fiche. Ajouter explicitement `localhost` pour les tests locaux : les nouveaux projets ne l’autorisent plus automatiquement.
4. Ouvrir **Firestore Database**, créer une base **Cloud Firestore** en mode production et choisir sa région.
5. Dans les paramètres du projet, copier la configuration de l’application Web dans `firebase-config.js`. Renseigner au minimum `apiKey`, `authDomain`, `projectId` et `appId`. Les autres champs peuvent être copiés avec la configuration fournie.
6. Dans **Firestore Database → Rules**, remplacer les règles par le contenu de `firestore.rules`, puis cliquer sur **Publier** :

   ```text
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

7. Pour les comptes, servir le dossier via HTTP(S). Pour un test local, depuis ce dossier :

   ```sh
   python3 -m http.server 8000 --bind 127.0.0.1
   ```

   Ouvrir ensuite [la fiche locale](http://localhost:8000/ellingsen.html). La connexion Google exige une origine HTTP(S) autorisée ; elle n’est pas utilisable en `file://`. En `file://`, la fiche conserve intégralement son mode invité et affiche une indication dans la fenêtre de connexion, sans charger Firebase.

Le SDK **modulaire Firebase 12.19.0** est épinglé. Les modules App, Auth et Firestore sont importés depuis `https://www.gstatic.com/firebasejs/12.19.0/` uniquement si la configuration est renseignée et la page ouverte via HTTP(S). Voir les documentations officielles [installation Web](https://firebase.google.com/docs/web/setup), [authentification Google](https://firebase.google.com/docs/auth/web/google-signin) et [règles par utilisateur](https://firebase.google.com/docs/rules/rules-and-auth).

Les clés de configuration Web Firebase sont publiques par conception. La protection des données repose sur Authentication et les règles Firestore. Ne jamais ajouter de clé de compte de service, de secret Admin SDK ou de clé privée au projet.

## Progression et comptes

En mode invité, les clés existantes `ioe-done` et `ioe-cards` restent utilisées. La langue est enregistrée dans `ioe-lang`. Chaque accès à `localStorage` est protégé par `try/catch` ; un navigateur qui refuse le stockage peut toujours afficher et utiliser la fiche, avec une progression conservée seulement en mémoire pendant la session.

Après connexion, la progression est lue dans le document `users/{uid}` :

```js
{
  studied: { "1": true },
  cards: { "c:question originale": 1, "v:terme anglais": 2 },
  lang: "fr", // "fr", "en" ou "uk"
  updatedAt: serverTimestamp()
}
```

Lorsqu’une progression invitée n’a pas encore été importée, elle est fusionnée avec celle du compte : un chapitre étudié reste étudié et la meilleure note de carte est conservée. Une empreinte locale évite de réimporter automatiquement la même progression dans un autre compte. Les valeurs invitées restent disponibles après déconnexion.

Une fois connecté, les modifications de chapitres et de cartes écrivent dans Firestore, sans remplacer `ioe-done` ni `ioe-cards`. Les identifiants des cartes déjà présentes restent identiques, quelle que soit la langue affichée. La langue est également sauvegardée dans le compte. La fiche écoute les changements du document pour actualiser la progression sur les autres appareils.

Une erreur de lecture du compte ne provoque aucune écriture automatique ni remplacement par les données locales. Une sauvegarde échouée reste en attente en mémoire et le bouton **Réessayer la sauvegarde** permet de la relancer. La déconnexion attend les sauvegardes ; si elles échouent, elle affiche l’erreur pour éviter une perte silencieuse.

## Vérification

- Ouvrir la fiche en `file://` avec la configuration vide : navigation par hash, matrices, arbres, lexique, cartes et quiz fonctionnent sans Firebase.
- Passer successivement en FR, EN et UK ; visiter les treize chapitres et les outils. Ouvrir une aide EN/UK et vérifier que le sélecteur général reste inchangé.
- Marquer un chapitre et noter une carte en mode invité ; recharger pour vérifier la restauration locale.
- Avec une configuration Firebase valide, ouvrir en HTTP(S), créer un compte email/mot de passe, puis vérifier aussi la connexion Google. Contrôler le document `users/{uid}` dans la console Firestore.
- Modifier une progression connectée, se déconnecter puis se reconnecter, et vérifier sa restauration. Vérifier que le mode invité retrouve ses données locales.
- Tester deux comptes : chacun doit lire et écrire uniquement son document. Les autres chemins Firestore doivent être refusés.

Les tests locaux de l’intégration utilisent des réponses Firebase simulées pour couvrir migration, sauvegarde, reconnexion et erreurs. Le test réel de Google et de Firestore doit être effectué après ajout de votre configuration ; aucun projet Firebase n’est fourni ni créé automatiquement.

## Sources et maintenance

Le projet a été retrouvé dans un espace de travail temporaire de Claude. Il est mis à jour à son emplacement d’origine ; sa version initiale est conservée dans l’historique Git local. Une copie identique accompagne les livrables. Le texte d’origine distingue les chapitres 1–10 du livre et la reconstruction des chapitres 11–13 à partir des supports de cours. Les indications de source et d’incertitude restent présentes. Un libellé du schéma au chapitre 7 décrit le triangle réalisable avec `u1 + u2 = 2`, alors que son intérieur satisfait `u1 + u2 ≤ 2` ; les formules originales ont été conservées conformément à la consigne.

L’extraction initiale a été exécutée avec la commande demandée et a produit **1 974 blocs** :

```sh
python3 -I i18n/extract.py ellingsen.html i18n/tagged.html i18n/blocks.json
```

`blocks.json` et `tagged.html` conservent cette extraction initiale pour audit. Les identifiants supplémentaires des catalogues couvrent les textes des tableaux JavaScript, légendes, attributs d’accessibilité et nouveaux contrôles. Ne pas renuméroter les blocs ou les cartes sans régénérer les deux catalogues et vérifier les données déjà enregistrées. La réexécution brute de l’extracteur sur la version enrichie ne constitue pas une procédure de mise à jour des catalogues.

Un commit Git local accompagne la livraison. Aucun dépôt distant ni push GitHub n’est créé par cette modification.

## Contrôles exécutés avant livraison

Les deux catalogues contiennent chacun **3 730 entrées** : les **1 974 blocs** extraits et **1 756 textes supplémentaires** pour les tableaux JavaScript, légendes et contrôles. Les balises, attributs, liens et entités HTML de tous les blocs d’origine ont été comparés automatiquement. Les données de matrices et d’arbres et les destinations de navigation sont inchangées.

Le lexique contient **213 entrées**, les flashcards **304 cartes**, et le quiz **90 questions**, avec une couverture des chapitres 11–13 ajoutée aux outils.

Les tests navigateur ont réussi en `file://`, sur écran large et mobile : les treize chapitres dans les trois langues, aides ponctuelles, recherche, progression, identifiants de cartes, état du quiz lors du changement de langue, labo, navigation par hash, restauration après rechargement et refus de localStorage. Aucun message d’erreur JavaScript ni console n’a été relevé dans ces tests.

L’intégration Firebase a été vérifiée avec des modules simulés pour les flux email/Google, la migration, la sauvegarde, la reconnexion, l’isolation des comptes, la synchronisation et les erreurs. Cette simulation ne remplace pas un essai réel avec un projet Firebase configuré.
