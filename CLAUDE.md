# Repwise

Le cahier des charges (fonctionnalités, modèle de données, roadmap) est dans
docs/cahier-des-charges.md. Suivre l'ordre de la roadmap §9 ; l'avancement est coché dans README.md.
Écarts volontaires au modèle de données : expliqués en commentaire dans database/schema.sql
(ex. pas de table streaks, streak calculée depuis seances).

- Code, noms de variables et UI en français ; l'UI tutoie l'utilisateur.
- Les clés des constantes front (NIVEAUX_ACTIVITE, OBJECTIFS dans frontend/src/lib/calculs.js,
  NIVEAUX_EXPERIENCE dans frontend/src/lib/profil.js, TYPES_SEANCE dans frontend/src/lib/seances.js,
  OBJECTIFS_DECLARES dans frontend/src/lib/onboarding.js) et back (backend/src/seances/validation.js,
  backend/src/utilisateurs/modele.js, backend/src/utilisateurs/niveaux.js) doivent rester
  identiques aux ENUM de database/schema.sql.
- `utilisateurs.prenom`/`annee_naissance` ont été renommés `pseudo`/`date_naissance` (refonte
  onboarding) : `pseudo` s'affiche partout, y compris publiquement (classement) — jamais un vrai
  prénom. `age` reste calculé côté API (`ageDepuisDateNaissance`), jamais stocké tel quel.
