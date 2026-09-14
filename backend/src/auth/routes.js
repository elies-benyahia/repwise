import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { config } from '../config.js';
import { pool } from '../db/pool.js';
import { envoyerEmail } from '../email/envoyer.js';
import { ErreurHttp } from '../erreurs.js';
import { trouverUtilisateur } from '../utilisateurs/modele.js';
import { hacherMotDePasse, verifierMotDePasse } from './motDePasse.js';
import { empreinte, fermerSession, ouvrirSession, revoquerSession } from './sessions.js';

const DUREE_REINITIALISATION_HEURES = 1;

const MOT_DE_PASSE_MIN = 8;
// Borne haute pour éviter qu'un mot de passe géant ne monopolise le CPU pendant le hachage.
const MOT_DE_PASSE_MAX = 128;
const FORMAT_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function limiteur({ minutes, tentatives, ...options }) {
  return rateLimit({
    windowMs: minutes * 60 * 1000,
    limit: tentatives,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({
      erreur: 'Trop de tentatives. Réessaie dans quelques minutes.',
    }),
    ...options,
  });
}

// Seuls les échecs comptent : on freine le test de mots de passe sans gêner l'usage normal.
const limiteurConnexion = limiteur({ minutes: 15, tentatives: 10, skipSuccessfulRequests: true });
const limiteurInscription = limiteur({ minutes: 60, tentatives: 10 });
const limiteurInvite = limiteur({ minutes: 60, tentatives: 20 });
// Volontairement strict : chaque tentative déclenche potentiellement un envoi d'email (coûte
// de l'argent au-delà du quota gratuit) et pourrait servir à deviner des emails inscrits.
const limiteurMotDePasseOublie = limiteur({ minutes: 60, tentatives: 5 });
const limiteurReinitialisation = limiteur({ minutes: 15, tentatives: 10 });

function lireIdentifiants(corps) {
  return {
    email: typeof corps?.email === 'string' ? corps.email.trim().toLowerCase() : '',
    motDePasse: typeof corps?.motDePasse === 'string' ? corps.motDePasse : '',
  };
}

const erreurEmailPris = () => new ErreurHttp(409, 'Un compte existe déjà avec cet email', {
  email: 'Un compte existe déjà avec cet email',
});

export const routesAuth = Router();

routesAuth.post('/invite', limiteurInvite, async (req, res) => {
  if (req.utilisateur) return res.json({ utilisateur: req.utilisateur });

  const [resultat] = await pool.execute('INSERT INTO utilisateurs (est_invite) VALUES (TRUE)');
  await ouvrirSession(res, resultat.insertId);
  res.status(201).json({ utilisateur: await trouverUtilisateur(resultat.insertId) });
});

// Crée un compte, ou transforme la session invité en cours en compte : même ligne
// utilisateur, donc tout l'historique saisi en invité est conservé.
routesAuth.post('/inscription', limiteurInscription, async (req, res) => {
  if (req.utilisateur && !req.utilisateur.estInvite) {
    throw new ErreurHttp(400, 'Tu es déjà connecté');
  }
  const { email, motDePasse } = lireIdentifiants(req.body);

  const champs = {};
  if (!FORMAT_EMAIL.test(email) || email.length > 255) {
    champs.email = 'Adresse email invalide';
  }
  if (motDePasse.length < MOT_DE_PASSE_MIN) {
    champs.motDePasse = `${MOT_DE_PASSE_MIN} caractères minimum`;
  } else if (motDePasse.length > MOT_DE_PASSE_MAX) {
    champs.motDePasse = `${MOT_DE_PASSE_MAX} caractères maximum`;
  }
  if (Object.keys(champs).length > 0) {
    throw new ErreurHttp(400, 'Vérifie les champs du formulaire', champs);
  }

  const hachage = await hacherMotDePasse(motDePasse);
  let utilisateurId = req.utilisateur?.id;
  try {
    if (utilisateurId) {
      await pool.execute(
        'UPDATE utilisateurs SET email = ?, mot_de_passe_hash = ?, est_invite = FALSE WHERE id = ?',
        [email, hachage, utilisateurId],
      );
    } else {
      const [resultat] = await pool.execute(
        'INSERT INTO utilisateurs (email, mot_de_passe_hash) VALUES (?, ?)',
        [email, hachage],
      );
      utilisateurId = resultat.insertId;
    }
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') throw erreurEmailPris();
    throw err;
  }

  // Nouveau jeton à chaque changement de niveau de droits (invité → compte).
  await revoquerSession(req);
  await ouvrirSession(res, utilisateurId);
  res.status(201).json({ utilisateur: await trouverUtilisateur(utilisateurId) });
});

