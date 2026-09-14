# Cahier des charges — Repwise

## 1. Positionnement

Une app web (+ mobile à terme) de suivi musculation tout-en-un, pensée pour les pratiquants qui veulent un outil pratique et rapide (pas un simple blog de conseils). L'angle différenciant : tout est centralisé au même endroit — calcul des besoins, journal de séances, journal alimentaire, carte du corps interactive, et recommandations — sans avoir à jongler entre trois apps différentes.

**Nom** : Repwise
**Nom de domaine** : repwise.fr ou getrepwise.app (repwise.app et repwise.com sont pris)
**Plateformes** : site web en priorité, puis application mobile gratuite sur App Store et Google Play une fois le web stabilisé

## 2. Onboarding (première visite) — refonte après premier test utilisateur

Retour de test : trop d'informations demandées d'un coup. Nouvelle version en 4 étapes, avec une **barre de progression en haut** indiquant l'étape en cours.

1. **Profil de base** : pseudo, date de naissance, poids, taille. Poids et taille via un **sélecteur (liste/molette)** plutôt qu'un champ à remplir librement ; si saisie manuelle proposée en complément, elle doit **n'accepter que des chiffres**.
2. **Fréquence et objectif** : nombre de séances de sport par semaine, puis objectif physique choisi dans une liste : prise de masse / perte de poids / prise de muscle / perte de poids et stabilisation / cardio (préparation marathon) / pratique libre et préservation de la masse musculaire.
3. **Programme alimentaire gratuit sur 1 mois** : calculé automatiquement à partir de l'objectif, du poids, de la taille et du nombre de séances par semaine (s'appuie sur le calculateur de calories/macros, présenté comme un résultat concret dès l'onboarding plutôt qu'un simple chiffre).
4. **Proposition de créer un compte** pour sauvegarder tout ce qui vient d'être calculé (le mode invité peut voir le résultat avant de s'engager, mais perd tout s'il ne crée pas de compte).

Ce profil sert ensuite à personnaliser le calculateur de calories, les recommandations d'exercices, et l'affichage du niveau dans l'app.

**Point ouvert (résolu)** : le niveau déclaré (Débutant/Intermédiaire/Confirmé), qui servait à trier les exercices sur la carte du corps, est déduit automatiquement du nombre de séances/semaine plutôt que redemandé — voir `backend/src/utilisateurs/niveaux.js`.

## 3. Fonctionnalités

### MVP (V1 — à livrer en premier)
- **Calculateur de calories/macros** : à partir du poids, de la taille, de l'âge, du sexe, du niveau d'activité et de l'objectif (prise de masse / perte de gras / recomp / maintien) → calcul des calories cibles + répartition protéines/glucides/lipides (formule Mifflin-St Jeor + facteur d'activité).
- **Calendrier de séances** : vue mensuelle. Clic sur un jour → formulaire de séance :
  - Type de séance (Push / Pull / Legs / Upper / Lower / Full body / personnalisé)
  - Liste d'exercices effectués, chacun avec : séries, répétitions par série, poids utilisé, temps de repos
  - Notes libres (ressenti, douleur, etc.)
