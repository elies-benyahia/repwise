# Déployer Repwise

Toutes les étapes techniques que le code peut préparer sont faites (voir README « Checklist avant
mise en ligne » pour le détail de l'audit du 14/09). Ce qui reste demande des comptes/paiements
que je ne peux pas créer à ta place — ce guide te donne la marche à suivre exacte, dans l'ordre.

## 1. Mettre le code sur GitHub

Le dépôt git local existe déjà (premier commit fait). Il manque juste un dépôt distant :

1. Va sur [github.com/new](https://github.com/new), crée un dépôt (ex. `repwise`), **vide** (pas
   de README/gitignore/licence générés — on a déjà les nôtres).
2. Dans un terminal, à la racine du projet :
   ```bash
   git remote add origin https://github.com/<ton-compte>/repwise.git
   git push -u origin main
   ```

## 2. Héberger l'API + la base de données (Railway recommandé)

Recommandation : **Railway** (railway.app) — supporte Node directement et propose MySQL managé en
un clic, donc l'API et la base sont au même endroit. Render + une base MySQL externe (ex.
PlanetScale) marche aussi, un peu plus de réglages.

1. Crée un compte sur railway.app (connexion via GitHub la plus simple).
2. « New Project » → « Deploy from GitHub repo » → sélectionne `repwise`.
3. Railway va essayer de builder tout le monorepo : dans les réglages du service créé, mets le
   **Root Directory** sur `backend`.
4. Ajoute un service MySQL au même projet (« New » → « Database » → « MySQL »).
5. Dans les variables d'environnement du service backend, ajoute (voir `backend/.env.example`) :
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` → Railway te donne ces valeurs dans
     l'onglet du service MySQL (ou une seule variable `DATABASE_URL` à éclater, selon leur
     interface au moment où tu déploies).
   - `NODE_ENV=production` — **indispensable** : sans ça, le cookie de session repart en
     `secure: false` (voir README, section sécurité).
   - `TRUST_PROXY=1` (Railway fait passer les requêtes par un proxy).
   - `URL_FRONTEND=https://<ton-domaine-vercel-ou-final>` (étape 3).
   - `RESEND_API_KEY` et `EMAIL_EXPEDITEUR` une fois l'étape 4 faite (sinon la réinitialisation de
     mot de passe reste inactive : lien juste loggé côté serveur, jamais envoyé).
6. Une fois déployé, **lance `npm run db:init` une fois** sur cette base de production (schéma +
   bibliothèques d'exercices/aliments) : le plus simple est d'installer le CLI Railway
   (`npm i -g @railway/cli`, `railway login`, `railway link`) puis `railway run npm run db:init`
   depuis `backend/`.
7. Note l'URL publique donnée par Railway (ex. `https://repwise-backend-production.up.railway.app`) :
   il en faut pour l'étape 3.

## 3. Héberger le frontend (Vercel)

1. Crée un compte sur vercel.com (connexion GitHub).
2. « Add New » → « Project » → importe le dépôt `repwise`.
3. **Root Directory** : `frontend`.
4. Build command / output : détectés automatiquement (Vite) — rien à changer.
5. Avant de déployer, édite `frontend/vercel.json` dans le dépôt : remplace les deux occurrences
   de `https://TON-BACKEND.exemple.com` par la vraie URL Railway de l'étape 2, commit, push.
   Vercel redéploie automatiquement à chaque push sur `main`.
6. Une fois en ligne, retourne dans Railway (étape 2) et mets à jour `URL_FRONTEND` avec l'URL
   Vercel réelle (ou ton domaine final, étape 5), puis redéploie le backend.

## 4. Email transactionnel (réinitialisation de mot de passe)

Sans ça, la fonctionnalité "mot de passe oublié" reste inactive en production (le lien est généré
mais jamais envoyé). Recommandation : **Resend** (resend.com), déjà câblé dans le code
(`backend/src/email/envoyer.js`) — un simple appel HTTP, pas de dépendance à installer.

1. Crée un compte sur resend.com (offre gratuite largement suffisante pour démarrer).
2. Ajoute et vérifie ton domaine (DNS : quelques enregistrements TXT/CNAME à poser chez ton
   registrar — Resend te donne les valeurs exactes).
3. Récupère une clé API (« API Keys » → « Create »).
4. Dans Railway (étape 2), ajoute `RESEND_API_KEY=<ta clé>` et
   `EMAIL_EXPEDITEUR=Repwise <no-reply@tondomaine.fr>`, puis redéploie.

## 5. Domaine

1. Achète `repwise.fr` ou `getrepwise.app` (cahier §1) chez un registrar (OVH, Gandi, Namecheap...).
2. Dans Vercel, « Settings » → « Domains » → ajoute ton domaine, suis les instructions DNS
   affichées (en général un enregistrement A ou CNAME chez ton registrar).
3. Une fois actif, remplace toute URL provisoire par ton vrai domaine : `URL_FRONTEND` (Railway),
   `Sitemap:` dans `frontend/public/robots.txt` si tu ajoutes un sitemap plus tard.

## 6. Mentions légales et confidentialité

Deux pages existent déjà (`/mentions-legales`, `/confidentialite`) mais contiennent des
placeholders entre crochets à remplir avec tes vraies informations (identité/statut, adresse,
hébergeurs choisis) — voir `frontend/src/pages/MentionsLegales.jsx` et `Confidentialite.jsx`.
Obligatoire avant un vrai lancement public (le site collecte des données personnelles).

## 7. Après la mise en ligne

- Vérifie que `/api/sante` répond `{"ok":true}` sur ton domaine backend.
- Teste le parcours complet en prod : inscription, connexion, mot de passe oublié (vérifie que
  l'email arrive vraiment), une séance, un aliment au journal.
- `database/bibliotheque.sql` (68 exercices) : cahier §11 recommande de le relire une fois avant
  le lancement, tu connais mieux le sujet que moi.
