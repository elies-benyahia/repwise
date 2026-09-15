# Repwise

App web de suivi musculation : calculateur de calories/macros, calendrier de séances,
journal alimentaire, carte du corps. Cahier des charges complet : [docs/cahier-des-charges.md](docs/cahier-des-charges.md).

## Structure

```
database/schema.sql   Schéma MySQL 8 (tables uniquement, idempotent)
backend/              API Node.js + Express 5
frontend/             React + Vite
```

## Lancer en local

Prérequis : Node 24, MySQL démarré (Laragon → « Démarrer tout »).

```bash
# 1. API (terminal 1)
cd backend
npm install
cp .env.example .env    # valeurs par défaut = MySQL Laragon (root sans mot de passe)
npm run db:init         # crée la base repwise et les tables
npm run dev             # http://localhost:3000

# 2. Site (terminal 2)
cd frontend
npm install
npm run dev             # http://localhost:5173 — /api est redirigé vers l'API
```

`npm run db:reset` (backend) supprime et recrée la base à vide : à utiliser après une
modification de schema.sql tant qu'il n'y a pas de vraies données (ensuite, il faudra des migrations).

## Tests

```bash
cd backend && npm test    # 86 tests : API complète, streak, rang, recommandations, photo — une base repwise_test_* par fichier
cd frontend && npm test   # 37 tests : calculateur, dates, séance, journal, carte du corps, progression, onboarding
```

## Séances (calendrier)

- `/calendrier?mois=AAAA-MM&jour=AAAA-MM-JJ` : grille lundi → dimanche, étiquette du type de
  séance dans chaque case, panneau du jour sélectionné. Plusieurs séances par jour possibles.
- `/seance/nouvelle?date=…` et `/seance/:id` : formulaire complet (type, exercices, séries
  reps × poids, repos par exercice, notes). « + Série » recopie la série précédente ; poids vide
  = poids du corps ; les exercices et séries laissés vides sont ignorés ; pas de séance future.

