import { Router } from 'express';
import { exigerAdmin, exigerConnexion } from '../auth/sessions.js';
import { pool } from '../db/pool.js';
import { ErreurHttp } from '../erreurs.js';
import { PALIERS, RANGS } from '../rang/calcul.js';

const STATUTS_FEEDBACK = ['nouveau', 'en_cours', 'traite'];
const LIMITE_UTILISATEURS = 200;

export const routesAdmin = Router();
routesAdmin.use(exigerConnexion, exigerAdmin);

// GET /api/admin/statistiques — quelques chiffres d'usage (cahier §3 : périmètre admin élargi,
// "statistiques d'usage" citée en exemple). Volontairement simple pour l'instant, à enrichir
// au fur et à mesure des besoins réels plutôt que d'anticiper.
routesAdmin.get('/statistiques', async (req, res) => {
  const [[comptes]] = await pool.execute(
    `SELECT COUNT(*) AS total, SUM(est_invite) AS invites FROM utilisateurs`,
  );
  const [[activite]] = await pool.execute(
    `SELECT COUNT(*) AS seances7j, COUNT(DISTINCT utilisateur_id) AS actifs7j
     FROM seances WHERE date >= CURDATE() - INTERVAL 6 DAY`,
  );
  const [[retours]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM feedback WHERE statut = 'nouveau'`,
  );
  const [repartitionRangs] = await pool.execute(
    `SELECT rang, COUNT(*) AS total FROM rangs_utilisateur GROUP BY rang ORDER BY rang`,
  );

  res.json({
    utilisateurs: {
      total: Number(comptes.total),
      invites: Number(comptes.invites),
      comptes: Number(comptes.total) - Number(comptes.invites),
    },
    activite7j: { seances: Number(activite.seances7j), utilisateursActifs: Number(activite.actifs7j) },
    feedbackNouveau: Number(retours.total),
    repartitionRangs: repartitionRangs.map((l) => ({ rang: l.rang, nom: RANGS[l.rang - 1], total: Number(l.total) })),
  });
});

// GET /api/admin/utilisateurs?q=pseudo — tous les comptes (pas de recherche : la table reste
// petite avant le lancement), avec leur rang et leur rôle. Sert à choisir qui corriger.
routesAdmin.get('/utilisateurs', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const [lignes] = await pool.execute(
    `SELECT u.id, u.pseudo, u.email, u.est_invite, u.role, r.rang, r.palier, r.score_performance
     FROM utilisateurs u
     LEFT JOIN rangs_utilisateur r ON r.utilisateur_id = u.id
     ${q ? 'WHERE u.pseudo LIKE ? OR u.email LIKE ?' : ''}
     ORDER BY u.date_creation DESC
     LIMIT ${LIMITE_UTILISATEURS}`,
    q ? [`%${q}%`, `%${q}%`] : [],
  );
  res.json({
    utilisateurs: lignes.map((l) => ({
      id: l.id,
      pseudo: l.pseudo,
      email: l.email,
      estInvite: Boolean(l.est_invite),
      role: l.role,
      rang: l.rang ? { rang: l.rang, nom: RANGS[l.rang - 1], palier: l.palier, score: Number(l.score_performance) } : null,
    })),
  });
});

// PATCH /api/admin/utilisateurs/:id/rang { rang, palier, score } — correction manuelle (anomalie
// de calcul, démo). Écrit directement rangs_utilisateur SANS passer par recalculerRang : c'est
// voulu, mais donc éphémère — le prochain recalcul naturel (nouvelle séance de cet utilisateur,
// job de nuit) écrasera cette valeur avec le vrai score calculé.
routesAdmin.patch('/utilisateurs/:id/rang', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw new ErreurHttp(404, 'Utilisateur introuvable');

  const { rang, palier, score } = req.body ?? {};
  const champs = {};
  if (!Number.isInteger(rang) || rang < 1 || rang > RANGS.length) champs.rang = `Entre 1 et ${RANGS.length}`;
  if (!PALIERS.includes(palier)) champs.palier = `Un de : ${PALIERS.join(', ')}`;
  if (typeof score !== 'number' || score < 0 || score > 100) champs.score = 'Entre 0 et 100';
  if (Object.keys(champs).length > 0) throw new ErreurHttp(400, 'Vérifie les champs', champs);

  const [[utilisateur]] = await pool.execute('SELECT id FROM utilisateurs WHERE id = ?', [id]);
  if (!utilisateur) throw new ErreurHttp(404, 'Utilisateur introuvable');

  await pool.execute(
    `INSERT INTO rangs_utilisateur (utilisateur_id, rang, palier, score_performance) VALUES (?, ?, ?, ?)
     AS nouveau
     ON DUPLICATE KEY UPDATE rang = nouveau.rang, palier = nouveau.palier, score_performance = nouveau.score_performance`,
    [id, rang, palier, score],
  );
  res.json({ rang: { rang, nom: RANGS[rang - 1], palier, score } });
});

// GET /api/admin/feedback?statut=nouveau — tous les retours (cahier §3 : "sert aussi à terme
// d'écran pour lire les feedbacks reçus").
routesAdmin.get('/feedback', async (req, res) => {
  const { statut } = req.query;
  if (statut !== undefined && !STATUTS_FEEDBACK.includes(statut)) throw new ErreurHttp(400, 'Statut inconnu');

  const [lignes] = await pool.execute(
    `SELECT f.id, f.type, f.description, f.email_contact, f.date_envoi, f.statut, u.pseudo
     FROM feedback f
     LEFT JOIN utilisateurs u ON u.id = f.utilisateur_id
     ${statut ? 'WHERE f.statut = ?' : ''}
     ORDER BY f.date_envoi DESC`,
    statut ? [statut] : [],
  );
  res.json({
    feedback: lignes.map((l) => ({
      id: l.id,
      type: l.type,
      description: l.description,
      emailContact: l.email_contact,
      dateEnvoi: l.date_envoi,
      statut: l.statut,
      pseudo: l.pseudo,
    })),
  });
});

routesAdmin.patch('/feedback/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { statut } = req.body ?? {};
  if (!Number.isInteger(id) || id < 1) throw new ErreurHttp(404, 'Feedback introuvable');
  if (!STATUTS_FEEDBACK.includes(statut)) throw new ErreurHttp(400, 'Statut inconnu');

  const [resultat] = await pool.execute('UPDATE feedback SET statut = ? WHERE id = ?', [statut, id]);
  if (resultat.affectedRows === 0) throw new ErreurHttp(404, 'Feedback introuvable');
  res.json({ ok: true });
});
