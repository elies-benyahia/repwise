import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { pool } from '../db/pool.js';
import { ErreurHttp } from '../erreurs.js';
import { trouverUtilisateur } from '../utilisateurs/modele.js';
import { hacherMotDePasse, verifierMotDePasse } from './motDePasse.js';
import { fermerSession, ouvrirSession, revoquerSession } from './sessions.js';

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

// Renvoie 200 avec `utilisateur: null` plutôt qu'un 401 : ne pas être connecté n'est pas une
// erreur, et le front appelle cette route à chaque chargement de page.
routesAuth.get('/session', (req, res) => {
  res.json({ utilisateur: req.utilisateur ?? null });
});