- **Journal alimentaire du jour** : ajout d'aliments/repas avec **image de l'aliment et vraies valeurs nutritionnelles** (protéines, glucides, lipides, sucre, etc.), total du jour comparé à l'objectif calculé (barres de progression protéines/glucides/lipides, `ResumeNutrition.jsx`). Revenu sur la limite volontaire initiale (pas de base d'aliments) : branché sur **Open Food Facts** (recherche par nom, calories/macros/sucre pour 100 g + image), avec une quantité en grammes qui met tout à l'échelle. Pas de modification d'un aliment existant : suppression puis ré-ajout. Recherche/sélection dans cette base plutôt que saisie manuelle des valeurs — implémenté dans `backend/src/alimentation/routes.js` (proxy vers `world.openfoodfacts.org`, pas d'appel direct depuis le front).
  - **Autocomplétion à la recherche (retour du 14/09)** : Open Food Facts seul est une base de produits À CODE-BARRES, pauvre sur les aliments bruts ("poulet", "banane"...). Ajout de `bibliotheque_aliments` (`database/aliments.sql`, ~150 aliments courants — viandes, poissons, œufs/laitages, légumes, fruits, féculents, légumineuses, matières grasses, sucreries, snacks, boissons, plats préparés), interrogée en premier (instantané, sans réseau) puis complétée par Open Food Facts pour les produits de marque — les deux sources sont fusionnées, dédoublonnées par nom. Valeurs approximatives de référence (type CIQUAL/USDA), à la différence des valeurs Open Food Facts qui viennent de la fiche exacte d'un produit.
- **Compte utilisateur simple** : inscription/connexion pour retrouver son historique.
- **Carte du corps interactive** : silhouette humaine (vue avant/arrière) avec 14 groupes musculaires cliquables (le muscle sélectionné s'allume en orange), doublée de puces sous la silhouette pour sélectionner un muscle directement (pratique pour les petites zones type avant-bras). Chaque exercice s'affiche en card avec son niveau, un conseil d'exécution, et deux boutons :
  - **"Ajouter à ma séance"** : ajoute l'exercice à la séance du jour (créée automatiquement si elle n'existe pas encore), prêt à saisir les répétitions
  - **"Ajouter à mon programme"** : ajoute l'exercice à un programme existant ou nouveau, avec des séries/répétitions par défaut (3×10)

  Le niveau déclaré à l'onboarding sert de tri : les exercices à la portée du niveau de l'utilisateur sont mis en avant, les plus avancés portent la mention "Plus avancé que ton niveau actuel".

  **Affichage desktop** : la liste d'exercices ne s'affiche plus sous la silhouette mais sur le côté, dans un panneau qui glisse à l'ouverture (animation type menu burger), le contenu principal se décalant vers la droite pour lui laisser la place.
- **Page feedback / signalement de bug** : formulaire simple (type de retour : suggestion ou bug, description, email optionnel) pour que les utilisateurs proposent des fonctionnalités ou remontent des problèmes.

### V2 (une fois le MVP stable)
- **Recommandations d'exercices** : suggestions selon poids, objectif et historique récent (règles simples au départ, ex. progression de charge automatique si toutes les séries ont été réussies).
- **Graphiques de progression** : évolution du poids soulevé par exercice, évolution du poids corporel dans le temps.
- **Bibliothèque d'exercices** : fiche par exercice (muscles ciblés, exécution) pour faciliter la saisie, avec **image ou vidéo de démonstration** affichée à côté du nom dans les listes et cards — colonne `image_ou_gif` servie par l'API (`backend/src/exercices/routes.js`), renseignée pour 56 des 68 exercices via des images [wger.de](https://wger.de) sous licence Creative Commons (voir §10, `database/bibliotheque-images.sql`, page `/credits` pour l'attribution) ; les 12 restants gardent le repli générique (icône haltère) faute d'équivalent chez wger.de.
- **Export/partage de séance**.
- **Système de rang** : 8 rangs, chacun décliné en 3 paliers (III → II → I), soit 24 niveaux au total. Thème gym/anglicismes, en intensité croissante :
  1. Rookie
  2. Grinder
  3. Fighter
  4. Beast
  5. Savage
  6. Monster
  7. Legend
  8. GOAT

  Progression de couleur des badges (du terne au précieux, cohérence visuelle des 24 niveaux) : Rookie = gris terne, Grinder = bronze/cuivré, Fighter = vert, Beast = bleu, Savage = violet, Monster = rouge/orangé profond, Legend = argent brillant, GOAT = or éclatant. Style visuel des badges : effet "gemme/cristal à facettes" avec glow, façon rangs de jeux compétitifs (Overwatch, Valorant, Marvel Rivals) — volontairement plus flashy/détaillé que le design flat et sobre du reste du site, car c'est l'endroit où la gamification doit donner envie de progresser. Les 3 paliers (III/II/I) d'un même rang se différencient par un petit indicateur (1 à 3 barres sous la gemme). Rang affiché sur le dashboard, dans l'en-tête, et sur le Profil.

  Calcul du score (sur les séances des 6 dernières semaines) : chaque exercice est comparé à un repère de niveau intermédiaire ("soulever X fois son poids de corps"). Seuls les exercices ayant un repère défini comptent (22 exercices : squat, développé couché, tractions...) — un curl et un squat n'étant pas comparables sans repère. On garde le meilleur score par groupe musculaire, puis on fait la moyenne ; le score baisse si moins de 4 groupes musculaires sont travaillés (pas de GOAT en ne faisant que des curls). Repères abaissés pour les femmes via un coefficient (×0,7, estimation à ajuster). Un pratiquant intermédiaire se situe autour de Beast I (Savage II est déjà un bon niveau) — calibrage validé. Tous ces réglages sont centralisés dans `backend/src/rang/calcul.js`.

  **Système de points/quêtes** (s'ajoute au score de performance, ne le remplace pas) : 3 quêtes quotidiennes (types fixes, choisis par Claude Code faute de précision dans le cahier — logger une séance, atteindre son objectif calorique ±15%, travailler un groupe musculaire qui tourne chaque jour sur les 14 groupes) + 1 quête hebdomadaire (3 séances dans la semaine), générées à la volée au premier accès à `/api/quetes` pour la période (pas de cron). Points modestes (5/quotidienne, 20/hebdomadaire) convertis en bonus de score via `POINTS_VERS_SCORE` (`backend/src/rang/calcul.js`) : même en réussissant tout, tout le temps sur 6 semaines, le bonus plafonne à ~4 paliers — jamais suffisant à lui seul pour atteindre GOAT, et jamais suffisant à lui seul pour sortir de "Non classé" sans au moins un exercice de référence loggé.

  **Page Rang** (nouvelle page, `/rang`) : rang actuel avec barre de progression vers le palier suivant, quêtes du jour et de la semaine avec leur état, et une section "Récap" qui liste le meilleur score par exercice ayant compté dans le calcul.
- **Streak (flamme)** : compteur de jours consécutifs avec une séance loggée, affiché avec une icône flamme + nombre de jours et record personnel sur le dashboard. Logique retenue : **1 jour de repos toléré** entre deux séances sans casser la série (deux jours d'affilée sans séance la remettent à zéro) — géré par une constante unique (`JOURS_DE_REPOS_TOLERES`, réglable à 0 pour repasser en remise à zéro stricte). La flamme reste allumée le matin, avant la séance du jour.
- **Classement top 100** : ladder visible uniquement pour départager les utilisateurs ayant atteint le rang GOAT, classés par score de performance. Seuls les comptes apparaissent (pas les invités), affichés avec **pseudo** (pas le prénom, pour la vie privée), palier, score et flamme de streak.
- **Compte admin et page Admin** (`/admin`, rôle `admin` sur `utilisateurs`) : accès à l'ensemble des réglages/paramètres qu'un admin doit pouvoir contrôler — périmètre volontairement ouvert, détaillé avec Claude Code au fur et à mesure des besoins réels. Construit à ce jour : vue de tous les utilisateurs, modification manuelle du rang de n'importe qui (corriger une anomalie ou faire une démo — écrit directement `rangs_utilisateur`, donc **éphémère** : le prochain recalcul naturel de cet utilisateur écrase la correction), lecture des feedbacks reçus (avec changement de statut), et un bloc **statistiques d'usage** (nombre d'utilisateurs/comptes/invités, utilisateurs actifs et séances sur 7 jours, feedback non traité, répartition des rangs atteints). Pas de flux d'inscription admin : premier compte promu à la main en base (`UPDATE utilisateurs SET role = 'admin' WHERE id = ...`, voir README). D'autres réglages (modération, gestion des quêtes...) s'ajouteront à cette page à la demande plutôt que d'être anticipés.

### Fonctionnalités construites en plus du cahier des charges initial
- **Page Profil** (nouvel onglet) : infos utilisateur, liens vers Progression/Programmes/Classement/Calculateur/Feedback, déconnexion. Chaque poids enregistré alimente la courbe de poids.
  - **Enrichissements demandés** : photo de profil, bio, section récapitulative des séances récentes **avec un réglage de visibilité que l'utilisateur contrôle lui-même** (afficher ou non aux autres). Courbe de poids et courbes de charge par exercice affichées ici, mais **strictement privées** : visibles uniquement par l'utilisateur, même si le reste du profil est rendu public.
  - **Mise en page desktop en plusieurs colonnes** (même logique que le reste du site, voir section 7) : le bandeau d'en-tête et la section Compte restent pleine largeur, mais "Mes infos"/bio d'un côté et séances récentes/liens rapides de l'autre passent en 2 colonnes à partir de 900px (`.profil-grille`, même principe que la grille 2 colonnes du dashboard) — fait.
- **Page Progression** : courbe de poids de corps + une courbe par exercice (charge max théorique sur une répétition, formule d'Epley), avec info-bulle au survol et tableau dépliable de tous les relevés.
- **Rappel dans le formulaire de séance** : sous chaque exercice, affichage de la dernière performance ("Dernière fois (9 sept.) : 8·8·8 × 80 kg") avec suggestion (augmenter la charge si toutes les séries sont passées, sinon rester à la même charge) et bouton pour pré-remplir.
- **Partage de séance** : bouton qui envoie un résumé via le partage natif du téléphone (ou copie), sans les notes privées.
- **Widget "À travailler"** sur le dashboard : grands groupes musculaires non travaillés depuis une semaine.

### V3 (monétisation avancée, une fois l'audience là)
- Version premium sans publicité + fonctions avancées (export PDF, programmes tout faits).
- Recommandations de compléments/matériel en lien avec le profil et l'objectif (affiliation).

## 4. Modèle de données (MySQL)

Voir [database/schema.sql](../database/schema.sql) pour la version implémentée. Spécification :

```
utilisateurs
- id, email (nullable si invité), mot_de_passe_hash (nullable si invité), prenom,
  age, poids_actuel, taille, niveau_experience (débutant/intermédiaire/confirmé),
  sexe, niveau_activite, objectif, est_invite, role (utilisateur/admin), date_creation

entrees_alimentaires
- id, utilisateur_id (FK), date, aliment_id (FK vers une base alimentaire externe
  type Ciqual/Open Food Facts, remplace la saisie manuelle initialement prévue),
  quantite, calories, proteines, glucides, lipides, sucre

quetes
- id, type (quotidienne/hebdomadaire), description, points, date_debut, date_fin
  -- 3 quêtes quotidiennes renouvelées chaque jour, 1 quête hebdomadaire par semaine,
  -- toutes liées à la muscu (contenu exact à définir avec Claude Code)

quetes_utilisateur
- id, utilisateur_id (FK), quete_id (FK), date_completion, points_gagnes
  -- Les points gagnés s'ajoutent au score de performance (1RM) dans le calcul
  -- du rang, ils ne le remplacent pas.

seances
- id, utilisateur_id (FK), date, type_seance, notes

exercices_effectues
- id, seance_id (FK), nom_exercice, ordre
- series (JSON ou table séparée : numero_serie, repetitions, poids, temps_repos)

objectifs_caloriques
- id, utilisateur_id (FK), date_calcul, calories_cibles, proteines_cibles,
  glucides_cibles, lipides_cibles

bibliotheque_exercices
- id, nom, groupe_musculaire, description, niveau_difficulte, image_ou_gif
  -- 68 exercices en base sur 14 groupes musculaires (fichier database/bibliotheque.sql,
  -- modifiable directement). image_ou_gif renseignée pour 56/68 via wger.de (§10,
  -- database/bibliotheque-images.sql), repli générique pour les 12 autres.
  -- La saisie d'une séance se relie automatiquement à un exercice de la bibliothèque
  -- quand le nom correspond (majuscules/accents ignorés), utile pour le rang et les
  -- futurs graphiques. Autocomplétion sur la bibliothèque + les exercices récents.

feedback
- id, utilisateur_id (FK, nullable), type (suggestion/bug), description,
  email_contact, date_envoi, statut (nouveau/en_cours/traité)

programmes
- id, utilisateur_id (FK), nom_programme, date_creation

programme_exercices
- id, programme_id (FK), exercice_id (FK vers bibliotheque_exercices), ordre,
  series_cibles, repetitions_cibles, poids_cible (optionnel)

rangs_utilisateur
- id, utilisateur_id (FK), rang (1 à 8), palier (I/II/III), score_performance,
  date_derniere_maj
  -- Rang recalculé à partir des séries enregistrées ; cette table stocke
  -- uniquement le dernier résultat pour afficher le classement rapidement.

-- Pas de table streak : la série de jours consécutifs est recalculée à la
-- volée depuis les séances enregistrées (une séance ajoutée/supprimée après
-- coup resterait sinon fausse). Coût de calcul négligeable.
```

Écarts implémentés par rapport à cette spécification d'origine (voir [database/schema.sql](../database/schema.sql) pour le détail commenté) : `prenom`/`age` sont devenus `pseudo`/`date_naissance` (refonte onboarding, section 2) ; `frequence_seances`, `objectif_declare`, `bio`, `photo_url`, `profil_public` ont été ajoutés sur `utilisateurs` pour l'onboarding refondu et le Profil enrichi (section 3). Pas de table `aliments` séparée pour Open Food Facts : `entrees_alimentaires` garde `code_barres` (nullable, référence OFF) + `image_url` + `quantite` directement, les valeurs nutritionnelles étant déjà celles mises à l'échelle de la quantité choisie plutôt qu'un pour-100g à recalculer à chaque lecture. En revanche une table `bibliotheque_aliments` existe bien (ajoutée le 14/09) : ~150 aliments courants (viandes, poissons, légumes, fruits...) avec leurs valeurs pour 100 g, interrogée en complément d'Open Food Facts pour que la recherche fonctionne aussi sur les aliments bruts (voir section 3).

## 5. Pages de l'app

1. **Accueil / Dashboard** (`/accueil`, page d'arrivée après connexion ou onboarding) — salutation personnalisée + boutons "Logger une séance"/"Ajouter un repas", flamme de streak avec record et récap des 7 derniers jours, résumé nutrition du jour avec lien vers le journal, dernière séance avec aperçu des exercices
2. **Calculateur** (`/`, reste à cette adresse pour le référencement) — formulaire + résultat (accessible sans compte pour attirer du trafic SEO)
3. **Calendrier** — vue mensuelle + formulaire de saisie de séance
4. **Journal alimentaire** — saisie et historique des repas du jour
5. **Carte du corps** — silhouette cliquable par muscle → cards d'exercices avec ajout direct à une séance/programme
6. **Programmes** — liste des programmes de l'utilisateur, avec pour chacun ses exercices et séries×répétitions visées ; possibilité de retirer un exercice ou supprimer un programme ; bouton "Lancer une séance" qui pré-remplit une nouvelle séance avec les valeurs du programme (à corriger avec ce qui a été réellement fait)
7. **Progression** (V2) — graphiques
8. **Profil / Réglages** — infos utilisateur, objectif, unités
9. **Feedback / Signaler un bug** — formulaire de suggestion et de bug report (en pied de page ou page dédiée)
10. **Classement** — top 100 des utilisateurs rang GOAT, avec pseudo, palier, score et streak affichés. Le propre classement de l'utilisateur s'affiche en haut de la page ("Non classé" si aucun rang calculé). Bouton "Tous les classements" : ouvre, avec une animation, la liste des 8 rangs (Rookie → GOAT) avec le badge de chaque rang.
11. **Rang** (`/rang`, nouvelle page) — rang actuel avec barre de progression vers le palier suivant, section "Récap" (points par exercice), quêtes du jour et de la semaine
12. **Profil** — infos utilisateur, photo, bio, séances récentes (visibilité réglable), courbes de poids/charges (privées), liens vers les autres pages (dont Rang et, pour un admin, Administration), déconnexion
13. **Paramètres** (à développer plus tard) — position de la navigation, visibilité du profil, unités, et autres réglages à venir
14. **Admin** (`/admin`, réservée au rôle admin) — accès à l'ensemble des réglages/paramètres qu'un admin doit pouvoir contrôler (détaillé au fur et à mesure des besoins réels) : à ce jour, statistiques d'usage, vue de tous les utilisateurs, modification manuelle du rang, lecture des feedbacks reçus

**Navigation** : 5 onglets — Accueil, Séances, Exercices, Journal, Profil. Position par défaut en haut, réglable par l'utilisateur (bas/gauche/droite) une fois la page Paramètres construite ; le layout et les animations du site s'adaptent à la position choisie. Le logo renvoie au dashboard une fois connecté. Le calculateur reste accessible à la racine (`/`) pour ne pas perdre son bénéfice SEO, avec des liens depuis le Profil et le Journal. Les programmes sont rangés sous l'onglet Exercices plutôt que d'avoir leur propre onglet.

## 6. Stack technique recommandée

- **Frontend web** : React
- **Backend** : Node.js/Express pour l'API (partagée entre le site et l'app mobile)
- **Base de données** : MySQL
- **Authentification** : JWT simple ou solution type Supabase Auth (implémenté : sessions en base + cookie httpOnly, voir README)
- **Hébergement** : Vercel (frontend) + un hébergeur Node/MySQL (Railway, Render, ou VPS)
- **App mobile** (phase ultérieure) : React Native, pour réutiliser un maximum de logique métier avec le frontend web et cibler App Store + Google Play sans repartir de zéro

## 7. Design

- Direction : sobre et pro, pas "gamer flashy" en dehors des badges de rang — inspire confiance et donne envie de revenir tous les jours
- **Palette confirmée (v4)** : fond **sombre/quasi-noir** (retour en arrière sur le blanc/gris clair de la v3), avec le **vert du logo conservé comme accent** (haltère combiné à un graphique ascendant) — utilisé pour les CTA, les liens actifs et les indicateurs de progression
- Priorité mobile-first : la plupart des utilisateurs rempliront leur séance depuis la salle, sur leur téléphone
- **Navigation** : composant **PillNav** (React Bits) conservé — pilule flottante, logo intégré à gauche dans un cercle, liens en pilules avec animation de survol, menu burger sur mobile. Couleurs adaptées à la v4 : `baseColor` sombre, `pillColor` et accents en vert. Position par défaut en haut, réglable par l'utilisateur (bas/gauche/droite, page Paramètres à venir).
- **Page d'accueil publique (landing/hero)** : structure façon "Sparkdesign" — badge en pilule au-dessus du titre, titre en 2 lignes, paragraphe d'accroche, CTA "Commencer" vers l'onboarding, rangée d'avatars empilés + phrase courte, et à droite une carte flottante d'aperçu de l'app (2 étiquettes en pilule dans les coins, bulle d'annotation flottante, 2 icônes rondes en bas à droite). Voir « Composants visuels » et README pour le détail de l'implémentation.
- **Logo** : fourni par l'utilisateur (haltère/bibliothèque de barres ascendantes, vert sur fond sombre) — recréé en SVG (`frontend/public/logo.svg`) à partir de l'image envoyée, pas de fichier source vectoriel fourni.
- **Badges de rang** : 6 images de référence envoyées (rendus 3D façon cristal à facettes avec glow, une couleur par rang). Reçues en pièces jointes du chat, pas comme fichiers exploitables — `BadgeRang.jsx` reste un SVG procédural (recolorable par rang sans dupliquer un asset), mais enrichi d'une aura à 6 pointes derrière la gemme, d'un halo à deux couches et d'éclats supplémentaires pour se rapprocher de la direction donnée. Voir README.
- **Couleur d'accent réglable par l'utilisateur** (demandé le 14/09) : sélecteur sur `/profil` (vert/bleu/rouge/violet) qui change les boutons, les liens, la pilule de navigation et le glow du fond animé — voir « Thème de couleur » ci-dessous et README. Ne touche ni `--fond`/`--surface` (le vrai fond quasi-noir) ni les couleurs de données (courbes, macros), qui restent fixes et validées par le skill dataviz.

### Thème de couleur (retour du 14/09)

Demande : « une option qui permet de changer la couleur de fond et de la nav bar ». Interprété comme un changement de la **teinte d'accent** (celle qui se voit aujourd'hui en vert sur les boutons/la nav/le glow du fond animé), pas du vrai fond quasi-noir (`--fond`/`--surface`) : la direction « sobre et pro » du cahier et le travail de validation du dark mode (dataviz skill) tiendraient mal avec un fond entièrement rouge/bleu/violet, et les couleurs de données (courbes, macros) doivent rester fixes indépendamment de ce choix cosmétique. 4 couleurs au choix (vert/bleu/rouge/violet, `frontend/src/lib/theme.js`), réglage sur `/profil`, stocké en `localStorage` (purement cosmétique, pas de compte requis, pas de synchronisation entre appareils pour l'instant).

### Retours après premier rendu du hero (v4)

1. Fond animé (GhostFibers) validé — généralisé à **tout le site** (`App.jsx`, une seule instance fixed derrière tout) plutôt que gardé propre à la page d'accueil.
2. Bug corrigé : le contenu restait cantonné à 640px même en grand écran (le hero n'était donc jamais vraiment sur 2 colonnes à l'affichage, malgré le CSS grid déjà en place). `.conteneur` s'élargit maintenant sur les écrans larges (900px puis 1200px) ; le tableau de bord passe en grille 2 colonnes ; les pages qui doivent rester étroites (calculateur, connexion, onboarding, classement, formulaire de séance) gardent leur largeur d'origine pour ne pas s'étirer bêtement — le profil, lui, est depuis passé en 2 colonnes également (voir section 3).
3. Gaps ajoutés entre les cards du tableau de bord (grille 2 colonnes, 20px) là où elles se touchaient.
4. Bug corrigé (retour du 13/09) : le fond animé ne s'affichait qu'en bas de page — en réalité `body` peignait un fond opaque par-dessus le canvas fixed du fond animé sur tout le reste du contenu ; voir section 10 pour le détail.

### Historique de la direction couleur

- v1 : fond sombre, accent orange ou vert non tranché
- v2 : fond bleu marine + vert lime repris du logo
- v3 : fond blanc/gris clair + vert du logo en accent, nav pilule flottante pour le contraste (implémentation « maison » façon creativeans.com, puis remplacée par le composant nommé PillNav)
- v4 (actuelle) : retour à un fond sombre/quasi-noir + vert du logo en accent — annule le blanc/gris clair de la v3 (qui elle-même remplaçait le bleu marine de la v2). Toutes les couleurs catégorielles (macros, courbes) ont été revalidées pour ce fond sombre avec le script du skill dataviz plutôt que de réutiliser telles quelles les valeurs light de la v3 (une couleur validée pour un fond clair n'est pas garantie de l'être pour un fond sombre, et inversement) — seul `--accent` (le vert du logo, `#4a9420`) s'est trouvé passer les deux modes sans changer.

### Composants visuels (React Bits)

- **TextLoop** : texte "REPWISE" en boucle en fond de la page d'accueil (hero), façon bandeau animé. Couleurs adaptées à la palette v4 (texte clair, fond sombre — plus besoin du ruban pâle de la v3, le composant est utilisé sans ruban, en texture de fond très discrète).
- **GhostFibers** : effet de fond animé, utilisé en décor sur le hero. Le mode par défaut du composant (pensé pour fond sombre) convient directement à la v4 — `lightMode` retiré. `lineColor`/`glowColor` sur des tons verts.
- **PillNav** : voir « Navigation » ci-dessus, en version sombre/verte.
- **GradualBlur** : flou de bord en haut et en bas de la page (`target: "page"`), intensité modérée (`strength` réduite par rapport aux presets par défaut pour rester discret).
- **DotGrid** : grille de points réagissant au curseur, en fond du dashboard (`/accueil`) ; `baseColor`/`activeColor` sur des tons vert sombre/vert accent, cohérents avec le fond sombre de la v4. Pas ajoutée en plus sur le hero public (déjà occupé par GhostFibers + TextLoop) — cahier disait "et/ou", le "ou" a été retenu là.
- **Speeding Text** (React Bits Pro — nécessite une clé de licence personnelle `REACTBITS_LICENSE_KEY`) : **pas encore fait**, bloqué en l'absence de cette clé (voir README, section Design) — confirmé par l'utilisateur le 13/09 : "on verra plus tard". À appliquer sur les stats du dashboard et les chiffres clés de la page d'accueil publique une fois la clé fournie.
- **Point ouvert résolu** : « page d'accueil » ici comprise comme la page publique `/` (Calculateur, porte d'entrée SEO — voir section 5), pas le dashboard `/accueil` réservé aux comptes connectés ; c'est la seule page vraiment publique où un hero animé a du sens.
- **Point ouvert résolu (landing)** : sans capture d'écran de référence ("Sparkdesign") ni vrais utilisateurs à afficher, la rangée d'avatars et la carte d'aperçu de l'app ont été construites comme des éléments **génériques/stylisés** (silhouettes anonymes, mini-mockup du dashboard) plutôt que de fabriquer de faux témoignages, un faux nombre d'utilisateurs ou une fausse capture d'écran — cf. règle contre les faux signaux sociaux. Le badge au-dessus du titre reprend un fait déjà vrai du cahier ("100% gratuit au lancement", section 8) plutôt qu'une accroche inventée.

## 8. Monétisation

- Phase 1 (lancement) : app 100% gratuite pour construire une base d'utilisateurs et du bouche-à-oreille
- Phase 2 (**en cours de lancement**) : publicité display (Google AdSense) sur les pages à fort trafic (calculateur en accès libre) — **compte AdSense à créer (pas encore fait)**, plus une bannière de consentement cookies (obligatoire en France pour la pub Google). Blocage externe : la création du compte AdSense est une démarche propre à l'utilisateur (identité, site déjà en ligne, validation Google) — aucune action côté code n'est possible tant qu'il n'existe pas ; le code de la bannière de consentement et l'intégration des emplacements publicitaires pourront être préparés dès que le compte existe.
- Phase 3 : version premium sans pub + fonctions avancées, et/ou affiliation ciblée (compléments, matériel) intégrée intelligemment selon le profil de l'utilisateur — **nécessite un compte Stripe**

## 9. Roadmap de build (ordre à suivre avec Claude Code)

1. Poser le schéma de base de données et le valider
2. Construire le calculateur de calories (page autonome, sans backend) — premier livrable rapide et démontrable
3. Mettre en place l'authentification utilisateur
4. Construire le calendrier + formulaire de saisie de séance, branché au backend
5. Construire le journal alimentaire
6. Construire le dashboard qui agrège tout (calories du jour, dernière séance, streak avec jour de repos toléré)
7. Construire la carte du corps interactive (SVG cliquable + bibliothèque d'exercices en base) — fait, avec page Programmes en plus
8. Construire la page feedback/bug (simple formulaire, sans compte requis) — fait, pas encore d'écran pour lire les messages reçus côté admin
9. Ajouter les recommandations et graphiques (V2) — fait : page Progression, rappel de dernière perf + suggestion de charge, partage de séance, widget "à travailler"
10. Calculer et afficher le système de rang (8 rangs x 3 paliers, badges style gemme/cristal) — fait
11. Construire la page Classement (top 100 GOAT) — fait
12. Brancher la monétisation (V3) — en attente des comptes AdSense/Stripe et de l'audience
13. Décliner l'app en mobile (React Native) une fois le web stable et l'API mature — publication gratuite sur App Store et Google Play

**Prochaine étape immédiate : la mise en ligne** — acheter repwise.fr ou getrepwise.app, héberger l'API et la base de données, déployer le site sur Vercel.

## 9bis. Refonte post-premier-test (à traiter avant la mise en ligne)

Retours après le premier test utilisateur complet du site :
1. Onboarding en 4 étapes avec barre de progression (voir section 2) — fait
2. Refonte design : palette blanc/gris + vert accent, nav bar en pilule flottante façon creativeans.com (voir section 7) — fait
3. Enrichissement de la page Profil : photo, bio, séances récentes à visibilité réglable, courbes privées (voir section 3 et 5) — fait
4. Carte du corps : liste d'exercices en panneau latéral sur desktop plutôt qu'en dessous (voir section 3) — fait
5. Navigation repositionnable par l'utilisateur, avec adaptation du layout (voir section 7) — position par défaut passée en haut et layout adaptatif faits ; le réglage utilisateur lui-même attend la page Paramètres (point 6)
6. Page Paramètres à créer, ne serait-ce que pour héberger ces réglages (dev prévu plus tard) — pas encore fait

## 10. Petits manques identifiés (à traiter à l'occasion)

- Pas de réglage des unités : tout est en kg pour l'instant
- Page Paramètres pas encore construite (position de la navigation, visibilité, unités)
- Le profil public (photo/bio/séances visibles) n'existe aujourd'hui que pour les utilisateurs au rang GOAT (via le classement) — l'étendre à tout compte serait un bon prochain pas
- Composant **Speeding Text** (React Bits Pro, section 7) pas encore installé : attend `REACTBITS_LICENSE_KEY` (clé de licence personnelle)
- Aucun compte admin n'existe encore : le premier doit être promu à la main en base (voir README) avant que la page `/admin` serve à quelque chose

### Points non résolus après retours du 13/09 (traités le 14/09)

1. **Images d'exercices toujours pas affichées** — résolu : plutôt que de continuer à attendre des visuels fournis par l'utilisateur, intégration de [wger.de](https://wger.de) (projet open source de suivi de musculation, API publique sans clé) comme source légale de photos d'exercices. 56 des 68 exercices de la bibliothèque ont pu être associés à une image wger.de sémantiquement proche (les 12 restants gardent le repli générique, faute d'équivalent) — voir `database/bibliotheque-images.sql` (rejouable, par nom d'exercice) et `backend/uploads/exercices/`. Chaque image est sous licence Creative Commons (CC BY-SA/CC0/CC BY selon les cas) : l'attribution exigée par ces licences est affichée sur une nouvelle page **`/credits`** (lien en pied de page), détaillant auteur/licence/source par exercice.
2. **Fond animé (GhostFibers) qui ne s'affichait qu'en bas de page** — résolu : ce n'était pas un réglage du composant (vignette/luminosité) mais un bug CSS — `body` posait un fond opaque (`background: var(--fond)`) qui, n'étant pas positionné, se peignait par-dessus le canvas `position:fixed; z-index négatif` du fond animé dans le contexte d'empilement racine ; le fond animé n'était donc visible que dans l'espace laissé vide sous le contenu réel de `body`. Corrigé en retirant ce `background` de `body` (le fond vient déjà de `:root`) — voir le commentaire dans `frontend/src/styles.css` et README.

## 11. Notes de lancement

- Le calculateur en accès libre est aussi ton meilleur outil SEO : optimise sa page pour des recherches type "calculateur calories musculation", "combien de calories pour prise de masse"
- Utilise ta chaîne TikTok existante pour driver les premiers utilisateurs vers l'app dès le MVP en ligne
- À faire avant le lancement : relire `database/bibliotheque.sql` (68 exercices, ordre de recommandation par niveau) — c'est Claude Code qui les a choisis, à valider ou corriger avec ta propre expérience
- **Audit pré-lancement du 14/09** (voir README « Checklist avant mise en ligne » pour le détail) :
  code et sécurité déjà solides (mots de passe, sessions, requêtes SQL, rate-limiting — rien à
  corriger), deux bugs réels trouvés et corrigés (`.gitignore` qui aurait fait disparaître les
  images d'exercices au déploiement, `robots.txt` manquant).
- **Préparation au déploiement, même jour, suite à "fait toutes les étapes pour poster le site"** :
  dépôt git initialisé (premier commit), `frontend/vercel.json` écrit, réinitialisation de mot de
  passe codée de bout en bout (email via Resend, `RESEND_API_KEY` à ajouter), pages
  `/mentions-legales` et `/confidentialite` créées (contenu réel, placeholders entre crochets pour
  ce que je ne peux pas deviner), et `DEPLOY.md` détaillant la marche à suivre pour tout le reste.
  Restent, tous nécessitant un compte/paiement que je ne peux pas faire à ta place : pousser le
  dépôt sur GitHub, créer les comptes Railway (API + MySQL)/Vercel (frontend)/Resend (email),
  acheter le domaine, remplir les placeholders des pages légales avec tes vraies informations.