routesAuth.post('/connexion', limiteurConnexion, async (req, res) => {
  const { email, motDePasse } = lireIdentifiants(req.body);
  if (!email || !motDePasse || motDePasse.length > MOT_DE_PASSE_MAX) {
    throw new ErreurHttp(400, 'Email et mot de passe requis');
  }

  const [lignes] = await pool.execute(
    'SELECT id, mot_de_passe_hash FROM utilisateurs WHERE email = ?',
    [email],
  );
  const utilisateur = lignes[0];
  const valide = await verifierMotDePasse(motDePasse, utilisateur?.mot_de_passe_hash ?? null);
  // Même message que le compte existe ou non, pour ne pas révéler les emails inscrits.
  if (!valide) throw new ErreurHttp(401, 'Email ou mot de passe incorrect');

  // Une éventuelle session invité est fermée ; ses données seront nettoyées automatiquement.
  await revoquerSession(req);
  await ouvrirSession(res, utilisateur.id);
  res.json({ utilisateur: await trouverUtilisateur(utilisateur.id) });
});

routesAuth.post('/deconnexion', async (req, res) => {
  await fermerSession(req, res);
  res.status(204).end();
});

// POST /api/auth/mot-de-passe-oublie { email } — toujours la même réponse que le compte existe
// ou non (même logique que /connexion : ne pas permettre de deviner les emails inscrits). Un
// invité n'a pas de mot de passe, donc n'a rien à réinitialiser (est_invite = FALSE dans la requête).
routesAuth.post('/mot-de-passe-oublie', limiteurMotDePasseOublie, async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!FORMAT_EMAIL.test(email)) throw new ErreurHttp(400, 'Adresse email invalide');

  const [[utilisateur]] = await pool.execute(
    'SELECT id FROM utilisateurs WHERE email = ? AND est_invite = FALSE',
    [email],
  );
  if (utilisateur) {
    const jeton = randomBytes(32).toString('base64url');
    // Un seul lien valide à la fois : une nouvelle demande invalide les précédentes.
    await pool.execute('DELETE FROM reinitialisations_mot_de_passe WHERE utilisateur_id = ?', [utilisateur.id]);
    await pool.execute(
      `INSERT INTO reinitialisations_mot_de_passe (id, utilisateur_id, date_expiration)
       VALUES (?, ?, NOW() + INTERVAL ${DUREE_REINITIALISATION_HEURES} HOUR)`,
      [empreinte(jeton), utilisateur.id],
    );
    const lien = `${config.urlFrontend}/reinitialiser-mot-de-passe?jeton=${jeton}`;
    // L'échec d'envoi ne doit pas faire échouer la requête (même réponse dans tous les cas) ;
    // il est seulement journalisé pour du diagnostic côté serveur.
    await envoyerEmail({
      a: email,
      sujet: 'Réinitialise ton mot de passe Repwise',
      html: `<p>Tu as demandé à réinitialiser ton mot de passe Repwise.</p>
             <p><a href="${lien}">Choisir un nouveau mot de passe</a></p>
             <p>Ce lien expire dans ${DUREE_REINITIALISATION_HEURES} heure. Si tu n'es pas à
             l'origine de cette demande, ignore cet email : rien ne change sans clic.</p>`,
    }).catch((err) => console.error('Email de réinitialisation non envoyé :', err.message));
  }
  res.json({ ok: true });
});

// POST /api/auth/reinitialiser-mot-de-passe { jeton, motDePasse }
routesAuth.post('/reinitialiser-mot-de-passe', limiteurReinitialisation, async (req, res) => {
  const jeton = typeof req.body?.jeton === 'string' ? req.body.jeton : '';
  const motDePasse = typeof req.body?.motDePasse === 'string' ? req.body.motDePasse : '';
  if (!jeton) throw new ErreurHttp(400, 'Lien invalide');
  if (motDePasse.length < MOT_DE_PASSE_MIN || motDePasse.length > MOT_DE_PASSE_MAX) {
    throw new ErreurHttp(400, `Le mot de passe doit faire entre ${MOT_DE_PASSE_MIN} et ${MOT_DE_PASSE_MAX} caractères`);
  }

  const id = empreinte(jeton);
  const [[ligne]] = await pool.execute(
    'SELECT utilisateur_id FROM reinitialisations_mot_de_passe WHERE id = ? AND date_expiration > NOW()',
    [id],
  );
  if (!ligne) throw new ErreurHttp(400, 'Ce lien a expiré ou a déjà été utilisé : redemande une réinitialisation');

  const hachage = await hacherMotDePasse(motDePasse);
  await pool.execute('UPDATE utilisateurs SET mot_de_passe_hash = ? WHERE id = ?', [hachage, ligne.utilisateur_id]);
  await pool.execute('DELETE FROM reinitialisations_mot_de_passe WHERE id = ?', [id]);
  // Un mot de passe changé invalide toutes les sessions ouvertes (vol de session éventuel).
  await pool.execute('DELETE FROM sessions WHERE utilisateur_id = ?', [ligne.utilisateur_id]);
  res.json({ ok: true });
});

// Renvoie 200 avec `utilisateur: null` plutôt qu'un 401 : ne pas être connecté n'est pas une
// erreur, et le front appelle cette route à chaque chargement de page.
routesAuth.get('/session', (req, res) => {
  res.json({ utilisateur: req.utilisateur ?? null });
});
