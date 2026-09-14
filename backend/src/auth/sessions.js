import { createHash, randomBytes } from 'node:crypto';
import { config } from '../config.js';
import { pool } from '../db/pool.js';
import { ErreurHttp } from '../erreurs.js';
import { JOINTURE_RANG, SELECTION_UTILISATEUR, versUtilisateurPublic } from '../utilisateurs/modele.js';

export const NOM_COOKIE = 'session';
const DUREE_JOURS = 30;
// Une session utilisée dans ses 15 derniers jours est prolongée : un utilisateur qui vient
// régulièrement à la salle ne se fait jamais déconnecter.
const SEUIL_RENOUVELLEMENT_JOURS = 15;

// Exportée : réutilisée pour d'autres jetons à usage unique (réinitialisation de mot de passe,
// auth/routes.js) — même principe, une empreinte SHA-256 en base plutôt que le jeton en clair.
export const empreinte = (jeton) => createHash('sha256').update(jeton).digest('hex');

const optionsCookie = {
  httpOnly: true,
  secure: config.production,
  // Lax : le cookie n'est pas envoyé sur les requêtes POST venant d'un autre site (anti-CSRF).
  sameSite: 'lax',
  path: '/',
};

function poserCookie(res, jeton) {
  res.cookie(NOM_COOKIE, jeton, { ...optionsCookie, maxAge: DUREE_JOURS * 24 * 60 * 60 * 1000 });
}

export async function ouvrirSession(res, utilisateurId) {
  const jeton = randomBytes(32).toString('base64url');
  await pool.execute(
    'DELETE FROM sessions WHERE utilisateur_id = ? AND date_expiration < NOW()',
    [utilisateurId],
  );
  await pool.execute(
    `INSERT INTO sessions (id, utilisateur_id, date_expiration)
     VALUES (?, ?, NOW() + INTERVAL ${DUREE_JOURS} DAY)`,
    [empreinte(jeton), utilisateurId],
  );
  poserCookie(res, jeton);
}

// Invalide la session courante en base, sans toucher au cookie (utile juste avant d'en ouvrir une autre).
export async function revoquerSession(req) {
  const jeton = req.cookies[NOM_COOKIE];
  if (jeton) await pool.execute('DELETE FROM sessions WHERE id = ?', [empreinte(jeton)]);
}

export async function fermerSession(req, res) {
  await revoquerSession(req);
  res.clearCookie(NOM_COOKIE, optionsCookie);
}

// Middleware global : renseigne req.utilisateur si le cookie correspond à une session valide.
export async function chargerSession(req, res, next) {
  const jeton = req.cookies[NOM_COOKIE];
  if (!jeton) return next();

  const id = empreinte(jeton);
  const [lignes] = await pool.execute(
    `SELECT ${SELECTION_UTILISATEUR},
            s.date_expiration < NOW() + INTERVAL ${SEUIL_RENOUVELLEMENT_JOURS} DAY AS a_renouveler
     FROM sessions s
     JOIN utilisateurs u ON u.id = s.utilisateur_id
     ${JOINTURE_RANG}
     WHERE s.id = ? AND s.date_expiration > NOW()`,
    [id],
  );

  if (lignes.length === 0) {
    res.clearCookie(NOM_COOKIE, optionsCookie);
    return next();
  }

  const { a_renouveler: aRenouveler, ...ligne } = lignes[0];
  if (aRenouveler) {
    await pool.execute(
      `UPDATE sessions SET date_expiration = NOW() + INTERVAL ${DUREE_JOURS} DAY WHERE id = ?`,
      [id],
    );
    poserCookie(res, jeton);
  }
  req.utilisateur = versUtilisateurPublic(ligne);
  next();
}

export function exigerConnexion(req, res, next) {
  if (!req.utilisateur) throw new ErreurHttp(401, 'Connecte-toi pour continuer');
  next();
}

// À placer après exigerConnexion dans la chaîne de middlewares.
export function exigerAdmin(req, res, next) {
  if (req.utilisateur?.role !== 'admin') throw new ErreurHttp(403, 'Réservé aux administrateurs');
  next();
}