- Niveau d'activité et niveau d'expérience se déduisent de `frequenceSeances`
  (backend/src/utilisateurs/niveaux.js, dupliqué en frontend/src/lib/onboarding.js pour l'aperçu
  immédiat de l'onboarding) plutôt que d'être demandés explicitement — sauf sur `/profil`
  (réglage avancé) où ils restent éditables directement.
- Dates : toujours des chaînes "AAAA-MM-JJ" (colonnes DATE renvoyées en chaîne par mysql2,
  helpers dans frontend/src/lib/dates.js). Jamais de toISOString() pour une date du jour côté front.
- Nouvelle page réservée aux utilisateurs : l'envelopper dans <RouteProtegee> et, si c'est un onglet,
  l'ajouter à ONGLETS dans frontend/src/components/Navigation.jsx.
- Onboarding = un seul assistant en 4 étapes (frontend/src/pages/Bienvenue.jsx), pas de page séparée
  pour le profil. Toute modification du profil qui s'y fait doit rester possible sans compte
  (aucun appel réseau avant l'étape 4).
- Palette dans styles.css : jamais de couleur brand en dur, toujours `var(--accent)` / `color-mix(in
  srgb, var(--accent) X%, transparent)` — sinon un futur changement de palette doit tout regrepper.
  `--donnees` (courbes) reste distinct de `--accent` (CTA) : le premier doit rester validé par le
  script du skill dataviz, le second peut être plus clair/flashy. Le fond a déjà basculé clair ↔
  sombre plusieurs fois (v2 sombre, v3 clair, v4 sombre) : à chaque bascule, revalider `--donnees`
  et le trio macros avec `--mode dark`/`--mode light` contre la nouvelle `--surface` — une palette
  qui passe les checks sur un fond ne les passe pas forcément sur l'autre.
  Exception : `frontend/src/components/reactbits/GhostFibers.jsx` (fond animé) prend ses couleurs
  en hex litéral via des props consommées par le shader WebGL (`hexToRgb`), pas en CSS — une
  `var(--accent)` ne fonctionnerait pas ici. `App.jsx` (`FondAnime`) lui repasse explicitement la
  paire couleur du thème actif (`THEMES_COULEUR[theme].ghostFibers`) à chaque changement plutôt que
  de compter sur la cascade CSS. PillNav, lui, N'A PAS besoin de cette exception : ses props
  couleur ne font que remplir des custom properties CSS (`--base`/`--pill-bg`/...), donc
  `var(--accent)`/`var(--surface)`/`var(--texte)` (passés depuis Navigation.jsx) fonctionnent
  directement.
- **Thème de couleur** (`frontend/src/lib/theme.js`, réglable sur `/profil`) : ne change QUE
  `--accent`/`--accent-survol`/`--accent-clair` (via `:root[data-theme-couleur='...']` dans
  styles.css) — jamais `--fond`/`--surface`/`--donnees`/les couleurs macros, qui restent fixes et
  valables pour tous les thèmes. Nouvelle couleur à ajouter : un id dans `THEMES_COULEUR`, un bloc
  CSS `:root[data-theme-couleur='...']`, et vérifier le contraste (texte blanc sur `--accent` ≥
  4.5:1) avant de l'ajouter. Stocké en `localStorage` (pas de compte requis), pas en base.
- Navigation : composant PillNav (React Bits, frontend/src/components/reactbits/PillNav.jsx,
  copié tel quel — ne pas le modifier pour un changement de style, passer par ses props ou par
  `.nav-enveloppe`/`.pill-nav-container` dans styles.css). `Navigation.jsx` construit le tableau
  `items` (ONGLETS si profil complet, sinon ONGLETS_VISITEUR) ; ses couleurs sont des `var(--xxx)`,
  pas des hex, pour suivre le thème choisi. Position lue depuis `data-position` sur
  `.nav-enveloppe` (frontend/src/navigation.js) — pense à
  `.nav-enveloppe[data-position='...'] .pill-nav-container` si tu ajoutes une position autre que
  "en haut" (le CSS pour bas/gauche/droite reste à écrire, page Paramètres à venir).
- Toute écriture qui peut changer le rang (séances, poids, sexe) doit appeler `recalculerRang`
  (backend/src/rang/depot.js). Constantes du rang : backend/src/rang/calcul.js.
- Quêtes (backend/src/quetes/) : 3 quotidiennes + 1 hebdomadaire, matérialisées à la volée dans
  `quetes` au premier accès à `/api/quetes` pour la période — pas de cron, pas de job planifié.
  Leurs points bonifient le score de rang (`POINTS_VERS_SCORE` dans rang/calcul.js) mais ne
  créent jamais un rang à partir de rien (`calculerScore` doit déjà renvoyer un score non nul).
  Nouveau type de quête : ajouter sa définition dans `quetes/calcul.js` (`definirQuotidiennes`/
  `definirHebdomadaire`) ET son vérificateur dans `quetes/depot.js` (`VERIFICATEURS`, clé = `cle`).
- Rôle admin (`utilisateurs.role`, `exigerAdmin` dans backend/src/auth/sessions.js, à chaîner
  après `exigerConnexion`) : pas de flux d'inscription admin, premier compte promu à la main
  (`UPDATE utilisateurs SET role = 'admin' WHERE id = ...`). Page `/admin` protégée côté front par
  `RouteAdmin.jsx`, pas listée dans `ONGLETS` de Navigation.jsx (accessible depuis `/profil`
  uniquement pour un compte admin).
- Recherche d'aliment : `backend/src/alimentation/routes.js` fusionne `bibliotheque_aliments`
  (locale, ~150 aliments courants, `database/aliments.sql`, rejouable par nom) et Open Food Facts
  (proxie, pas de clé API requise, mais un `User-Agent` identifiable est exigé par leurs
  conditions d'usage — ne pas le retirer), locale en premier, dédoublonné par nom. `rechercherOFF`
  DOIT rester silencieuse en cas d'échec (repli `[]`, jamais une exception) : c'est une source
  complémentaire, sa panne ne doit jamais empêcher d'afficher les résultats locaux.
  `entrees_alimentaires` stocke des valeurs déjà mises à l'échelle de la quantité choisie (pas un
  pour-100g) : `frontend/src/lib/journal.js` fait la conversion dans les deux sens
  (`alimentEchelle`/`versAlimentDepuisEntree`).
- Graphiques : charger le skill dataviz avant d'en créer ; réutiliser GraphiqueLigne.jsx.
- Bibliothèque : database/bibliotheque.sql (exercices), bibliotheque-rang.sql (repères de force) et
  bibliotheque-images.sql (`image_ou_gif`, 56/68 exercices, images wger.de sous licence Creative
  Commons dans backend/uploads/exercices/), tous rejoués par `npm run db:init`, tous par **nom**
  d'exercice (jamais par id, non stable entre environnements). Toute image ajoutée/changée doit
  rester listée avec son attribution dans frontend/src/lib/credits.js (page `/credits`, exigée par
  la licence) — les deux fichiers sont mis à jour ensemble à la main, pas de lien automatique.
- CSS : jamais de `background` opaque sur `body` — le fond vient de `:root` (voir `--fond`) pour
  ne pas occulter `.fond-global` (canvas `position:fixed`, z-index négatif) : un ancêtre non
  positionné avec un fond opaque se peint après ses descendants fixed/z-index négatif dans le même
  contexte d'empilement, donc par-dessus eux visuellement (bug réel du 13/09, voir README).
- Classement/profil public (backend/src/rang/routes.js, GET /:id) : ne renvoyer que pseudo, bio,
  photo, rang, score, streak — et les séances récentes seulement si `profil_public` (ou soi-même) —
  jamais l'email ni les mesures (poids, courbes) d'un autre utilisateur, quel que soit ce réglage.
- Photo de profil : POST/DELETE /api/profil/photo (multer, backend/uploads/avatars, servi via
  express.static('/uploads')). Chemin surchargé par `UPLOADS_DIR` (utilisé par les tests, sinon
  laisse la valeur par défaut) ; penser à vite.config.js si le chemin `/uploads` change.
  **`backend/uploads/avatars/` est gitignoré (contenu utilisateur) — `backend/uploads/exercices/`
  NE DOIT PAS l'être (asset statique livré avec l'app, voir .gitignore et README §checklist).**
- **Site en ligne depuis le 14/09** (voir DEPLOY.md pour les URLs et le détail des comptes) :
  dépôt GitHub elies-benyahia/repwise, API sur Render, MySQL sur Aiven (SSL requis, voir
  `DB_SSL_CA` dans config.js/pool.js — certificat CA en PEM complet dans la variable, pas un
  chemin de fichier), frontend sur Vercel. Render/Aiven configurés via leurs API REST directement
  (tokens fournis par l'utilisateur en session, jamais stockés dans le dépôt), Vercel via son CLI
  (`vercel login` ouvre un flow OAuth navigateur). Mettre à jour une base de production : relancer
  `npm run db:init` avec les `DB_*`/`DB_SSL_CA` de la vraie base en variables d'environnement (pas
  besoin d'installer le CLI Aiven, l'API suffit pour récupérer host/port, mais le **mot de passe
  est toujours redacté par l'API même avec un token complet** — il faut le récupérer à la main
  dans le dashboard Aiven, aucun endpoint ne le renvoie en clair, pas même après une rotation).
  Restent (comptes/paiements que je ne peux pas faire à la place de l'utilisateur) : compte Resend
  pour activer l'envoi réel des emails, achat du domaine, placeholders des pages légales.
- Email transactionnel (réinitialisation de mot de passe uniquement pour l'instant) :
  `backend/src/email/envoyer.js`, appel `fetch` direct sur l'API REST de Resend (pas de SDK/lib
  npm ajoutée, même logique que le proxy Open Food Facts). Sans `RESEND_API_KEY` : le contenu de
  l'email est juste loggé en console (`console.log`) au lieu d'échouer — permet de tester tout le
  flux (jeton, expiration, hachage) sans dépendance réseau, y compris dans les tests (voir
  `backend/test/mot-de-passe-oublie.test.js`, qui capture ce `console.log` pour en extraire le
  jeton plutôt que de mocker le module).
- Réinitialisation de mot de passe : même patron que les sessions (jeton aléatoire, seule son
  empreinte SHA-256 va en base, `sessions.js#empreinte` exportée et réutilisée). Un mot de passe
  changé doit toujours révoquer les sessions existantes de ce compte (vol de session).
- Unités stockées : kg, cm, secondes, kcal, grammes.
- Mobile-first : vérifier chaque écran à ~390px de large.
- Logique métier dans des modules purs sous frontend/src/lib, testée avec `npm test` (node:test).
- MySQL local = Laragon (C:\laragon\bin\mysql\mysql-8.4.3-winx64), root sans mot de passe.
  Les tests backend utilisent une base par fichier (repwise_test_*), via test/outils.js.
- Auth : session en base + cookie httpOnly (voir README). Routes protégées avec `exigerConnexion`
  (backend/src/auth/sessions.js). Le front appelle toujours `/api/...` en relatif via `appelerApi`.
- Invités = utilisateurs avec est_invite = TRUE : toute nouvelle fonctionnalité doit marcher pour eux
  sans code spécifique (elles passent par req.utilisateur comme les autres).
- Modifier le schéma : éditer database/schema.sql (CREATE TABLE IF NOT EXISTS) puis `npm run db:reset`
  tant qu'il n'y a pas de données de production.
