# Déployer Repwise

## État actuel (mis à jour le 14/09)

| Étape | Statut | Détail |
|---|---|---|
| Code sur GitHub | ✅ Fait | [github.com/elies-benyahia/repwise](https://github.com/elies-benyahia/repwise) |
| API backend | ✅ Fait | Render (plan gratuit) — https://repwise-backend.onrender.com |
| Base de données | ✅ Fait | MySQL Aiven (plan gratuit), schéma initialisé (68 exercices, 168 aliments) |
| Frontend | ✅ Fait | Vercel — **https://getrepwise.vercel.app** |
| Email (mot de passe oublié) | ⬜ À faire | Compte Resend à créer (§1 ci-dessous) |
| Domaine | ⬜ À faire | repwise.fr ou getrepwise.app à acheter (§2) |
| Pages légales | ⬜ À faire | Placeholders à compléter (§3) |

**Le site fonctionne déjà de bout en bout** (inscription/connexion/session testées en prod à
travers Vercel → Render → Aiven). Ce qui reste est un confort/une obligation légale, pas un
blocage technique.

Points à connaître sur l'hébergement gratuit actuel :
- **Render (plan gratuit)** met l'API en veille après une période d'inactivité — la première
  requête après une veille prend ~30-50s (le temps qu'elle redémarre), les suivantes sont
  normales. Passer sur un plan payant Render supprime cette veille, si ça devient gênant.
- **Aiven (plan gratuit)** : 1 Go de stockage, largement suffisant pour démarrer.
- Un push sur `main` (GitHub) redéploie automatiquement le frontend (Vercel) et l'API (Render) —
  aucune action manuelle nécessaire après un `git push`.
- **`getrepwise.vercel.app`** est un alias propre posé à la main (`vercel alias set`) par-dessus
  l'URL générée automatiquement par Vercel (`frontend-topaz-eta-gr0kpynvtl.vercel.app`, moche mais
  toujours fiable). Contrairement à cette dernière, l'alias propre **ne se met pas à jour tout
  seul** sur un futur déploiement — à refaire (`vercel alias set <nouvelle-url-de-déploiement>
  getrepwise.vercel.app`) après un prochain `vercel --prod`, sinon il continue de pointer sur
  l'ancienne version. La protection SSO de Vercel (activée par défaut sur les alias autres que
  l'URL de prod canonique) a aussi été désactivée pour le projet (`vercel project protection
  disable repwise --sso`), sinon les visiteurs tombaient sur un mur de connexion Vercel.

## 1. Email transactionnel (réinitialisation de mot de passe)

Sans ça, la fonctionnalité "mot de passe oublié" reste inactive en production (le lien est généré
mais jamais envoyé — testé, le reste marche). Recommandation : **Resend** (resend.com), déjà câblé
dans le code (`backend/src/email/envoyer.js`).

1. Crée un compte sur resend.com (offre gratuite largement suffisante pour démarrer).
2. Ajoute et vérifie ton domaine d'envoi (DNS : quelques enregistrements TXT/CNAME chez ton
   registrar — Resend donne les valeurs exactes). Sans domaine propre, Resend fournit aussi un
   domaine de test limité pour essayer.
3. Récupère une clé API (« API Keys » → « Create »).
4. Donne-moi la clé, je la configure sur Render (comme pour Render/Aiven, je peux le faire
   directement via leur API).

## 2. Domaine

1. Achète `repwise.fr` ou `getrepwise.app` (cahier §1) chez un registrar (OVH, Gandi, Namecheap...).
2. Dans le dashboard Vercel du projet `frontend` → « Settings » → « Domains » → ajoute ton domaine,
   suis les instructions DNS affichées.
3. Une fois actif, dis-le-moi : je mets à jour `URL_FRONTEND` sur Render et le `Sitemap:` dans
   `frontend/public/robots.txt`.

## 3. Mentions légales et confidentialité

Deux pages existent déjà (`/mentions-legales`, `/confidentialite`, déployées) mais contiennent des
placeholders entre crochets à remplir avec tes vraies informations (identité/statut, adresse) —
voir `frontend/src/pages/MentionsLegales.jsx` et `Confidentialite.jsx`. Obligatoire avant un vrai
lancement public (le site collecte des données personnelles). Donne-moi tes informations et je les
intègre, ou modifie les fichiers toi-même et pousse.

## Comptes créés (pour référence)

- **GitHub** : elies-benyahia/repwise
- **Render** : projet lié au compte GitHub, service `repwise-backend` (région Frankfurt)
- **Aiven** : projet `elzer199-c783`, service MySQL `mysql-3580bc1d` (région Amsterdam)
- **Vercel** : projet `frontend` sous `eliesbenyahia-8386s-projects`, connecté au dépôt GitHub

## En cas de souci

- Logs backend : dashboard Render → service `repwise-backend` → onglet Logs.
- Logs frontend/build : dashboard Vercel → projet `frontend` → onglet Deployments.
- Revalider la base de données après une modification de schéma : redemande-moi de relancer
  `npm run db:init` contre la base de production (je le fais directement, pas besoin de CLI).