API (session requise, un utilisateur ne voit jamais les séances d'un autre — réponse 404) :

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/api/seances?debut=…&fin=…` | résumé pour le calendrier (100 jours max) |
| GET | `/api/seances/exercices-recents` | noms d'exercices déjà utilisés, pour l'autocomplétion |
| GET | `/api/seances/:id` | séance complète |
| POST | `/api/seances` | création (transaction : séance + exercices + séries) |
| PUT | `/api/seances/:id` | remplacement complet |
| DELETE | `/api/seances/:id` | suppression (exercices et séries en cascade) |

Le temps de repos est saisi par exercice et stocké sur chaque série (`series.temps_repos`).

## Journal alimentaire et objectif

- Calculateur : un utilisateur connecté (ou invité) peut « Enregistrer comme mon objectif »
  (`objectifs_caloriques` + sexe / activité / objectif sur son profil, qui pré-remplissent ensuite
  le calculateur). Un visiteur voit à la place « Suivre mes repas gratuitement » → onboarding →
  retour au calculateur.
- `/journal?date=AAAA-MM-JJ` (aujourd'hui par défaut, pas de jour futur) : total du jour vs
  objectif (calories + barres de macros), aliments groupés par repas, ajout rapide.
- Objectif affiché pour un jour donné : le dernier enregistré ce jour-là ou avant (le premier
  objectif s'applique aussi aux jours qui le précèdent).

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/api/aliments/recherche?q=` | bibliothèque locale (~150 aliments courants) + proxy Open Food Facts, fusionnés |
| GET | `/api/journal/:date` | aliments du jour + objectif en vigueur |
| GET | `/api/journal/aliments-recents` | 30 derniers aliments distincts, avec leurs valeurs |
| POST | `/api/journal` | ajouter un aliment |
| DELETE | `/api/journal/entrees/:id` | supprimer un aliment |
| POST | `/api/objectif` | enregistrer l'objectif issu du calculateur |

### Recherche d'aliment (bibliothèque locale + Open Food Facts)

Revenu sur la limite volontaire initiale (cahier §3, saisie manuelle) : `backend/src/alimentation/routes.js`
proxie `world.openfoodfacts.org/cgi/search.pl` (pas d'appel direct depuis le front — évite le CORS,
cache le `User-Agent` exigé par OFF, laisse la place à un futur cache sans toucher au front). Un
produit sans nom ni calories est filtré côté serveur (pas exploitable dans le journal).

**Autocomplétion, retour du 14/09** : « il manque l'autocomplétion pour les aliments ». Open Food
Facts est une base de produits **à code-barres** — pauvre sur les aliments bruts type "poulet" ou
"banane" (peu ou pas de résultats pertinents). Ajout de `bibliotheque_aliments`
(`database/aliments.sql`, rejouable par nom comme les autres bibliothèques) : ~150 aliments
courants classés en 12 catégories (viande, poisson, oeuf_laitier, legume, fruit,
feculent_cereale, legumineuse, matiere_grasse, sucrerie_dessert, snack_apero, boisson,
plat_prepare), avec calories/protéines/glucides/lipides/sucre pour 100 g — valeurs moyennes de
référence (type CIQUAL/USDA), pas la fiche exacte d'un produit précis comme Open Food Facts.

`GET /api/aliments/recherche` interroge maintenant les deux sources en parallèle
(`Promise.all`) : `bibliotheque_aliments` (`rechercherLocal`, instantané, `LIKE` sur le nom —
insensible à la casse/accents grâce à la collation `utf8mb4_unicode_ci` de la base) **et** Open
Food Facts (`rechercherOFF`). Les résultats sont fusionnés, la bibliothèque locale en premier,
dédoublonnés par nom (insensible à la casse). Différence de robustesse assumée entre les deux :
`rechercherLocal` doit remonter une vraie erreur si la base est en panne (ça n'arrive jamais en
usage normal), alors que `rechercherOFF` se replie silencieusement sur un tableau vide en cas
d'échec/timeout — Open Food Facts est une source complémentaire, sa lenteur ou son
indisponibilité ne doit jamais empêcher d'afficher au moins les résultats locaux. Conséquence :
la route ne renvoie plus jamais 502, seulement 400 (terme trop court) ou 401 (pas de session).

Côté `/journal` (`RechercheAliment` dans `Journal.jsx`) : recherche avec un debounce de 350 ms,
liste de résultats (image + nom + kcal/100g), un clic ouvre un panneau de sélection (repas,
quantité en grammes, aperçu live des macros mis à l'échelle via `lib/journal.js#alimentEchelle`),
« Ajouter » envoie le corps déjà mis à l'échelle à `POST /journal` — `entrees_alimentaires` stocke
les valeurs **pour la quantité choisie**, pas un pour-100g à recalculer à chaque lecture. Un
« récent » se ré-ajoute directement à sa quantité d'origine (clic simple) ; clic droit dessus
reconstruit un pour-100g approximatif (`versAlimentDepuisEntree`, règle de trois depuis les
valeurs déjà enregistrées) pour ajuster la quantité avant de rejouer l'ajout.

Pas de fallback de saisie manuelle : un plat maison absent d'Open Food Facts n'est, pour
l'instant, pas ajoutable au journal — écart assumé, cohérent avec la demande explicite du cahier
de « rechercher/sélectionner dans cette base plutôt que saisir manuellement ».

## Carte du corps, bibliothèque et programmes

- `database/bibliotheque.sql` : 68 exercices sur les 14 groupes musculaires (nom, muscle principal,
  niveau, description, `priorite` = ordre de recommandation). Rejoué par `db:init` (mise à jour par nom).
- Image/vidéo de démonstration (cahier §3/§10) : la colonne `image_ou_gif` est servie par l'API
  (`imageUrl` dans la réponse). Renseignée pour **56 des 68 exercices** via
  [wger.de](https://wger.de) (projet open source de suivi de musculation, API publique sans clé
  requise) : images téléchargées dans `backend/uploads/exercices/` (miniatures `thumbnails.medium`
  de l'API — les originaux font jusqu'à plusieurs Mo, bien trop lourds), appliquées par
  `database/bibliotheque-images.sql` (rejouable, `UPDATE ... JOIN` par **nom** d'exercice comme
  `bibliotheque-rang.sql`, exécuté après lui par `npm run db:init`). Chaque image est sous licence
  Creative Commons (CC BY-SA 3.0/4.0, CC0 ou CC BY 4.0 selon l'auteur) : l'attribution qu'exige
  chaque licence est affichée sur `/credits` (lien en pied de page), générée dans
  `frontend/src/lib/credits.js` — à régénérer à la main si `bibliotheque-images.sql` change (pas de
  lien automatique entre les deux pour l'instant). Les 12 exercices sans correspondance suffisamment
  proche chez wger.de (ex. Farmer walk, Superman, Hack squat...) gardent le repli générique (icône
  haltère) affiché par `CarteExerciceBibliotheque` quand `image_ou_gif` est vide ; renseigner la
  colonne en base suffit à faire apparaître une vraie image, aucun changement de code nécessaire.
- `/exercices?vue=avant|arriere&muscle=…` : silhouette SVG face / dos (frontend/src/lib/muscles.js,
  tracés d'une demi-silhouette dupliqués en miroir), zones cliquables au doigt et au clavier, plus
  des puces pour les petites zones. Les exercices à la portée du niveau déclaré passent en premier,
  les plus avancés sont signalés.
- « Ajouter à ma séance » : ouvre la séance du jour (la plus récente) avec l'exercice ajouté en fin,
  ou une nouvelle séance datée d'aujourd'hui (`?exercice=Nom`, consommé puis retiré de l'URL).
- « Ajouter à mon programme » : programme existant ou nouveau, avec séries × répétitions cibles.
- `/programmes`, `/programmes/:id` : liste, détail, retrait d'exercice, suppression, et « Lancer
  une séance » (`/seance/nouvelle?programme=id`, séries et répétitions cibles pré-remplies).
- Les exercices de séance sont reliés automatiquement à la bibliothèque quand leur nom correspond
  (casse et accents ignorés) → `exercices_effectues.exercice_id`, utile aux graphiques et au rang.
  L'autocomplétion du formulaire de séance propose les exercices récents puis la bibliothèque.

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/api/exercices[?groupe=…]` | bibliothèque (publique) |
| GET / POST | `/api/programmes` | liste / création |
| GET / DELETE | `/api/programmes/:id` | détail / suppression |
| POST | `/api/programmes/:id/exercices` | ajout d'un exercice de la bibliothèque (en fin) |
| DELETE | `/api/programmes/:id/exercices/:ligne` | retrait |

## Dashboard

`/accueil` (page d'arrivée après connexion, logo de l'en-tête, premier onglet) : actions rapides
(logger une séance, ajouter un repas), régularité (flamme de streak, record, points de la
semaine), nutrition du jour (même résumé que le journal), dernière séance.

Récap des **7 derniers jours** (aujourd'hui compris), carte du rang, et « À travailler ».

`GET /api/tableau-de-bord?aujourdhui=AAAA-MM-JJ` renvoie tout en un appel. Le jour vient du
navigateur, car c'est le jour local de l'utilisateur qui compte (le serveur est en UTC).

Streak (backend/src/tableau-de-bord/streak.js) : jours d'entraînement d'affilée, recalculés depuis
les dates de séance. `JOURS_DE_REPOS_TOLERES = 1` : un jour de repos entre deux séances ne casse
pas la série, deux oui (mettre 0 pour un reset strict). La flamme reste allumée pendant le jour
de repos toléré.

## Onboarding et mode invité

**Refonte post-premier-test** (trop d'infos demandées d'un coup) : un seul assistant en 4 étapes
avec barre de progression, tout dans `/bienvenue` (`Bienvenue.jsx`) — plus de page séparée pour
le profil. Les 3 premières étapes sont locales (aucun appel réseau, donc consultables sans
compte) ; la 4e propose de créer un compte pour ne rien perdre.

1. **Ton profil** : pseudo, date de naissance (`<input type="date">`), sexe (ajout non prévu par
   le cahier des charges mais requis par Mifflin-St Jeor pour l'étape 3), poids et taille via
   une **roue de sélection** (`RouePicker.jsx`, défilement à encoches + saisie manuelle
   chiffres-only en complément, les deux se synchronisent).
2. **Fréquence et objectif** : séances/semaine (0 à 7+) et un objectif parmi 6, plus parlants que
   les 4 du calculateur (prise de masse, perte de poids, prise de muscle, perte de poids et
   stabilisation, cardio/marathon, pratique libre). Mappés vers les 4 catégories du calculateur
   et vers un niveau d'activité (`backend/src/utilisateurs/niveaux.js`, dupliqué côté front pour
   l'aperçu immédiat — le serveur revalide tout).
3. **Ton programme sur 1 mois** : `calculerBesoins(...)` appliqué immédiatement (même composant
   `ResultatMacros` que le calculateur), présenté avec une fenêtre de validité (aujourd'hui →
   +30 jours) plutôt qu'un chiffre brut.
4. **Sauvegarder** : compte (email/mot de passe, formulaire intégré à l'étape) ou invité, avec un
   avertissement explicite sur la perte de données en mode invité. Un utilisateur déjà connecté
   (session invité existante, ou compte incomplet) saute directement sur un bouton « Terminer ».

Un **invité** est un vrai utilisateur (`est_invite = TRUE`) sans email ni mot de passe, avec une
session cookie comme les autres : toutes les fonctionnalités marchent pareil. Quand il crée un
compte, la même ligne est complétée, donc tout son historique est conservé. Les invités sans
session valide (30 jours sans visite, ou connexion à un autre compte) sont supprimés
automatiquement par l'API une fois par jour.

Niveau déclaré, déduit de la fréquence (`niveauExperienceDepuisFrequence`, résout le point ouvert
de l'ancien cahier des charges) : Débutant (≤ 2 séances/semaine), Intermédiaire (3-4),
Confirmé (5+). Reste modifiable sur `/profil`. À ne pas confondre avec le rang calculé
(V2, Rookie → GOAT).

Après l'onboarding ou la connexion, l'utilisateur arrive sur le dashboard `/accueil`
(`ACCUEIL_CONNECTE`, frontend/src/navigation.js).

`pseudo` et `date_naissance` (colonnes) remplacent les anciens `prenom`/`annee_naissance` — le
pseudo est ce qui s'affiche partout, y compris dans le classement public (pas de vrai prénom).

## Authentification

Session en base + cookie `httpOnly` (pas de JWT dans le navigateur) :

- mots de passe hachés avec scrypt (intégré à Node, paramètres OWASP) ;
- jeton de session aléatoire dans un cookie `HttpOnly; SameSite=Lax` (`Secure` en production),
  seule son empreinte SHA-256 est stockée dans `sessions` ;
- sessions de 30 jours, prolongées automatiquement à l'usage, révoquées à la déconnexion,
  nouveau jeton quand un invité crée son compte ;
- limitation par IP : 10 échecs de connexion / 15 min, 10 inscriptions / h, 20 sessions invité / h.

Pour protéger une route : `routeur.get('/…', exigerConnexion, …)` puis `req.utilisateur`.

**Réinitialisation de mot de passe** (14/09) : `POST /api/auth/mot-de-passe-oublie` (email → même
réponse que le compte existe ou non, pas d'énumération) génère un jeton à usage unique (même
principe que les sessions : empreinte SHA-256 en base, table `reinitialisations_mot_de_passe`,
expire en 1h) et envoie un lien par email via `backend/src/email/envoyer.js` (API REST de Resend,
`RESEND_API_KEY` — sans elle, le lien est juste loggé côté serveur). `POST
/api/auth/reinitialiser-mot-de-passe` (jeton + nouveau mot de passe) vérifie le jeton, change le
hachage, **révoque toutes les sessions ouvertes** de ce compte (vol de session éventuel). Pages
`/mot-de-passe-oublie` et `/reinitialiser-mot-de-passe`, lien depuis `/connexion`.

App mobile (plus tard) : le même jeton pourra être envoyé en `Authorization: Bearer` au lieu du
cookie — il suffira de le lire aussi dans `chargerSession`.

## Déploiement

**En ligne depuis le 14/09** : frontend sur Vercel, API sur Render, MySQL sur Aiven (tous gratuits
pour l'instant) — état à jour, URLs et ce qu'il reste (email transactionnel, domaine, pages
légales) dans **[DEPLOY.md](DEPLOY.md)** à la racine du dépôt.

Le site et l'API sont servis **sur le même domaine apparent** pour que le cookie de session reste
first-party (Safari bloque les cookies tiers) : `frontend/vercel.json` fait un rewrite `/api/*` +
`/uploads/*` vers l'URL Render — vérifié en production (inscription/connexion/cookie de session
testés à travers Vercel → Render → Aiven, tout fonctionne).

Domaine définitif : repwise.fr (registrar .fr, Vercel ne les vend pas) ou getrepwise.app — libres
au 12/09/2026, pas encore acheté.

## Monétisation (AdSense)

Cahier §8 phase 2 : compte Google AdSense créé par l'utilisateur le 14/09
(`ca-pub-9846502233003678`). Décisions techniques (pas précisées dans le cahier) :

- **Scope limité au calculateur** (`/`, page publique à fort trafic visée par le cahier) plutôt
  qu'au site entier : chargé/déclenché uniquement dans `Calculateur.jsx`, jamais sur les pages où
  l'utilisateur suit ses séances — annonces qui financent le site sans polluer l'usage quotidien
  de l'app pour un compte connecté.
- **Auto ads** (juste le tag `<script>` du compte, `frontend/src/lib/adsense.js`) plutôt que des
  emplacements `<ins>` fixes : le cahier ne fournissait pas d'identifiant d'unité publicitaire
  précis (`data-ad-slot`), et Auto ads est l'intégration standard actuelle de Google (il choisit
  lui-même où placer les annonces sur la page). Le script est injecté dynamiquement en JS
  (`document.createElement('script')`), pas statiquement dans `index.html` — sinon il se
  chargerait sur toutes les pages, contredisant le scope ci-dessus.
- **Bannière de consentement RGPD** (`BandeauConsentement.jsx`, obligatoire en France pour la pub
  Google, cahier §8) : affichée site-wide (pas juste sur le calculateur, pour prévenir avant que
  l'utilisateur y arrive) tant qu'aucun choix n'est enregistré. Le script AdSense n'est **jamais**
  chargé avant un clic sur « Accepter » — aucun cookie publicitaire n'est donc posé par défaut.
  Choix stocké en `localStorage` (`frontend/src/lib/consentement.js`, `ConsentementPubContext.jsx`
  — même patron que le thème de couleur), pas en base : purement un réglage client, marche pour
  les invités, aucune notion de compte.
- **Limite assumée** : c'est un bandeau maison (accepter/refuser), pas une plateforme de gestion du
  consentement certifiée IAB TCF. Suffisant pour le RGPD (consentement explicite avant tout dépôt
  de cookie publicitaire), mais Google recommande pour l'EEE d'utiliser en plus son propre outil
  « Privacy & messaging » (Funding Choices) dans le dashboard AdSense — pas fait, nécessite une
  configuration côté compte AdSense de l'utilisateur, pas quelque chose que le code peut résoudre.
- `/confidentialite` documente précisément ce que Google peut recevoir si l'utilisateur accepte
  (voir la page).

## Avancement (roadmap §9)

- [x] 1. Schéma de base de données (inclut bibliothèque, feedback, programmes, rangs)
- [x] 2. Calculateur de calories/macros
- [x] 3. Authentification + onboarding (compte ou invité, profil)
- [x] 4. Calendrier + saisie de séance
- [x] 5. Journal alimentaire
- [x] 6. Dashboard (inclut déjà la flamme de streak prévue à l'étape 10)
- [x] 7. Carte du corps interactive (+ bibliothèque de 68 exercices et programmes)
- [x] 8. Page feedback / bug
- [x] 9. Recommandations et graphiques (+ page Profil, partage de séance)
- [x] 10. Système de rang (8 × 3 paliers, badges gemme) — la flamme était déjà faite à l'étape 6
- [x] 11. Classement top 100 GOAT
- [x] 9bis. Refonte post-premier-test : onboarding 4 étapes, carte du corps en panneau desktop,
  Profil enrichi (photo/bio/visibilité, puis 2 colonnes en desktop), refonte design v3 (palette
  claire puis composants React Bits + Classement enrichi), **v4** (fond sombre, nav PillNav
  recolorée, landing façon Sparkdesign, fond animé généralisé + largeur desktop corrigée, puis
  bug du fond animé « visible qu'en bas de page » corrigé), puis journal branché sur Open Food
  Facts, quêtes/points + page Rang, rôle admin + page Admin (statistiques d'usage), images
  d'exercices via wger.de + page `/credits`, badges de rang retravaillés, thème de couleur
  réglable (vert/bleu/rouge/violet) sur `/profil`, bibliothèque de ~150 aliments courants pour une
  vraie autocomplétion (Open Food Facts seul étant pauvre sur les aliments bruts), mot de passe
  oublié, pages légales, et **mise en ligne** (Vercel + Render + Aiven, voir DEPLOY.md)
- [x] 12. Monétisation (V3), phase 2 — Google AdSense sur le calculateur + bannière de consentement
  RGPD (voir « Monétisation (AdSense) » plus bas). Phase 3 (premium/affiliation) attend Stripe.
- [ ] 13. App mobile React Native — une fois le web en ligne et stabilisé

### Checklist avant mise en ligne (audit du 14/09)

Revue faite avant le lancement : tests (100 backend + 39 frontend, tous verts), code (auth,
sessions, requêtes SQL, CORS/cookies, gestion d'erreurs), et un passage en direct sur les 16 pages
de l'app (connecté et non connecté) en écoutant la console et le réseau — **aucune erreur JS ni
requête en échec trouvée**. Le détail :

**Déjà solide, rien à corriger** : mots de passe (`scrypt`, paramètres OWASP, comparaison à temps
constant, délai constant même sur un email inconnu — pas d'énumération de comptes), sessions
(jeton en cookie `httpOnly`/`sameSite=lax`/`secure` en prod, seule une empreinte SHA-256 est
stockée en base), rate-limiting sur connexion/inscription/invité, `helmet()`, toutes les requêtes
SQL paramétrées (pas d'injection), pas de `dangerouslySetInnerHTML`/`eval`, aucun secret en dur
dans le code, IDOR testés (un utilisateur ne peut ni lire ni modifier les séances/aliments d'un
autre).

**Corrigé pendant l'audit (14/09)** :
- `.gitignore` excluait TOUT `backend/uploads/` (y compris `exercices/`, 56 images wger.de) —
  n'importe quel déploiement basé sur git aurait silencieusement perdu ces images. Corrigé pour
  n'exclure que `backend/uploads/avatars/` (contenu utilisateur, lui doit rester hors dépôt).
- `frontend/public/robots.txt` ajouté (`Allow: /`) — absent jusqu'ici, gênant pour le référencement
  du calculateur (cahier §11, "meilleur outil SEO").
- `.gitignore` excluait aussi `backend/.env.example` (le pattern `.env.*` matche aussi le modèle,
  pas seulement les vrais `.env`) — ce fichier documente toutes les variables requises en
  production (dont `DEPLOY.md` dépend) et ne contient aucun secret : `!.env.example` ajouté pour
  qu'il reste suivi.

**Fait dans la foulée (préparation puis mise en ligne, 14/09)** :
- **Dépôt git initialisé** et poussé sur GitHub (elies-benyahia/repwise) — restait à faire depuis
  le début du projet, bloquait tout déploiement.
- **Réinitialisation de mot de passe** codée de bout en bout : `POST /api/auth/mot-de-passe-oublie`
  + `POST /api/auth/reinitialiser-mot-de-passe` (jeton à usage unique, empreinte SHA-256 en base
  comme les sessions, expire en 1h, invalide toutes les sessions ouvertes au moment du changement),
  pages `/mot-de-passe-oublie` et `/reinitialiser-mot-de-passe`, lien depuis `/connexion`. Email
  envoyé via l'API REST de Resend (`backend/src/email/envoyer.js`) — reste à créer le compte
  Resend (voir DEPLOY.md) ; sans lui, le lien est juste loggé côté serveur au lieu d'être envoyé.
- **Pages `/mentions-legales` et `/confidentialite`** créées, déployées, liées en pied de page —
  contenu fidèle à ce que le code fait réellement, avec des **placeholders entre crochets** (ton
  identité, ton adresse) que je ne peux pas deviner à ta place.
- **Site en ligne** : API sur Render (`repwise-backend`, plan gratuit) connectée à une base MySQL
  Aiven (plan gratuit, schéma initialisé), frontend sur Vercel avec `frontend/vercel.json`
  pointant vers l'URL Render réelle. Configuré directement via les API REST de Render/Aiven et le
  CLI Vercel (comptes créés par l'utilisateur, connexions/tokens fournis en session) plutôt que
  par la main sur chaque dashboard. Testé en production de bout en bout : inscription, connexion,
  cookie de session first-party à travers le rewrite Vercel → Render. URLs et détail des comptes
  dans **[DEPLOY.md](DEPLOY.md)**.

**Reste (voir DEPLOY.md)** : compte Resend pour activer l'envoi réel des emails, achat du domaine
définitif, compléter les placeholders des pages légales. Le plan gratuit Render met l'API en veille
après inactivité (premier appel après une veille : ~30-50s pour redémarrer) — passer sur un plan
payant Render supprime ça si besoin.

### Restent à construire (notés dans le cahier des charges, non bloquants)

- Page **Paramètres** : position de la navigation, unités, visibilité du profil — le strict
  nécessaire technique existe déjà (`data-position`, `unite_poids`, `profil_public`), il manque
  l'écran.
- Un profil public accessible à *tout* compte, pas seulement aux GOAT (voir « Profil enrichi »).
- Images de démonstration pour les 12 exercices sans correspondance chez wger.de (voir « Carte du
  corps, bibliothèque et programmes ») — repli générique en attendant.
- Composant **Speeding Text** (React Bits Pro) : attend `REACTBITS_LICENSE_KEY`.
- Compte Google AdSense (Monétisation V3, étape 12 ci-dessus) : démarche propre à l'utilisateur,
  aucune action possible côté code tant qu'il n'existe pas.

### Décisions prises (modifiables)

- Streak : 1 jour de repos toléré (`JOURS_DE_REPOS_TOLERES`).
- Quêtes : 4 types fixes (3 quotidiennes + 1 hebdomadaire), points modestes convertis en bonus de
  score plafonné (~4 paliers max) — voir « Quêtes et points bonus ».
- Admin : premier compte promu à la main en base, correction de rang volontairement éphémère
  (écrasée par le prochain recalcul naturel) — voir « Rôle admin ».
- Rang : fenêtre de 6 semaines, repères de force par exercice, moyenne des meilleurs scores par
  groupe musculaire, score réduit sous 4 groupes (voir « Rang et classement »).
- Classement : comptes uniquement (pas les invités), seul le pseudo est affiché (jamais le prénom).
- 5e onglet : Profil (le calculateur reste à `/` et accessible depuis le Profil et le Journal).
- Niveau déclaré déduit de la fréquence de séances/semaine plutôt que redemandé (voir Onboarding).
- Palette : fond sombre/quasi-noir + vert du logo en accent (voir « Design »). Navigation en
  pilule flottante, en haut par défaut.
- En-tête : plus de bandeau pseudo + badge de rang permanent (existait dans la v2) ; cette
  information reste consultable sur `/profil` et le dashboard. La pilule de nav ne montre que le
  logo et les 5 onglets (+ menu burger sur mobile) — pas d'icône de profil séparée ni de CTA
  dédié (ceux-là avaient été ajoutés par moi lors de la refonte précédente, au-delà du cahier ;
  abandonnés une fois le composant PillNav explicitement nommé, qui n'a pas ce genre de slot —
  voir « Design »).

## Feedback

`/feedback` (public, lien en pied de page) : suggestion ou bug, description (10 à 2000
caractères), email facultatif. `POST /api/feedback`, sans compte requis, rattaché à l'utilisateur
si une session existe, limité à 10 envois / h par IP. Les retours se lisent maintenant sur
`/admin` (statut `nouveau` → `en_cours` → `traite`, modifiable depuis cette page) — voir « Rôle
admin » plus bas.

## Profil, progression et recommandations

- `/profil` (5e onglet) : prénom, âge, taille, poids, niveau ; liens vers progression, programmes,
  classement, calculateur et feedback ; sauvegarde du compte (invité) ou déconnexion.
- Chaque poids enregistré crée un relevé du jour dans `mesures_poids` (courbe de poids) et
  recalcule le rang.
- `/progression` : courbe du poids de corps et courbe par exercice (1RM estimé Epley de la
  meilleure série de chaque séance, ou répétitions max au poids du corps). Graphiques SVG maison
  (skill dataviz) : réticule + info-bulle au doigt / clavier, tableau des valeurs dépliable.
  Couleur des courbes `--donnees: #5aab27`, validée (script du skill dataviz) pour le fond sombre
  depuis la refonte v4.
- Formulaire de séance : sous chaque exercice, « Dernière fois » + suggestion de progression
  (`backend/src/recommandations/regles.js`) : toutes les séries passées à la même charge →
  +2,5 kg (+1 kg sous 20 kg, +1 répétition au poids du corps) ; sinon consolider. Bouton
  « Pré-remplir les séries ». Bouton « Partager » (Web Share, sinon presse-papiers ; sans les notes).
- Dashboard : « À travailler » = grands groupes non travaillés depuis 7 jours ou jamais.

| Méthode | Route | Rôle |
|---|---|---|
| POST | `/api/feedback` | envoyer un retour (public) |
| GET | `/api/profil/poids` | relevés de poids de corps |
| GET | `/api/progression/exercices` | exercices pratiqués, les plus fréquents d'abord |
| GET | `/api/progression/exercice?nom=` | un point par séance (1RM estimé, charge max, reps max) |
| GET | `/api/progression/derniere-fois?nom=&avant=` | dernière fois + suggestion |
| GET | `/api/rang` | rang recalculé (+ `scoreBrut`, `bonusPoints`, `parExercice` depuis les quêtes) |
| GET | `/api/classement` | top 100 GOAT (comptes) + mon rang + ma position + score d'entrée GOAT |
| GET | `/api/classement/:id` | profil public d'un joueur du classement (GOAT + compte uniquement) |
| GET | `/api/quetes` | les 3 quêtes du jour + la quête de la semaine, avec leur état |
| GET | `/api/admin/utilisateurs[?q=]` | liste des comptes + leur rang (admin) |
| PATCH | `/api/admin/utilisateurs/:id/rang` | correction manuelle du rang (admin, éphémère) |
| GET | `/api/admin/feedback[?statut=]` | tous les retours reçus (admin) |
| PATCH | `/api/admin/feedback/:id` | changer le statut d'un retour (admin) |

## Rang et classement

`backend/src/rang/calcul.js` (constantes réglables en tête de fichier) :

1. Fenêtre : séances des **6 dernières semaines** ; séries de 1 à 12 répétitions.
2. Pour chaque exercice ayant un **repère de force** (`database/bibliotheque-rang.sql`, 22 exercices :
   squat, développé couché, soulevé de terre, tractions…) : meilleur 1RM Epley / poids de corps /
   repère. Score 1 = niveau intermédiaire. Repères ×0,7 pour les femmes (si le sexe est connu).
   Tractions et dips : charge = poids de corps + lest.
3. Score global = moyenne des meilleurs scores **par groupe musculaire** (5 variantes de pecs ne
   pèsent pas 5 fois), multiplié par min(1, groupes / 4) : on ne devient pas GOAT avec des curls.
4. 24 niveaux de 0,09 point : intermédiaire ≈ Beast I, GOAT III à partir de 1,89.

Écart assumé au cahier des charges (« chaque exercice loggé ») : sans repère, un curl et un squat
ne sont pas comparables, donc seuls les exercices ayant un repère comptent. Ajouter un repère
dans `bibliotheque-rang.sql` suffit à en faire compter un nouveau.

Recalcul après chaque séance créée / modifiée / supprimée, changement de poids ou de sexe, à
l'ouverture du dashboard, et chaque nuit (performances sorties de la fenêtre).
`rangs_utilisateur` n'est qu'un cache pour trier le classement.

### Quêtes et points bonus

`backend/src/quetes/` : 3 quêtes quotidiennes (types fixes — cahier : « à définir avec Claude
Code ») + 1 hebdomadaire, matérialisées à la volée dans `quetes` au premier accès à `/api/quetes`
pour la période (pas de cron). Types retenus :

1. **Logger une séance aujourd'hui** (5 pts)
2. **Atteindre ton objectif calorique du jour**, ±15% (5 pts) — nécessite un objectif enregistré
3. **Travailler [un groupe musculaire]** qui tourne chaque jour sur les 14 groupes (5 pts) — le
   même groupe pour tout le monde un jour donné (`groupeDuJour`, fonction pure de la date, pas
   d'état par utilisateur à stocker)
4. **Compléter 3 séances cette semaine** (20 pts, hebdomadaire, semaine ISO lundi→dimanche)

Une quête réussie est enregistrée dans `quetes_utilisateur` (constatée au moment où `/api/quetes`
est appelée, jamais retirée ensuite même si la séance est supprimée après coup) et déclenche un
recalcul du rang. Les points des 6 dernières semaines (même fenêtre que le score de performance)
sont convertis en bonus de score via `POINTS_VERS_SCORE = 0.0005` (`rang/calcul.js`) : à fond de
quêtes tous les jours sur 6 semaines (~750 pts), le bonus plafonne autour de +0,375 (~4 paliers) —
significatif mais jamais suffisant seul pour atteindre GOAT, et **jamais suffisant seul pour
sortir de "Non classé"** sans au moins un exercice de référence loggé (« s'ajoute au score de
performance, ne le remplace pas », cahier §3).

`/rang` (nouvelle page, pas un 6e onglet — atteinte depuis la carte "Ton rang" du dashboard ou
`/profil`) : rang + barre de progression vers le palier suivant, quêtes du jour/de la semaine
avec coche et texte barré une fois faites, et un « Récap » listant le meilleur score par exercice
ayant compté dans le calcul (`parExercice`, ajouté à `calculerScore`).

### Rôle admin

`utilisateurs.role` (`utilisateur`/`admin`, cahier §3). Pas de flux d'inscription admin — premier
compte promu à la main :
```sql
UPDATE utilisateurs SET role = 'admin' WHERE id = <ton id>;
```
`/admin` (lien visible sur `/profil` uniquement pour un compte admin, route protégée par
`RouteAdmin.jsx` + middleware `exigerAdmin` côté API) : tableau de tous les utilisateurs avec
correction manuelle du rang (écrit directement `rangs_utilisateur`, **sans** passer par
`recalculerRang` — volontaire, mais donc éphémère : la prochaine séance loggée par cet
utilisateur, ou le job de nuit, écrase la correction avec le vrai score calculé), et lecture des
feedbacks avec changement de statut.

Le cahier a ensuite élargi ce périmètre à « l'ensemble des réglages/paramètres qu'un admin doit
pouvoir contrôler, à détailler avec Claude Code au fur et à mesure des besoins réels » — citant en
exemple modération, gestion des quêtes, statistiques d'usage. Premier ajout concret :
**statistiques d'usage** (`GET /api/admin/statistiques`, réservé admin comme le reste) — nombre
total d'utilisateurs (comptes vs invités), utilisateurs actifs et séances loggées sur les 7
derniers jours, feedback non traité, et répartition des rangs atteints (avec le plus courant). Le
reste (modération, gestion des quêtes) attend une demande concrète plutôt que d'être anticipé.

### Thème de couleur réglable (retour du 14/09)

Demande : « une option qui permet de changer la couleur de fond et de la nav bar... ça peut être
bleu, rouge ou violet ». Interprétée comme un changement de la **teinte d'accent** (celle qui
apparaît en vert sur les boutons/la nav/le fond animé), pas du vrai fond quasi-noir
(`--fond`/`--surface`) — voir la décision détaillée dans `docs/cahier-des-charges.md` §7.

- `frontend/src/lib/theme.js` : liste canonique des 4 thèmes (`vert` par défaut, `bleu`, `rouge`,
  `violet`), chacun avec son libellé, sa pastille (pour le sélecteur) et ses couleurs de fond animé
  (GhostFibers reçoit ses couleurs en props/uniforms WebGL, pas en CSS — voir plus bas). Contrastes
  vérifiés (texte blanc sur accent ≥ 4.5:1, accent-clair sur `--surface` ≥ 7:1, au moins aussi bon
  que le vert d'origine).
- CSS : `styles.css` définit `:root[data-theme-couleur='bleu']` etc., qui ne redéfinissent que
  `--accent`/`--accent-survol`/`--accent-clair` — tout le reste de la palette (`--fond`, `--surface`,
  `--donnees`, les couleurs macros...) reste identique quel que soit le thème. Comme la quasi
  totalité du site consomme déjà `var(--accent)` plutôt qu'une couleur en dur (convention du
  projet), boutons/liens/badges/CTA suivent automatiquement sans code spécifique par thème.
- **Navigation** : `Navigation.jsx` passait `pillColor`/`baseColor`/`pillTextColor` en hex figés à
  PillNav ; passés en `var(--accent)`/`var(--surface)`/`var(--texte)` à la place. PillNav ne fait
  que recopier ces props dans des custom properties CSS (`--base`/`--pill-bg`/...), sans jamais en
  faire d'arithmétique de couleur (pas de tween GSAP sur la couleur, seulement position/scale/
  opacité) — le composant accepte donc une référence `var(...)` sans modification.
- **Fond animé (GhostFibers)** : lui reçoit ses couleurs en props consommées par le shader WebGL
  (`hexToRgb(lineColor)`), pas en CSS — une simple `var(--accent)` ne fonctionnerait pas ici. Une
  nouvelle fonction `FondAnime` dans `App.jsx` lit le thème actif (`useThemeCouleur`) et choisit la
  bonne paire `lineColor`/`glowColor` dans `THEMES_COULEUR`, ré-appliquée à chaud (le composant a
  déjà un effet qui réagit aux changements de ces props, pas de remount nécessaire).
- **État partagé** : `frontend/src/theme/ThemeCouleurContext.jsx` (`ThemeCouleurProvider`,
  `useThemeCouleur`), monté dans `App.jsx` au même niveau que `AuthProvider`. Pose
  `data-theme-couleur` sur `<html>` à chaque changement (c'est ce que ciblent les blocs CSS
  ci-dessus) et persiste le choix en **`localStorage`** (`repwise-theme-couleur`) — décision : pas
  de colonne en base ni de route API, ce réglage est purement cosmétique/client, doit marcher sans
  compte (invités inclus) et ne justifie pas un aller-retour serveur. Limite acceptée : pas de
  synchronisation entre appareils pour un même compte.
- **Anti-flash** : un petit script inline dans `index.html` (avant le premier rendu React) relit
  `localStorage` et pose l'attribut sur `<html>` en synchrone, pour éviter un flash vert → couleur
  choisie au chargement de la page.
- Sélecteur : nouvelle section « Couleur du site » sur `/profil` (4 pastilles rondes, bouton actif
  mis en évidence par `aria-pressed` + bordure `var(--accent)`), voir `ThemeCouleurSelecteur` dans
  `Profil.jsx`.

### Badges : mise à jour visuelle (retour du 13/09)

L'utilisateur a envoyé 6 images de référence (rendus 3D façon cristal à facettes avec glow, une
couleur par rang) — reçues comme pièces jointes du chat, pas comme fichiers exploitables
(impossible d'en extraire les octets pour les utiliser tels quels comme assets). `BadgeRang.jsx`
reste donc un SVG procédural — plus facile à recolorer par rang sans dupliquer un fichier par
couleur — mais enrichi pour se rapprocher de la direction donnée : une « aura » à 6 pointes qui
rayonne depuis chaque sommet de l'hexagone (triangles semi-transparents sous la gemme), un halo à
deux couches (`drop-shadow` large + serré, contre un seul flou plat avant) et deux éclats
supplémentaires en plus du reflet central.

Badges (`BadgeRang.jsx`) : gemme hexagonale à facettes avec halo croissant, 8 couleurs du gris au
doré, palier en 1 à 3 barres.

`/classement` : ma carte de rang **tout en haut** (« Ton rang » — affiche « Non classé » tant
qu'aucun score n'est calculé), puis un bouton **« Tous les classements »** qui déplie, avec une
animation (`grid-template-rows: 0fr → 1fr`, pas de mesure de hauteur en JS), la liste des 8 rangs
Rookie → GOAT avec un badge représentatif par rang (palier I) — juste un aperçu de la progression
possible, pas un vrai classement. Vient ensuite le podium (3 premiers, ordre visuel 2e/1er/3e via
`order` CSS — l'ordre du DOM reste 1/2/3 pour la lecture au clavier et au lecteur d'écran) puis la
liste, avec soit le score qu'il me manque pour entrer dans le rang GOAT, soit ma position (y
compris au-delà du top 100, via `maPosition`) ; invité déjà GOAT invité à créer un compte pour
apparaître.
`/classement/:id` : profil public d'un joueur (clic sur une ligne ou une marche) — pseudo, bio,
photo, rang, score, streak actuelle et record, séances des 30 derniers jours. Rien d'autre (pas
l'email, pas le poids) : la route les vérifie côté serveur, elle ne fait pas que les cacher côté
client.

## Design : palette et navigation (refonte v4)

- **Palette confirmée (v4)** : retour à un fond **sombre/quasi-noir** (`--fond: #0b0d09`,
  `--surface: #14170f`) — annule le blanc/gris clair de la v3 — avec le même **accent vert du
  logo** (`--accent: #4a9420`, inchangé depuis la v3 : validé par le script du skill dataviz pour
  les *deux* fonds, clair et sombre, sans avoir à changer sa valeur). Historique complet dans
  `docs/cahier-des-charges.md` §7. Les 8 couleurs du système de rang (gris → or) restent
  inchangées, volontairement à part (gamification, cf. cahier §7). `--donnees` (courbes,
  `#5aab27`) et le trio de macros (`--macro-proteines: #b83a2e`, `--macro-glucides: #a68a1a`,
  `--macro-lipides: #1f9a7a`) ont été **revalidés pour ce fond sombre** avec le script du skill
  dataviz — ce ne sont *pas* les mêmes valeurs que la v3 : une palette validée pour un fond clair
  n'est pas garantie de repasser les checks (bande de luminosité OKLCH, séparation CVD, contraste)
  sur un fond sombre, et inversement, donc chaque bascule de thème refait tourner le script plutôt
  que de réutiliser les anciennes valeurs. `--accent-clair` s'éclaircit maintenant au lieu de
  s'assombrir (`#8fe25a`, plus clair que `--accent`) : sur fond sombre un liseré plus clair se
  détache mieux, l'inverse du raisonnement tenu pour la v3.
- **Navigation** (`Navigation.jsx`) : composant **PillNav** (React Bits, inchangé depuis la v3)
  conservé tel quel, seules ses couleurs changent — `baseColor="#14170f"` (sombre, cercle
  logo/burger et remplissage qui monte au survol), `pillColor="#4a9420"` (pilules vertes au
  repos), et `pillTextColor`/`hoveredPillTextColor` tous deux fixés à `#f2f4ee` (texte clair dans
  les deux états, plutôt que de miser sur l'inversion de couleur par défaut du composant — plus
  sûr côté contraste, quel que soit l'état). Comportement, structure et le reste des décisions
  (2 onglets pour le visiteur non connecté, `position: fixed` centré, `.contenu-sous-nav`)
  inchangés depuis la v3, voir le détail dans l'historique git si besoin.
- **Logo** (`public/logo.svg`) : l'utilisateur a fourni une image (haltère/barres ascendantes,
  vert sur fond sombre) — recréée en SVG à la main (pas de fichier vectoriel source fourni,
  seulement une image), 7 barres arrondies de hauteurs croissantes puis décroissantes + une
  flèche, en `--accent-clair`. Remplace le tout premier placeholder (une simple diagonale) dessiné
  avant d'avoir une vraie référence.

## Landing / hero public (`/`, cahier §7 "façon Sparkdesign")

Nouvelle structure du haut de la page Calculateur (`HeroPublic()` dans `Calculateur.jsx`,
`.hero*` dans styles.css), sans capture d'écran de référence à disposition (juste une description
textuelle) — reconstruite à partir des éléments listés dans le cahier :

- Badge en pilule au-dessus du titre : « 100% gratuit au lancement ↗ » — reprend un fait déjà vrai
  du cahier (§8, phase 1) plutôt que d'inventer une accroche.
- Le `<h1>`/`<p>` historiques du calculateur sont **repris tels quels** (texte optimisé SEO, cf.
  cahier §5 « le calculateur reste à cette adresse pour le référencement ») : seule leur mise en
  page change (largeur contrainte en `ch` pour forcer 2 lignes sur le titre), pas leur contenu.
- CTA « Commencer » → `/bienvenue` (onboarding direct, pas de champ email — cf. cahier, le site
  sera déjà fonctionnel au lancement).
- Rangée de 4 avatars empilés (silhouettes génériques, pas de photos) + « Pour la manière dont tu
  t'entraînes. Seul ou en groupe. » — **décision** : pas de vrais utilisateurs, pas de nombre
  inventé, pas de témoignage fabriqué (Repwise n'a pas encore lancé) ; ce sont des icônes
  anonymes, un simple motif décoratif « communauté », jamais présenté comme un vrai signal social.
- Carte flottante à droite (`.hero-carte`) : mini-mockup stylisé du dashboard (flamme + barres),
  pas une vraie capture d'écran automatisée — 2 étiquettes en pilule dans les coins (« Suivi
  quotidien » vert, « 100% gratuit » neutre), une bulle flottante (« Séance loggée ✓ »). Avait à
  l'origine 2 icônes rondes en bas à droite (lecture/thème, décoratives — pas de vraie vidéo de
  démo ni de bascule de thème implémentées) : **retirées (retour du 15/09)**, elles ne menaient à
  rien de réel et alourdissaient la carte sans raison.
- TextLoop (texture de fond très discrète, `opacity: 0.35`, sans ruban) est rendu derrière cette
  structure — voir « Composants visuels » plus bas. GhostFibers, lui, n'est plus propre au hero
  (voir point suivant).
- Empile en une colonne sous 900px (carte d'aperçu après le texte), deux colonnes au-dessus.

## Retours après premier rendu (v4) et largeur du site en desktop

Trois retours après avoir vu le premier rendu du hero v4 :

1. **Fond animé généralisé** : GhostFibers plaisait sur le hero — déplacé de `Calculateur.jsx`
   vers `App.jsx` (`.fond-global`, `position: fixed; inset: 0; z-index: -1`), une seule instance
   WebGL pour tout le site plutôt qu'une par page. Opacité et fps réduits (`0.5`, `fps={24}`
   contre `0.7`/`30` sur le hero seul) : sur les pages denses en texte (journal, formulaires),
   l'effet doit rester discret et ne jamais gêner la lecture — vérifié à l'écran sur `/journal`.
2. **Bug de largeur corrigé** : `.conteneur` (le conteneur de contenu de toutes les pages) était
   plafonné à 640px sans exception, y compris sur un écran large — le hero avait beau avoir un
   vrai CSS grid 2 colonnes, il ne pouvait jamais s'étendre au-delà de 640px pour en profiter,
   d'où l'impression de rester sur une seule colonne centrée avec du vide sur les côtés. Corrigé
   avec deux paliers (`900px → 900px`, `1200px → 1120px`). Les pages qui doivent rester un
   formulaire ou une liste étroite plutôt qu'exploiter la largeur (`.formulaire`, `.onboarding`,
   `.profil`, `.classement`, `.page-seance`) sont explicitement replafonnées à 640px et centrées à
   ce même palier — sinon leurs champs/cartes s'étirent avec du vide au milieu, pire qu'avant.
   `.progression` (graphiques) et `.calendrier` restent volontairement libres : plus de largeur
   leur profite réellement (vérifié à l'écran). `/exercices` avait déjà son propre traitement
   desktop (panneau latéral fixed) qui ignore `.conteneur`, inchangé.
3. **Tableau de bord en 2 colonnes** : `.accueil-grille` (nouveau wrapper autour des cards du
   dashboard) passe de `flex-direction: column` à une vraie `grid` 2 colonnes à partir de 900px,
   avec 20px de gap — les cards ne se touchent plus et le dashboard profite enfin de la largeur.
   `/profil` a d'abord juste été replafonné à 640px (point 2) faute de retour explicite ; le cahier
   a ensuite demandé la même logique 2 colonnes que le reste du site (§3) — voir « Profil en 2
   colonnes » ci-dessous.

### Profil en 2 colonnes (retour du 13/09)

`.profil` n'est plus replafonné à 640px à partir de 900px : son contenu passe dans un wrapper
`.profil-grille` (même principe que `.accueil-grille`) qui reste `flex-direction: column` sous
900px et devient une `grid` 2 colonnes au-dessus — colonne de gauche « Mes infos » (formulaire +
bio/visibilité), colonne de droite séances récentes + liens rapides. Le bandeau d'en-tête
(`.profil-entete`) et la section « Compte » (déconnexion/mode invité) restent en dehors de ce
wrapper, pleine largeur en haut et en bas de la page.

## Composants visuels React Bits (cahier §7)

Tous copiés tels quels depuis [reactbits.dev](https://reactbits.dev) dans
`frontend/src/components/reactbits/` (licence MIT, gratuits, sauf Speeding Text) — code non
traduit en français et props non renommées, volontairement, pour rester alignés avec la doc
d'origine si on les met à jour plus tard. Dépendances ajoutées : `gsap` (TextLoop, PillNav,
DotGrid) et `ogl` (GhostFibers, rendu WebGL2) ; `InertiaPlugin` (DotGrid) fait partie de `gsap`
depuis que GreenSock est passé 100% gratuit, pas besoin d'installer autre chose.

- **PillNav** : voir « Design : palette et navigation » ci-dessus — c'est la nav du site.
  - **Retour du 15/09 (« la nav bar doit être clean »)** : le menu mobile (burger) du composant
    remplit CHAQUE lien en vert plein par défaut, actif ou pas — sur desktop ça donne une rangée
    compacte de pilules vertes (cohérent avec l'esprit "pill nav"), mais empilées à la verticale
    sur mobile, 5 blocs pleins vert l'un sous l'autre faisaient un mur visuellement lourd. Le
    composant marque déjà la page active avec une classe `.is-active` (juste inutilisée par son
    propre CSS) : `styles.css` neutralise les liens non actifs (`:not(.is-active)`, fond
    `--surface-haute` au lieu de l'accent) sans toucher `PillNav.jsx`/`PillNav.css` — seule la
    page courante reste en vert, le reste redevient un menu discret.
- **GhostFibers** : fond commun à **tout le site** depuis les retours du hero v4 (`App.jsx`,
  `.fond-global` — voir « Retours après premier rendu » ci-dessus), plus propre à la page
  Calculateur. N'a plus besoin de `lightMode` (retiré) : son mode par défaut est pensé pour un
  fond sombre, directement adapté à la v4 ; `lineColor`/`glowColor` passés en vert.
  - **Bug corrigé (retour du 13/09) : « le fond ne s'affiche qu'en bas de page »**. Ce n'était pas
    un réglage du composant (vignette/luminosité/échelle — tous testés en vain) mais un bug CSS :
    `body { background: var(--fond); }` posait un fond opaque sur une boîte non positionnée, qui se
    peint donc *après* (visuellement par-dessus) les descendants `position: fixed` à z-index négatif
    dans le même contexte d'empilement racine — dont `.fond-global`. Le canvas du fond animé n'était
    donc visible que dans l'espace laissé vide sous le contenu réel de `body`, ce qui, sur des pages
    courtes, ressemblait à « seulement en bas de page », et disparaissait complètement sur une page
    qui remplit tout l'écran. Corrigé en retirant ce `background` de `body` (le fond vient déjà de
    `:root`, qui n'a pas ce problème) — voir le commentaire dans `frontend/src/styles.css`. À
    retenir : un fond opaque sur un ancêtre non positionné d'un élément `fixed`/z-index négatif
    l'occulte, quel que soit le z-index de ce dernier.
- **TextLoop** : utilisé sur le hero de `/` (Calculateur) uniquement, voir « Landing » ci-dessus.
- **GradualBlur** : deux instances dans `App.jsx` (`preset="page-header"`/`"page-footer"`,
  `target: "page"`), `strength` réduite à 1.2 (les presets par défaut sont à 3, jugés trop
  appuyés pour rester « discret » comme demandé). `zIndex={-50}` explicite sur les deux : en
  `target="page"` le composant ajoute +100 à la valeur donnée, donc -50 → 50, sous la pilule de
  nav (z-index 99) — sans ça, le flou s'appliquait à la pilule elle-même (bug vu à l'écran et
  corrigé avant de livrer : la nav rendait floue/à peine visible).
- **DotGrid** : fond du dashboard (`/accueil`, dans `.accueil-entete`) uniquement — `baseColor`
  vert très sombre (`#232a1c`) et `activeColor` en vert accent (`#5aab27`), points discrets au
  repos qui s'éclairent près du curseur. Pas ajouté en plus sur le hero public (déjà occupé par
  GhostFibers + TextLoop) : le cahier dit « et/ou », le « ou » a été retenu pour éviter de
  superposer 3 effets sur une seule page.
- Exception documentée à la règle « jamais de couleur en dur » (CLAUDE.md) : toutes les couleurs
  passées à ces composants (`lineColor`, `glowColor`, `color`, `baseColor`, `pillColor`,
  `activeColor`...) sont en hex litéral dans le JSX, pas en `var(--accent)` — ce sont des uniforms
  WebGL, des attributs SVG ou des `--base`/`--pill-bg` internes au composant, pas du CSS du site,
  ils ne peuvent pas lire les custom properties de `styles.css`. Reconfirmées à la main pour la
  v4 (voir ci-dessus), à refaire si la palette change encore.
- **Point ouvert résolu** : « la page d'accueil » du cahier est comprise comme la page publique
  `/` (Calculateur, la porte d'entrée SEO — voir « Pages ») et non le dashboard `/accueil` réservé
  aux comptes connectés, sauf pour DotGrid où le cahier nomme explicitement les deux (« page
  d'accueil publique et/ou dashboard »).
- Coût : ~165 Ko gzip supplémentaires sur le bundle JS (gsap + ogl + tous les composants),
  acceptable pour des effets limités à 2-3 pages plutôt que chargés partout.
- **Speeding Text** (React Bits **Pro**) : **pas installé**. Nécessite une licence personnelle
  (`REACTBITS_LICENSE_KEY`, à mettre dans `.env.local` du frontend + registres `@reactbits-starter`
  / `@reactbits-pro` dans un `components.json`) que je n'ai pas — impossible à deviner ou à
  contourner ; confirmé avec l'utilisateur le 13/09 (« on verra plus tard », pas de licence
  achetée pour l'instant). En attente de cette clé pour l'appliquer aux stats du dashboard et aux
  chiffres clés de la page d'accueil publique (ex. nombre d'utilisateurs, qui n'existe pas encore
  comme donnée affichée nulle part).

## Carte du corps : panneau desktop

À partir de 900px de large, la liste d'exercices n'apparaît plus sous la silhouette mais glisse
depuis la gauche dans un panneau fixe (`.panneau-exercices`, transform + transition, façon menu
burger), pendant que le contenu principal (`.exercices-corps`) se décale vers la droite
(`margin-left`, classe `.avec-panneau`). En dessous de 900px (mobile), comportement inchangé :
la liste reste simplement sous la silhouette.

## Profil enrichi : photo, bio, visibilité

- **Photo** : `POST/DELETE /api/profil/photo` (multipart, `multer`), stockée sur disque local
  (`backend/uploads/avatars/`, servie via `express.static('/uploads', …)`) — cohérent avec le
  reste de la stack (pas de compte object-storage). **En production, ce dossier doit survivre aux
  redéploiements (volume monté)**, sinon les photos sont perdues à chaque déploiement. Formats
  jpeg/png/webp, 2 Mo max. `UPLOADS_DIR` (variable d'env) permet de rediriger le stockage — utilisé
  par les tests pour ne rien laisser sur disque.
- **Bio** : 280 caractères, éditable sur `/profil`.
- **Visibilité** (`profil_public`, un booléen) : contrôle si les **séances récentes** d'un
  utilisateur apparaissent sur son profil public. Limite assumée : le seul profil public qui
  existe aujourd'hui dans l'app est celui du classement (réservé aux GOAT) — ce réglage n'a donc
  d'effet visible que pour les GOAT ; l'étendre à un profil public pour tout compte serait un bon
  prochain pas. Le poids de corps et les courbes de charge, eux, ne sont **jamais** publics, quel
  que soit ce réglage — la page Profil elle-même affiche toujours ses propres séances récentes
  (30 derniers jours), c'est une vue privée sans rapport avec ce qu'un tiers peut voir.
